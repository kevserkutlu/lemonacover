<?php

declare(strict_types=1);

namespace Lemona;

/**
 * Özel istekler: listede olmayan ya da özel ölçü ajandalar.
 *
 * Müşteri ajandasının tam adını ve en az bir görselini gönderir (ödeme yok).
 * Yönetimden bakılır: fiyat yazılarak onaylanır ya da notla reddedilir; müşteriye
 * e-posta gider. Onaylanan istek, istek koduyla (6 rakam) sepete eklenip sipariş edilir;
 * fiyatı her zaman buradan (onaylanan fiyat) gelir.
 *
 * Durumlar: bekliyor → onaylandi → siparis (ödeme alınınca) | reddedildi
 */
final readonly class RequestService
{
    public const int MAX_PHOTOS = 3;
    private const array STATUSES = ['bekliyor', 'onaylandi', 'reddedildi', 'siparis'];

    public function __construct(private Db $db, private UploadService $uploads, private string $dir) {}

    /** İstek kodu 6 rakam (482 913); boşluk/tire yok sayılır */
    public static function normalizeCode(string $code): string
    {
        return Codes::onlyDigits($code);
    }

    /** @return array<string, mixed>|null */
    public function findByCode(string $code): ?array
    {
        $code = self::normalizeCode($code);
        return strlen($code) === 6 ? $this->db->one('SELECT * FROM requests WHERE code = ?', [$code]) : null;
    }

    /** @return array<string, mixed>|null */
    public function find(int $id): ?array
    {
        return $this->db->one('SELECT * FROM requests WHERE id = ?', [$id]);
    }

    /* ---------- müşteri: istek bırakma ---------- */

    /**
     * @param array<string, mixed> $in name, email, phone, agendaName, kilif, en, boy, sirt, note
     * @param list<array<string, mixed>> $files
     * @return array<string, mixed> yeni istek
     */
    public function create(array $in, array $files, int $nameMin, int $nameMax, string $ipHash): array
    {
        $str = static fn (string $k, int $max): string => mb_substr(trim((string) ($in[$k] ?? '')), 0, $max);
        $d = [
            'name' => $str('name', 80),
            'email' => $str('email', 120),
            'phone' => $str('phone', 20),
            'agendaName' => $str('agendaName', $nameMax + 1),
            'kilif' => $str('kilif', 10),
            'en' => $str('en', 8),
            'boy' => $str('boy', 8),
            'sirt' => $str('sirt', 8),
            'note' => $str('note', 500),
        ];
        $size = static fn (string $v): bool => $v === '' || preg_match('/^\d{1,2}([.,]\d{1,2})?$/', $v) === 1;
        $errors = [];
        if (mb_strlen($d['name']) < 2) $errors['name'] = 'Adını yaz.';
        if (!filter_var($d['email'], FILTER_VALIDATE_EMAIL)) $errors['email'] = 'E-posta adresini kontrol et; cevabımı buraya yollayacağım.';
        $digits = preg_replace('/\D/', '', $d['phone']);
        if ($d['phone'] !== '' && (strlen($digits) < 10 || strlen($digits) > 12)) $errors['phone'] = 'Telefonu 05xx xxx xx xx biçiminde yaz ya da boş bırak.';
        $len = mb_strlen($d['agendaName']);
        if ($len < $nameMin || $len > $nameMax) $errors['agendaName'] = 'Ajandanın tam adını marka, model, yıl ve renk/desenle birlikte yaz.';
        if (!in_array($d['kilif'], ['seffaf', 'simli'], true)) $errors['kilif'] = 'Şeffaf mı simli mi istediğini seç.';
        if (!$size($d['en']) || !$size($d['boy']) || !$size($d['sirt'])) $errors['size'] = 'Ölçüleri santim olarak yaz (ör. 14,8) ya da boş bırak.';
        if ($files === []) $errors['photos'] = 'Ajandanın en az bir fotoğrafını ekle; bilmediğim bir ajandaysa karışıklık olmasın.';
        if (count($files) > self::MAX_PHOTOS) $errors['photos'] = 'En fazla ' . self::MAX_PHOTOS . ' fotoğraf ekleyebilirsin.';
        if ($errors !== []) {
            throw ApiError::fields($errors);
        }

        $this->uploads->ensureDir($this->dir);
        $photos = [];
        try {
            foreach ($files as $f) {
                $id = bin2hex(random_bytes(16));
                [$w, $h] = UploadService::saveJpeg($f, [
                    $this->photoPath($id) => 1600,
                    $this->photoPath($id, thumb: true) => 480,
                ]);
                $photos[] = ['id' => $id, 'w' => $w, 'h' => $h];
            }
            return $this->db->transaction(function () use ($d, $photos, $ipHash): array {
                for ($try = 0; ; $try++) {
                    $code = Codes::digits(6);
                    try {
                        $this->db->run(
                            'INSERT INTO requests (code, customer_name, email, phone, agenda_name, kilif, size_en, size_boy, size_sirt, note, ip_hash)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                            [
                                $code, $d['name'], $d['email'], $d['phone'] ?: null, $d['agendaName'], $d['kilif'],
                                $d['en'] ?: null, $d['boy'] ?: null, $d['sirt'] ?: null, $d['note'] ?: null, $ipHash,
                            ],
                        );
                        break;
                    } catch (\PDOException $e) {
                        if ($try >= 4 || ($e->errorInfo[1] ?? null) !== 1062) throw $e;
                    }
                }
                $id = (int) $this->db->pdo()->lastInsertId();
                foreach ($photos as $i => $p) {
                    $this->db->run(
                        'INSERT INTO request_photos (id, request_id, position, width, height) VALUES (?, ?, ?, ?, ?)',
                        [$p['id'], $id, $i, $p['w'], $p['h']],
                    );
                }
                return $this->find($id);
            });
        } catch (\Throwable $e) {
            foreach ($photos as $p) $this->deleteFiles($p['id']);
            throw $e;
        }
    }

    /**
     * Müşterinin gördüğü durum (istek koduyla). İletişim bilgisi yok.
     * @param array<string, mixed> $r
     * @return array<string, mixed>
     */
    public function publicView(array $r): array
    {
        return [
            'code' => $r['code'],
            'status' => $r['status'],
            'agendaName' => $r['agenda_name'],
            'kilif' => $r['kilif'],
            'details' => $this->details($r),
            'price' => $r['price_kurus'] !== null ? intdiv((int) $r['price_kurus'], 100) : null,
            'reply' => $r['reply'],
            'createdAt' => new \DateTimeImmutable($r['created_at'])->format(DATE_ATOM),
        ];
    }

    /** ["Ajanda: …", "Kılıf: Simli", "Ölçü: …", "Özel istek: 482 913"] @param array<string, mixed> $r @return list<string> */
    public function details(array $r): array
    {
        $out = ['Ajanda: ' . $r['agenda_name'], 'Kılıf: ' . ($r['kilif'] === 'simli' ? 'Simli' : 'Şeffaf')];
        if ($r['size_en'] || $r['size_boy'] || $r['size_sirt']) {
            $out[] = sprintf('Ölçü: %s × %s cm, sırt %s cm', $r['size_en'] ?? '?', $r['size_boy'] ?? '?', $r['size_sirt'] ?? '?');
        }
        $out[] = 'Özel istek: ' . Codes::group($r['code']);
        return $out;
    }

    /* ---------- sipariş ---------- */

    /**
     * Sepetteki istek satırı: sadece onaylanmış (ya da ödemesi tamamlanmamış bir siparişe
     * bağlanmış) istek sipariş edilebilir.
     * @return array<string, mixed>
     */
    public function forOrder(string $code): array
    {
        $r = $this->findByCode($code);
        if ($r === null || $r['status'] !== 'onaylandi' || $r['price_kurus'] === null) {
            throw new ApiError('Sepetindeki özel istek artık sipariş edilemiyor. İsteğinin durumuna istek kodunla bak.');
        }
        return $r;
    }

    public function linkOrder(int $requestId, int $orderId): void
    {
        $this->db->run('UPDATE requests SET order_id = ? WHERE id = ?', [$orderId, $requestId]);
    }

    /** Ödeme alınınca: siparişe bağlı istekler "siparis" olur (bir daha sipariş edilemez) */
    public function markOrdered(int $orderId): void
    {
        $this->db->run("UPDATE requests SET status = 'siparis' WHERE order_id = ? AND status = 'onaylandi'", [$orderId]);
    }

    /* ---------- yönetim ---------- */

    /**
     * @param callable(string, bool): string $photoUrl
     * @return array{requests: list<array<string, mixed>>, counts: array<string, int>}
     */
    public function adminList(string $status, callable $photoUrl): array
    {
        $status = in_array($status, self::STATUSES, true) ? $status : 'bekliyor';
        $counts = array_fill_keys(self::STATUSES, 0);
        foreach ($this->db->all('SELECT status, COUNT(*) AS n FROM requests GROUP BY status') as $c) {
            $counts[$c['status']] = (int) $c['n'];
        }
        $rows = $this->db->all(
            'SELECT r.*, o.order_no FROM requests r LEFT JOIN orders o ON o.id = r.order_id
             WHERE r.status = ? ORDER BY r.created_at DESC LIMIT 200',
            [$status],
        );
        return [
            'requests' => array_map(fn (array $r): array => $this->publicView($r) + [
                'id' => (int) $r['id'],
                'customer' => ['name' => $r['customer_name'], 'email' => $r['email'], 'phone' => $r['phone']],
                'note' => $r['note'],
                'orderId' => $r['order_no'],
                'decidedAt' => $r['decided_at'] ? new \DateTimeImmutable($r['decided_at'])->format(DATE_ATOM) : null,
                'photos' => array_map(static fn (array $p): array => [
                    'url' => $photoUrl($p['id'], false),
                    'thumb' => $photoUrl($p['id'], true),
                ], $this->db->all('SELECT id FROM request_photos WHERE request_id = ? ORDER BY position', [$r['id']])),
            ], $rows),
            'counts' => $counts,
        ];
    }

    /**
     * Onayla (fiyatla) ya da reddet. Değişen isteği döndürür.
     * @param array<string, mixed> $in { decision: onayla|reddet, price?, reply? }
     * @return array<string, mixed>
     */
    public function decide(int $id, array $in): array
    {
        $r = $this->find($id) ?? throw ApiError::notFound('İstek bulunamadı.');
        if ($r['status'] === 'siparis') {
            throw new ApiError('Bu istek siparişe dönüştü; artık değiştirilemez.');
        }
        $reply = mb_substr(trim((string) ($in['reply'] ?? '')), 0, 500) ?: null;
        match ($in['decision'] ?? '') {
            'onayla' => (function () use ($id, $in, $reply): void {
                // tam TL (sipariş fiyatları TL olarak hesaplanıyor)
                $price = (int) round((float) str_replace(',', '.', (string) ($in['price'] ?? '0'))) * 100;
                if ($price < 100 || $price > 10_000_00) {
                    throw ApiError::fields(['price' => 'Kılıfın fiyatını TL olarak yaz.']);
                }
                $this->db->run(
                    "UPDATE requests SET status = 'onaylandi', price_kurus = ?, reply = ?, decided_at = NOW() WHERE id = ?",
                    [$price, $reply, $id],
                );
            })(),
            'reddet' => $this->db->run(
                "UPDATE requests SET status = 'reddedildi', price_kurus = NULL, reply = ?, decided_at = NOW() WHERE id = ?",
                [$reply, $id],
            ),
            default => throw new ApiError('Onayla ya da reddet.'),
        };
        return $this->find($id);
    }

    /* ---------- görseller ---------- */

    public function photoPath(string $id, bool $thumb = false): string
    {
        if (!preg_match('/^[0-9a-f]{32}$/', $id)) {
            throw ApiError::notFound();
        }
        return $this->dir . '/' . $id . ($thumb ? '-k' : '') . '.jpg';
    }

    public function photoExists(string $id): bool
    {
        return $this->db->one('SELECT id FROM request_photos WHERE id = ?', [$id]) !== null;
    }

    private function deleteFiles(string $id): void
    {
        @unlink($this->photoPath($id));
        @unlink($this->photoPath($id, thumb: true));
    }
}
