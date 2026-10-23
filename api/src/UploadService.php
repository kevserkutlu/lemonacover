<?php

declare(strict_types=1);

namespace Lemona;

/**
 * Müşterinin eklediği ajanda görseli.
 * Dosya olduğu gibi saklanmaz: GD ile açılıp yeniden JPEG olarak kaydedilir.
 * Böylece içine gizlenmiş kod ya da konum (EXIF) bilgisi kalmaz.
 */
final readonly class UploadService
{
    public const int MAX_BYTES = 4 * 1024 * 1024;
    private const int MAX_SIDE = 1600;
    private const array ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

    public function __construct(private Db $db, private string $dir) {}

    /** @param array<string, mixed>|null $file $_FILES['file'] @return array{id: string} */
    public function store(?array $file, string $ipHash): array
    {
        $this->ensureDir($this->dir);
        $id = bin2hex(random_bytes(16));
        $path = $this->path($id);
        [$w, $h] = self::saveJpeg($file, [$path => self::MAX_SIDE]);

        $this->db->run(
            'INSERT INTO uploads (id, mime, size_bytes, width, height, sha256, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [$id, 'image/jpeg', filesize($path), $w, $h, hash_file('sha256', $path), $ipHash],
        );
        return ['id' => $id];
    }

    /**
     * Yüklenen dosyayı denetler, GD ile açar ve istenen her boyutta yeniden JPEG olarak yazar.
     * @param array<string, mixed>|null $file tek bir $_FILES girdisi
     * @param array<string, int> $targets yol → en uzun kenar (px)
     * @return array{int, int} ilk hedefin genişliği ve yüksekliği
     */
    public static function saveJpeg(?array $file, array $targets): array
    {
        if (!$file || !isset($file['tmp_name']) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            $tooBig = in_array($file['error'] ?? null, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true);
            throw new ApiError($tooBig ? "Görsel 4 MB'tan büyük olamaz." : 'Bir görsel seç.');
        }
        if ($file['size'] > self::MAX_BYTES) {
            throw new ApiError("Görsel 4 MB'tan büyük olamaz.");
        }
        $mime = new \finfo(FILEINFO_MIME_TYPE)->file($file['tmp_name']);
        if (!in_array($mime, self::ALLOWED, true)) {
            throw new ApiError('Sadece JPG, PNG ya da WEBP görsel yükleyebilirsin.');
        }
        $src = @imagecreatefromstring((string) file_get_contents($file['tmp_name']));
        if ($src === false) {
            throw new ApiError('Bu görseli açamadım. Başka bir görsel dene.');
        }

        $first = null;
        foreach ($targets as $path => $maxSide) {
            [$w, $h] = [imagesx($src), imagesy($src)];
            $scale = min(1, $maxSide / max($w, $h));
            [$nw, $nh] = [max(1, (int) round($w * $scale)), max(1, (int) round($h * $scale))];
            $dst = imagecreatetruecolor($nw, $nh);
            imagefill($dst, 0, 0, imagecolorallocate($dst, 255, 255, 255)); // şeffaf PNG'ler beyaz zeminde
            imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);
            if (!imagejpeg($dst, $path, 85)) {
                throw new \RuntimeException('Görsel kaydedilemedi.');
            }
            $first ??= [$nw, $nh];
        }
        return $first ?? throw new \LogicException('Hedef yok.');
    }

    public function ensureDir(string $dir): void
    {
        if (!is_dir($dir) && !mkdir($dir, 0750, true) && !is_dir($dir)) {
            throw new \RuntimeException('Görsel klasörü oluşturulamadı.');
        }
    }

    public function path(string $id): string
    {
        if (!preg_match('/^[0-9a-f]{32}$/', $id)) {
            throw ApiError::notFound();
        }
        return $this->dir . '/' . $id . '.jpg';
    }

    public function exists(string $id): bool
    {
        return preg_match('/^[0-9a-f]{32}$/', $id) === 1
            && $this->db->one('SELECT id FROM uploads WHERE id = ? AND order_id IS NULL', [$id]) !== null;
    }
}
