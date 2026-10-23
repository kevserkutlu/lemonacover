<?php

declare(strict_types=1);

// Veritabanı tablolarını oluşturur (tekrar çalıştırmak güvenli).
// Kullanım:  php bin/kurulum.php

require dirname(__DIR__) . '/src/bootstrap.php';

use Lemona\Config;
use Lemona\Db;

if (PHP_SAPI !== 'cli') {
    exit("Bu betik sadece komut satırından çalışır.\n");
}

$config = Config::load(dirname(__DIR__) . '/config.php');
$db = new Db($config);
/** SQL dosyasını komutlara böler: yorum satırları atılır, satır sonundaki ; komutu bitirir. */
$statements = static fn (string $file): array => (string) file_get_contents($file)
    |> (static fn (string $s): string => preg_replace('/^\s*--.*$/m', '', $s))
    |> (static fn (string $s): array => preg_split('/;\s*$/m', $s))
    |> (static fn (array $parts): array => array_values(array_filter(array_map('trim', $parts))));

foreach ($statements(dirname(__DIR__) . '/database/schema.sql') as $stmt) {
    $db->pdo()->exec($stmt);
    preg_match('/CREATE TABLE IF NOT EXISTS (\w+)/', $stmt, $m);
    echo '✓ ', $m[1] ?? 'sorgu', PHP_EOL;
}

// İlk ürünler, markalar ve ayarlar: sadece ürün tablosu boşsa (sonraki çalıştırmalarda dokunmaz)
if ((int) $db->one('SELECT COUNT(*) AS n FROM products')['n'] === 0) {
    $db->transaction(function () use ($db, $statements): void {
        foreach ($statements(dirname(__DIR__) . '/database/baslangic-urunleri.sql') as $stmt) {
            $db->pdo()->exec($stmt);
        }
    });
    echo '✓ ilk ürünler yüklendi (', $db->one('SELECT COUNT(*) AS n FROM products')['n'], ' ilan)', PHP_EOL;
} else {
    echo '• ürünler zaten var, ilk ürünler yeniden yüklenmedi', PHP_EOL;
}

$storage = rtrim($config->string('storage_path', dirname(__DIR__) . '/storage'), '/');
foreach (['uploads', 'reviews', 'requests', 'logs'] as $dir) {
    if (!is_dir("$storage/$dir")) mkdir("$storage/$dir", 0750, true);
}
echo "Kurulum tamam. PHP ", PHP_VERSION, PHP_EOL;
