<?php

declare(strict_types=1);

namespace Lemona;

/**
 * Ürün kataloğu — tek kaynak veritabanı (brands, products, product_media, settings).
 * Site ürünleri, fiyatları ve fotoğrafları GET /katalog ile buradan alır; sipariş
 * gelince fiyat yine buradan yeniden hesaplanır, tarayıcıdan gelen fiyata güvenilmez.
 * Fiyatlar veritabanında kuruş, dışarıya TL olarak verilir.
 */
final class Catalog
{
    /** @var array<string, string>|null */
    private ?array $settings = null;

    public function __construct(private readonly Db $db) {}

    /* ---------- tek ürün (sipariş hesabı için) ---------- */

    /**
     * Satıştaki bir ilan; yoksa ya da gizliyse null.
     * @return array<string, mixed>|null
     */
    public function product(string $slug): ?array
    {
        $row = $this->db->one('SELECT * FROM products WHERE slug = ? AND active = 1', [$slug]);
        return $row === null ? null : $this->shape($row, []);
    }

    /** @param array<string, mixed> $product @param array<string, mixed> $selected */
    public function validOptions(array $product, array $selected): bool
    {
        return array_all(
            $product['options'],
            static fn (array $opt): bool => array_any(
                $opt['choices'],
                static fn (array $c): bool => ($selected[$opt['id']] ?? null) === $c['value'],
            ),
        );
    }

    /** Birim fiyat (TL) @param array<string, mixed> $product @param array<string, mixed> $selected */
    public function priceFor(array $product, array $selected): int
    {
        $price = (int) $product['basePrice'];
        foreach ($product['options'] as $opt) {
            $choice = array_find($opt['choices'], static fn (array $c): bool => ($selected[$opt['id']] ?? null) === $c['value']);
            $price += (int) ($choice['priceDelta'] ?? 0);
        }
        return $price;
    }

    /** ["Kılıf: Simli", ...] @param array<string, mixed> $product @param array<string, mixed> $selected @return list<string> */
    public function describeOptions(array $product, array $selected): array
    {
        $out = ['Kılıf: ' . ($product['kilif'] === 'simli' ? 'Simli' : 'Şeffaf')];
        foreach ($product['options'] as $opt) {
            $choice = array_find($opt['choices'], static fn (array $c): bool => ($selected[$opt['id']] ?? null) === $c['value']);
            if ($choice !== null) {
                $out[] = "{$opt['label']}: {$choice['label']}";
            }
        }
        return $out;
    }

    /* ---------- ayarlar ---------- */

    /** Kargo ücreti (TL). Ücretsiz kargo yok: her siparişte sabit ücret. */
    public function shippingFor(int $subtotal): int
    {
        return $subtotal > 0 ? $this->rule('kargoUcret') : 0;
    }

    /** settings tablosundaki sayı: kargoUcret, ajandaAdiMin, ajandaAdiMax, enFazlaAdet, enFazlaSatir */
    public function rule(string $key): int
    {
        $this->settings ??= array_column($this->db->all('SELECT k, v FROM settings'), 'v', 'k');
        if (!isset($this->settings[$key])) {
            throw new \RuntimeException("Ayar eksik: $key (settings tablosu)");
        }
        return (int) $this->settings[$key];
    }

    /* ---------- tüm katalog (GET /katalog) ---------- */

    /** @return array<string, mixed> */
    public function all(): array
    {
        $media = [];
        foreach ($this->db->all(
            'SELECT m.product_id, m.kind, m.src FROM product_media m
             JOIN products p ON p.id = m.product_id AND p.active = 1
             ORDER BY m.product_id, m.sort, m.id',
        ) as $m) {
            $media[(int) $m['product_id']][] = $m;
        }
        $products = array_map(
            fn (array $r): array => $this->shape($r, $media[(int) $r['id']] ?? []),
            $this->db->all(
                'SELECT p.* FROM products p JOIN brands b ON b.id = p.brand_id
                 WHERE p.active = 1 ORDER BY b.sort, p.sort, p.id',
            ),
        );
        return [
            'brands' => array_map(
                static fn (array $b): array => ['id' => $b['id'], 'name' => $b['name']],
                $this->db->all('SELECT id, name FROM brands ORDER BY sort, name'),
            ),
            'products' => $products,
            'shipping' => $this->rule('kargoUcret'),
            'rules' => [
                'agendaNameMin' => $this->rule('ajandaAdiMin'),
                'agendaNameMax' => $this->rule('ajandaAdiMax'),
                'maxQty' => $this->rule('enFazlaAdet'),
                'maxLines' => $this->rule('enFazlaSatir'),
            ],
        ];
    }

