<?php

declare(strict_types=1);

namespace Lemona;

/**
 * Sitede alıcı yorumları.
 *
 * Hesap yok; yorumu yalnızca siparişi alan kişi yazabilsin diye her siparişin
 * bir "yorum kodu" var (6 rakam, ör. 482 913). Kod teşekkür kartına yazılır,
 * kargo e-postasında ve sipariş takibinde de görünür. Müşteri /yorum sayfasında
 * kodu girer, yorumunu ve en fazla 3 fotoğraf ekler.
 *
 * Her siparişe bir yorum. Yorumlar onaylanana kadar sitede görünmez
 * (bekliyor → yayinda; istenmeyen yorum → gizli).
 */
final readonly class ReviewService
{
    public const int MAX_PHOTOS = 3;
    private const int PHOTO_SIDE = 1600;
    private const int THUMB_SIDE = 640;

    public function __construct(private Db $db, private UploadService $uploads, private string $dir) {}

    /* ---------- yorum kodu ---------- */

    /** Yorum kodu 6 rakam (482 913); boşluk/tire yok sayılır */
    public static function normalizeCode(string $code): string
    {
        return Codes::onlyDigits($code);
    }

    /** Siparişin yorum kodu; yoksa üretir. */
    public function codeFor(int $orderId): string
    {
        $row = $this->db->one('SELECT code FROM review_codes WHERE order_id = ?', [$orderId]);
        if ($row !== null) {
            return $row['code'];
        }
        for ($try = 0; ; $try++) {
            $code = Codes::digits(6);
            try {
                $this->db->run('INSERT INTO review_codes (order_id, code) VALUES (?, ?)', [$orderId, $code]);
                return $code;
            } catch (\PDOException $e) {
                if (($e->errorInfo[1] ?? null) !== 1062 || $try >= 4) throw $e;
                // aynı siparişe paralel istekte kod üretildiyse onu kullan
                $row = $this->db->one('SELECT code FROM review_codes WHERE order_id = ?', [$orderId]);
                if ($row !== null) return $row['code'];
            }
        }
    }

    /**
     * Koddan sipariş. Yorum sadece ödenmiş ve kargoya verilmiş siparişe yazılır.
     * @return array<string, mixed>|null
     */
    public function orderForCode(string $code): ?array
    {
        $code = self::normalizeCode($code);
        if (strlen($code) !== 6) {
            return null;
        }
        return $this->db->one(
            "SELECT o.* FROM review_codes c JOIN orders o ON o.id = c.order_id
             WHERE c.code = ? AND o.status IN ('kargoda', 'teslim-edildi')",
            [$code],
        );
    }

    /** @return list<string> siparişteki ürün adları */
    public function productNames(int $orderId): array
    {
        return array_column(
            $this->db->all('SELECT DISTINCT product_name FROM order_items WHERE order_id = ? ORDER BY product_name', [$orderId]),
            'product_name',
        );
    }

    /** @return array<string, mixed>|null */
    public function forOrder(int $orderId): ?array
    {
        return $this->db->one('SELECT * FROM reviews WHERE order_id = ?', [$orderId]);
    }

    /* ---------- yorum yazma ---------- */

    /**
     * @param array<string, mixed> $order
     * @param array<string, mixed> $input name, text, consent
     * @param list<array<string, mixed>> $files tek tek $_FILES girdileri
     */
    public function create(array $order, array $input, array $files, string $ipHash): void
    {
        $name = trim(preg_replace('/\s+/u', ' ', (string) ($input['name'] ?? '')));
        $text = trim(preg_replace("/[ \t]+/u", ' ', str_replace("\r", '', (string) ($input['text'] ?? ''))));
        $text = preg_replace("/\n{3,}/", "\n\n", $text);
        $errors = [];
        if (mb_strlen($name) < 2 || mb_strlen($name) > 40) $errors['name'] = 'Sitede görünecek adını yaz (2–40 karakter).';
        if (mb_strlen($text) < 10) $errors['text'] = 'Yorumun biraz daha uzun olsun (en az 10 karakter).';
        if (mb_strlen($text) > 1000) $errors['text'] = 'Yorum en fazla 1000 karakter olabilir.';
        if (($input['consent'] ?? '') !== '1') $errors['consent'] = 'Yorumunun sitede yayınlanmasına izin vermen gerekiyor.';
        if (count($files) > self::MAX_PHOTOS) $errors['photos'] = 'En fazla ' . self::MAX_PHOTOS . ' fotoğraf ekleyebilirsin.';
        if ($errors !== []) {
            throw ApiError::fields($errors);
        }
        if ($this->forOrder((int) $order['id']) !== null) {
            throw new ApiError('Bu sipariş için yorumunu zaten almıştım, teşekkürler!', 409);
        }

        // önce fotoğrafları diske yaz; bir şey ters giderse hepsini sil
        $this->uploads->ensureDir($this->dir);
        $photos = [];
        try {
            foreach ($files as $f) {
                $id = bin2hex(random_bytes(16));
                [$w, $h] = UploadService::saveJpeg($f, [
                    $this->photoPath($id) => self::PHOTO_SIDE,
                    $this->photoPath($id, thumb: true) => self::THUMB_SIDE,
                ]);
                $photos[] = ['id' => $id, 'w' => $w, 'h' => $h];
            }
            $this->db->transaction(function () use ($order, $name, $text, $photos, $ipHash): void {
                $this->db->run(
                    'INSERT INTO reviews (order_id, display_name, body, products, consent_at, ip_hash) VALUES (?, ?, ?, ?, NOW(), ?)',
                    [$order['id'], $name, $text, mb_substr(implode(', ', $this->productNames((int) $order['id'])), 0, 300), $ipHash],
                );
                $reviewId = (int) $this->db->pdo()->lastInsertId();
                foreach ($photos as $i => $p) {
                    $this->db->run(
                        'INSERT INTO review_photos (id, review_id, position, width, height) VALUES (?, ?, ?, ?, ?)',
                        [$p['id'], $reviewId, $i, $p['w'], $p['h']],
                    );
                }
            });
        } catch (\Throwable $e) {
            foreach ($photos as $p) $this->deleteFiles($p['id']);
            if ($e instanceof \PDOException && ($e->errorInfo[1] ?? null) === 1062) {
                throw new ApiError('Bu sipariş için yorumunu zaten almıştım, teşekkürler!', 409);
            }
            throw $e;
        }
    }

    /* ---------- okuma ---------- */

    /**
     * Sitede gösterilen yorumlar (sadece yayındakiler).
     * @param callable(string, bool): string $photoUrl
     * @return list<array<string, mixed>>
     */
    public function published(callable $photoUrl, int $limit = 60): array
    {
        $rows = $this->db->all(
            "SELECT * FROM reviews WHERE status = 'yayinda' ORDER BY published_at DESC, id DESC LIMIT $limit",
        );
        return array_map(fn (array $r): array => [
            'id' => (int) $r['id'],
            'name' => $r['display_name'],
            'text' => $r['body'],
            'products' => $r['products'],
            'createdAt' => new \DateTimeImmutable($r['created_at'])->format(DATE_ATOM),
            'photos' => $this->photos((int) $r['id'], $photoUrl),
        ], $rows);
    }

    /**
     * Yönetim listesi: duruma göre, sipariş bilgisiyle.
     * @param callable(string, bool): string $photoUrl
     * @return array{reviews: list<array<string, mixed>>, counts: array<string, int>}
     */
    public function adminList(string $status, callable $photoUrl): array
    {
        $status = in_array($status, ['bekliyor', 'yayinda', 'gizli'], true) ? $status : 'bekliyor';
        $rows = $this->db->all(
            'SELECT r.*, o.order_no, o.customer_name FROM reviews r JOIN orders o ON o.id = r.order_id
             WHERE r.status = ? ORDER BY r.created_at DESC LIMIT 200',
            [$status],
        );
        $counts = ['bekliyor' => 0, 'yayinda' => 0, 'gizli' => 0];
        foreach ($this->db->all('SELECT status, COUNT(*) AS n FROM reviews GROUP BY status') as $c) {
            $counts[$c['status']] = (int) $c['n'];
        }
        return [
            'reviews' => array_map(fn (array $r): array => [
                'id' => (int) $r['id'],
                'status' => $r['status'],
                'name' => $r['display_name'],
                'text' => $r['body'],
                'products' => $r['products'],
                'orderId' => $r['order_no'],
                'customerName' => $r['customer_name'],
                'createdAt' => new \DateTimeImmutable($r['created_at'])->format(DATE_ATOM),
                'photos' => $this->photos((int) $r['id'], $photoUrl),
            ], $rows),
            'counts' => $counts,
        ];
    }

    /** @param callable(string, bool): string $photoUrl @return list<array<string, mixed>> */
    private function photos(int $reviewId, callable $photoUrl): array
    {
        return array_map(static fn (array $p): array => [
            'url' => $photoUrl($p['id'], false),
            'thumb' => $photoUrl($p['id'], true),
            'width' => (int) $p['width'],
            'height' => (int) $p['height'],
        ], $this->db->all('SELECT * FROM review_photos WHERE review_id = ? ORDER BY position', [$reviewId]));
    }

    /** Fotoğrafın yorumu yayında mı (herkese açık gösterilebilir mi) */
    public function photoIsPublic(string $photoId): bool
    {
        return $this->db->one(
            "SELECT p.id FROM review_photos p JOIN reviews r ON r.id = p.review_id WHERE p.id = ? AND r.status = 'yayinda'",
            [$photoId],
        ) !== null;
    }

    /* ---------- yönetim ---------- */

    public function setStatus(int $id, string $status): void
    {
        if (!in_array($status, ['bekliyor', 'yayinda', 'gizli'], true)) {
            throw new ApiError('Geçersiz durum.');
        }
        $n = $this->db->run(
            "UPDATE reviews SET status = ?, published_at = IF(? = 'yayinda', COALESCE(published_at, NOW()), published_at) WHERE id = ?",
            [$status, $status, $id],
        )->rowCount();
        if ($n === 0 && $this->db->one('SELECT id FROM reviews WHERE id = ?', [$id]) === null) {
            throw ApiError::notFound('Yorum bulunamadı.');
        }
    }

    /** Yorumu ve fotoğraflarını tamamen siler (ör. müşteri KVKK kapsamında isterse). */
    public function delete(int $id): void
    {
        $photos = array_column($this->db->all('SELECT id FROM review_photos WHERE review_id = ?', [$id]), 'id');
        if ($this->db->run('DELETE FROM reviews WHERE id = ?', [$id])->rowCount() === 0) {
            throw ApiError::notFound('Yorum bulunamadı.');
        }
        foreach ($photos as $p) $this->deleteFiles($p);
    }

    /* ---------- dosyalar ---------- */

    public function photoPath(string $id, bool $thumb = false): string
    {
        if (!preg_match('/^[0-9a-f]{32}$/', $id)) {
            throw ApiError::notFound();
        }
        return $this->dir . '/' . $id . ($thumb ? '-k' : '') . '.jpg';
    }

    private function deleteFiles(string $id): void
    {
        @unlink($this->photoPath($id));
        @unlink($this->photoPath($id, thumb: true));
    }
}