    /**
     * Veritabanı satırı → sitenin kullandığı ürün biçimi.
     * @param array<string, mixed> $r @param list<array<string, mixed>> $media
     * @return array<string, mixed>
     */
    private function shape(array $r, array $media): array
    {
        $brand = $this->brandName((string) $r['brand_id']);
        return [
            'slug' => $r['slug'],
            'grup' => $r['grup'],
            'kilif' => $r['kilif'],
            'marka' => $r['brand_id'],
            'brand' => $brand,
            'name' => $r['name'],
            'size' => $r['size'],
            'basePrice' => intdiv((int) $r['price_kurus'], 100),
            'description' => $r['description'],
            'agendaExample' => $r['agenda_example'],
            'options' => json_decode((string) $r['options_json'], true, 16, JSON_THROW_ON_ERROR),
            'customSize' => (bool) $r['custom_size'],
            'images' => array_values(array_map(
                static fn (array $m): string => $m['src'],
                array_filter($media, static fn (array $m): bool => $m['kind'] === 'image'),
            )),
            'videos' => array_values(array_map(
                static fn (array $m): string => $m['src'],
                array_filter($media, static fn (array $m): bool => $m['kind'] === 'video'),
            )),
        ];
    }

    /** @var array<string, string> */
    private array $brandNames = [];

    private function brandName(string $id): string
    {
        if ($this->brandNames === []) {
            $this->brandNames = array_column($this->db->all('SELECT id, name FROM brands'), 'name', 'id');
        }
        return $this->brandNames[$id] ?? $id;
    }

    /* ---------- yönetim: tüm ilanlar (gizliler dahil) ---------- */

    /** @return list<array<string, mixed>> */
    public function adminProducts(): array
    {
        $media = [];
        foreach ($this->db->all('SELECT product_id, kind, src FROM product_media ORDER BY product_id, sort, id') as $m) {
            $media[(int) $m['product_id']][] = $m;
        }
        return array_map(
            fn (array $r): array => $this->shape($r, $media[(int) $r['id']] ?? []) + ['active' => (bool) $r['active']],
            $this->db->all('SELECT p.* FROM products p JOIN brands b ON b.id = p.brand_id ORDER BY b.sort, p.sort, p.id'),
        );
    }

    /* ---------- yönetim: fotoğraf ve video listesi ---------- */

    /**
     * İlanın fotoğraflarını ve/veya videolarını verilen listeyle değiştirir (null olan türe dokunmaz).
     * @param list<string>|null $images @param list<string>|null $videos
     */
    public function setMedia(string $slug, ?array $images, ?array $videos): void
    {
        $product = $this->db->one('SELECT id FROM products WHERE slug = ?', [$slug])
            ?? throw ApiError::notFound('İlan bulunamadı.');
        $valid = static fn (mixed $src): bool => is_string($src) && preg_match('#^(/|https://)[^\s"\'<>]{1,290}$#', $src) === 1;
        $this->db->transaction(function () use ($product, $images, $videos, $valid): void {
            foreach (['image' => $images, 'video' => $videos] as $kind => $list) {
                if ($list === null) continue;
                if (!array_is_list($list) || !array_all($list, $valid)) {
                    throw new ApiError('Geçersiz dosya yolu.');
                }
                $this->db->run('DELETE FROM product_media WHERE product_id = ? AND kind = ?', [$product['id'], $kind]);
                foreach ($list as $i => $src) {
                    $this->db->run(
                        'INSERT INTO product_media (product_id, kind, src, sort) VALUES (?, ?, ?, ?)',
                        [$product['id'], $kind, $src, $i],
                    );
                }
            }
        });
    }
}
