<?php

declare(strict_types=1);

namespace Lemona;

/**
 * Sipariş kuralları. Sitedeki src/lib/orderLogic.ts ile aynı kontroller;
 * fiyat her zaman katalogdan burada yeniden hesaplanır, tarayıcıya güvenilmez.
 */
final readonly class OrderService
{
    public function __construct(
        private Db $db,
        private Catalog $catalog,
        private UploadService $uploads,
        private RequestService $requests,
    ) {}

    /* ---------- müşteri bilgisi ---------- */

    /** @param array<string, mixed> $c @return array<string, string|null> */
    public function cleanCustomer(array $c): array
    {
        $str = static fn (mixed $v, int $max): string => is_string($v) ? mb_substr(trim($v), 0, $max) : '';
        return [
            'name' => $str($c['name'] ?? null, 80),
            'email' => $str($c['email'] ?? null, 120),
            'phone' => $str($c['phone'] ?? null, 20),
            'city' => $str($c['city'] ?? null, 40),
            'district' => $str($c['district'] ?? null, 60),
            'address' => $str($c['address'] ?? null, 400),
            'note' => $str($c['note'] ?? null, 400) ?: null,
        ];
    }

    /** @param array<string, string|null> $c @return array<string, string> alan → hata */
    public function validateCustomer(array $c, bool $contractAccepted): array
    {
        $errors = [];
        if (mb_strlen($c['name']) < 3) $errors['name'] = 'Adını ve soyadını yaz.';
        if (!filter_var($c['email'], FILTER_VALIDATE_EMAIL)) $errors['email'] = 'E-posta adresini kontrol et.';
        $digits = preg_replace('/\D/', '', $c['phone']);
        if (strlen($digits) < 10 || strlen($digits) > 12) $errors['phone'] = 'Telefon numaranı 05xx xxx xx xx biçiminde yaz.';
        if ($c['city'] === '') $errors['city'] = 'İl seç.';
        if (mb_strlen($c['district']) < 2) $errors['district'] = 'İlçeyi yaz.';
        if (mb_strlen($c['address']) < 10) $errors['address'] = 'Mahalle, sokak ve kapı numarasıyla birlikte yaz.';
        if (!$contractAccepted) $errors['contract'] = 'Devam etmek için sözleşmeleri onayla.';
        return $errors;
    }

    /* ---------- satırlar ve fiyat ---------- */

    /**
     * @param mixed $items tarayıcıdan gelen sepet
     * @return list<array<string, mixed>>
     */
    public function priceLines(mixed $items): array
    {
        if (!is_array($items) || $items === []) throw new ApiError('Sepetin boş.');
        $maxLines = $this->catalog->rule('enFazlaSatir');
        if (count($items) > $maxLines) throw new ApiError("Sepette en fazla $maxLines farklı ürün olabilir.");

        $lines = [];
        foreach (array_values($items) as $l) {
            if (!is_array($l)) throw new ApiError('Geçersiz sepet.');

            // onaylanmış özel istek: fiyat ve ajanda bilgisi istekten gelir
            if (isset($l['requestCode'])) {
                $r = $this->requests->forOrder((string) $l['requestCode']);
                $lines[] = [
                    'slug' => 'istek-' . $r['code'],
                    'name' => 'Özel istek kılıf',
                    'options' => [],
                    'details' => $this->requests->details($r),
                    'agendaName' => $r['agenda_name'],
                    'agendaLink' => null,
                    'imageId' => null,
                    'custom' => $r['size_en'] && $r['size_boy'] && $r['size_sirt']
                        ? ['en' => $r['size_en'], 'boy' => $r['size_boy'], 'sirt' => $r['size_sirt']]
                        : null,
                    'note' => is_string($l['note'] ?? null) ? (mb_substr(trim($l['note']), 0, 300) ?: null) : null,
                    'unitPrice' => intdiv((int) $r['price_kurus'], 100),
                    'qty' => max(1, min($this->catalog->rule('enFazlaAdet'), (int) ($l['qty'] ?? 1))),
                    'requestId' => (int) $r['id'],
                ];
                continue;
            }
            $product = $this->catalog->product((string) ($l['slug'] ?? ''));
            if ($product === null) throw new ApiError('Sepetindeki bir ürünü artık satmıyorum; sepetten çıkarıp tekrar dene.');
            $options = is_array($l['options'] ?? null) ? array_map('strval', $l['options']) : [];
            if (!$this->catalog->validOptions($product, $options)) {
                throw new ApiError("{$product['name']} için seçenekleri yeniden seç.");
            }
            $qty = max(1, min($this->catalog->rule('enFazlaAdet'), (int) ($l['qty'] ?? 1)));

            $custom = null;
            if (!empty($product['customSize'])) {
                $c = is_array($l['custom'] ?? null) ? $l['custom'] : [];
                $ok = static fn (mixed $v): bool => is_string($v) && preg_match('/^\d{1,2}([.,]\d{1,2})?$/', trim($v)) === 1;
                if (!$ok($c['en'] ?? null) || !$ok($c['boy'] ?? null) || !$ok($c['sirt'] ?? null)) {
                    throw new ApiError('Özel ölçü kılıf için en, boy ve sırt ölçüsünü yaz.');
                }
                $custom = ['en' => trim($c['en']), 'boy' => trim($c['boy']), 'sirt' => trim($c['sirt'])];
            }

            $a = is_array($l['agenda'] ?? null) ? $l['agenda'] : [];
            $agendaName = is_string($a['name'] ?? null) ? trim($a['name']) : '';
            $len = mb_strlen($agendaName);
            if ($len < $this->catalog->rule('ajandaAdiMin') || $len > $this->catalog->rule('ajandaAdiMax')) {
                throw new ApiError("{$product['name']} için ajandanın tam adını yaz.");
            }
            $link = is_string($a['link'] ?? null) ? mb_substr(trim($a['link']), 0, 500) : '';
            if ($link !== '' && (!preg_match('#^https?://#i', $link) || !filter_var($link, FILTER_VALIDATE_URL))) {
                throw new ApiError('Ürün bağlantısı geçerli değil.');
            }
            $imageId = is_string($a['imageId'] ?? null) ? $a['imageId'] : null;
            if ($imageId !== null && !$this->uploads->exists($imageId)) {
                throw new ApiError('Eklediğin görsel bulunamadı, ürünü sepete yeniden ekle.');
            }

            $lines[] = [
                'slug' => $product['slug'],
                'name' => $product['name'],
                'options' => $options,
                'details' => ["Ajanda: $agendaName", ...$this->catalog->describeOptions($product, $options)],
                'agendaName' => $agendaName,
                'agendaLink' => $link ?: null,
                'imageId' => $imageId,
                'custom' => $custom,
                'note' => is_string($l['note'] ?? null) ? (mb_substr(trim($l['note']), 0, 300) ?: null) : null,
                'unitPrice' => $this->catalog->priceFor($product, $options),
                'qty' => $qty,
            ];
        }
        return $lines;
    }

    /* ---------- sipariş oluşturma ---------- */

    /**
     * @param array<string, string|null> $customer
     * @param list<array<string, mixed>> $lines
     * @return array<string, mixed> yeni sipariş satırı
     */
    public function create(array $customer, array $lines, string $provider, string $ipHash): array
    {
        $subtotal = array_sum(array_map(static fn (array $l): int => $l['unitPrice'] * $l['qty'], $lines));
        $shipping = $this->catalog->shippingFor($subtotal);
        $phoneDigits = preg_replace('/\D/', '', $customer['phone']);

        return $this->db->transaction(function () use ($customer, $lines, $provider, $ipHash, $subtotal, $shipping, $phoneDigits): array {
            // Sipariş numarası çakışırsa yeniden dener
            for ($try = 0; ; $try++) {
                $no = $this->newOrderNo();
                try {
                    $this->db->run(
                        'INSERT INTO orders (order_no, customer_name, email, phone, phone_last4, city, district, address,
                            customer_note, subtotal_kurus, shipping_kurus, total_kurus, payment_provider, contract_accepted_at, ip_hash)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)',
                        [
                            $no, $customer['name'], $customer['email'], $customer['phone'], substr($phoneDigits, -4),
                            $customer['city'], $customer['district'], $customer['address'], $customer['note'],
                            $subtotal * 100, $shipping * 100, ($subtotal + $shipping) * 100, $provider, $ipHash,
                        ],
                    );
                    break;
                } catch (\PDOException $e) {
                    if ($try >= 4 || ($e->errorInfo[1] ?? null) !== 1062) throw $e; // 1062: tekrar eden anahtar
                }
            }
            $orderId = (int) $this->db->pdo()->lastInsertId();

            foreach ($lines as $l) {
                $this->db->run(
                    'INSERT INTO order_items (order_id, product_slug, product_name, options_json, details_json, agenda_name,
                        agenda_link, upload_id, custom_en, custom_boy, custom_sirt, note, unit_price_kurus, qty)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                        $orderId, $l['slug'], $l['name'],
                        json_encode($l['options'], JSON_UNESCAPED_UNICODE | JSON_FORCE_OBJECT),
                        json_encode($l['details'], JSON_UNESCAPED_UNICODE),
                        $l['agendaName'], $l['agendaLink'], $l['imageId'],
                        $l['custom']['en'] ?? null, $l['custom']['boy'] ?? null, $l['custom']['sirt'] ?? null,
                        $l['note'], $l['unitPrice'] * 100, $l['qty'],
                    ],
                );
                if ($l['imageId'] !== null) {
                    $this->db->run('UPDATE uploads SET order_id = ? WHERE id = ?', [$orderId, $l['imageId']]);
                }
                if (isset($l['requestId'])) {
                    $this->requests->linkOrder($l['requestId'], $orderId);
                }
            }
            $this->event($orderId, OrderStatus::AwaitingPayment, 'Sipariş oluşturuldu', 'musteri');

            return $this->db->one('SELECT * FROM orders WHERE id = ?', [$orderId]);
        });
    }

    /** LC-48213: kolay okunur, telefonda rakam klavyesiyle yazılır */
    private function newOrderNo(): string
    {
        return 'LC-' . Codes::digits(5);
    }

    /* ---------- okuma ---------- */

    /** @return array<string, mixed>|null */
    public function find(string $orderNo): ?array
    {
        // "LC-48213", "lc 48213" ya da sadece "48213" olur
        $rest = $orderNo |> strtoupper(...) |> (static fn (string $v): string => preg_replace('/[^A-Z0-9]/', '', $v));
        $rest = str_starts_with($rest, 'LC') ? substr($rest, 2) : $rest;
        $no = 'LC-' . $rest;
        if (!preg_match('/^LC-[A-Z0-9]{5}$/', $no)) {
            return null;
        }
        return $this->db->one('SELECT * FROM orders WHERE order_no = ?', [$no]);
    }

    /** @return list<array<string, mixed>> */
    public function items(int $orderId): array
    {
        return $this->db->all('SELECT * FROM order_items WHERE order_id = ? ORDER BY id', [$orderId]);
    }

    /**
     * Sitede gösterilen özet: adres, telefon gibi kişisel veriler yok.
     * @param array<string, mixed> $order
     * @return array<string, mixed>
     */
    public function summary(array $order): array
    {
        return [
            'id' => $order['order_no'],
            'createdAt' => new \DateTimeImmutable($order['created_at'])->format(DATE_ATOM),
            'status' => $order['status'],
            'trackingCode' => $order['tracking_code'],
            'carrier' => $order['carrier'],
            'lines' => array_map(static fn (array $i): array => [
                'name' => $i['product_name'],
                'details' => json_decode($i['details_json'], true),
                'qty' => (int) $i['qty'],
                'unitPrice' => intdiv((int) $i['unit_price_kurus'], 100),
            ], $this->items((int) $order['id'])),
            'shipping' => intdiv((int) $order['shipping_kurus'], 100),
            'total' => intdiv((int) $order['total_kurus'], 100),
        ];
    }

    /** Sipariş no + telefonun son 4 hanesi @return array<string, mixed>|null */
    public function findForTracking(string $orderNo, string $phoneLast4): ?array
    {
        $last4 = preg_replace('/\D/', '', $phoneLast4);
        $order = $this->find($orderNo);
        if ($order === null || strlen($last4) !== 4 || !hash_equals($order['phone_last4'], $last4)) {
            return null;
        }
        return $order;
    }

    /* ---------- durum değişiklikleri ---------- */

    /** Ödeme onaylandı. Aynı bildirim iki kez gelirse ikincisi bir şey yapmaz. */
    public function markPaid(array $order, string $paymentRef, string $actor = 'odeme'): bool
    {
        $changed = $this->db->run(
            "UPDATE orders SET status = 'hazirlaniyor', payment_ref = ?, paid_at = NOW()
             WHERE id = ? AND status = 'odeme-bekleniyor'",
            [$paymentRef, $order['id']],
        )->rowCount() === 1;
        if ($changed) {
            $this->event((int) $order['id'], OrderStatus::Preparing, 'Ödeme alındı', $actor);
            $this->requests->markOrdered((int) $order['id']);
        }
        return $changed;
    }

    public function event(int $orderId, OrderStatus $status, ?string $note, string $actor): void
    {
        $this->db->run(
            'INSERT INTO order_events (order_id, status, note, actor) VALUES (?, ?, ?, ?)',
            [$orderId, $status->value, $note, $actor],
        );
    }

    /* ---------- yönetim ---------- */

    /** @return array{orders: list<array<string, mixed>>, total: int} */
    public function list(?string $status, int $page, int $perPage = 30): array
    {
        $where = '';
        $params = [];
        if ($status !== null && OrderStatus::tryFrom($status) !== null) {
            $where = 'WHERE status = ?';
            $params[] = $status;
        }
        $total = (int) $this->db->one("SELECT COUNT(*) AS n FROM orders $where", $params)['n'];
        $offset = max(0, ($page - 1) * $perPage);
        $rows = $this->db->all(
            "SELECT order_no, status, customer_name, city, district, total_kurus, tracking_code, created_at, paid_at,
                    (SELECT SUM(qty) FROM order_items WHERE order_id = orders.id) AS item_count
             FROM orders $where ORDER BY created_at DESC LIMIT $perPage OFFSET $offset",
            $params,
        );
        return [
            'orders' => array_map(static fn (array $r): array => [
                'id' => $r['order_no'],
                'status' => $r['status'],
                'customerName' => $r['customer_name'],
                'place' => "{$r['district']} / {$r['city']}",
                'itemCount' => (int) $r['item_count'],
                'total' => intdiv((int) $r['total_kurus'], 100),
                'trackingCode' => $r['tracking_code'],
                'createdAt' => new \DateTimeImmutable($r['created_at'])->format(DATE_ATOM),
                'paidAt' => $r['paid_at'] ? new \DateTimeImmutable($r['paid_at'])->format(DATE_ATOM) : null,
            ], $rows),
            'total' => $total,
        ];
    }

    /**
     * Yönetim sayfası için siparişin tamamı (müşteri bilgileri dahil).
     * @param callable(string): string $imageUrl görsel kimliğinden imzalı adres üretir
     * @return array<string, mixed>
     */
    public function detail(array $order, callable $imageUrl): array
    {
        $items = array_map(static fn (array $i): array => [
            'name' => $i['product_name'],
            'slug' => $i['product_slug'],
            'details' => json_decode($i['details_json'], true),
            'agendaName' => $i['agenda_name'],
            'agendaLink' => $i['agenda_link'],
            'imageUrl' => $i['upload_id'] ? $imageUrl($i['upload_id']) : null,
            'custom' => $i['custom_en'] ? ['en' => $i['custom_en'], 'boy' => $i['custom_boy'], 'sirt' => $i['custom_sirt']] : null,
            'note' => $i['note'],
            'unitPrice' => intdiv((int) $i['unit_price_kurus'], 100),
            'qty' => (int) $i['qty'],
        ], $this->items((int) $order['id']));

        $events = array_map(static fn (array $e): array => [
            'status' => $e['status'],
            'note' => $e['note'],
            'actor' => $e['actor'],
            'at' => new \DateTimeImmutable($e['created_at'])->format(DATE_ATOM),
        ], $this->db->all('SELECT * FROM order_events WHERE order_id = ? ORDER BY id', [$order['id']]));

        return [
            'id' => $order['order_no'],
            'status' => $order['status'],
            'customer' => [
                'name' => $order['customer_name'],
                'email' => $order['email'],
                'phone' => $order['phone'],
                'city' => $order['city'],
                'district' => $order['district'],
                'address' => $order['address'],
                'note' => $order['customer_note'],
            ],
            'items' => $items,
            'subtotal' => intdiv((int) $order['subtotal_kurus'], 100),
            'shipping' => intdiv((int) $order['shipping_kurus'], 100),
            'total' => intdiv((int) $order['total_kurus'], 100),
            'paymentProvider' => $order['payment_provider'],
            'paymentRef' => $order['payment_ref'],
            'carrier' => $order['carrier'],
            'trackingCode' => $order['tracking_code'],
            'createdAt' => new \DateTimeImmutable($order['created_at'])->format(DATE_ATOM),
            'paidAt' => $order['paid_at'] ? new \DateTimeImmutable($order['paid_at'])->format(DATE_ATOM) : null,
            'events' => $events,
        ];
    }

    /** @param array<string, mixed> $patch { status?, carrier?, trackingCode?, note? } */
    public function update(array $order, array $patch): void
    {
        $sets = [];
        $params = [];
        $status = null;
        if (isset($patch['status'])) {
            $status = OrderStatus::tryFrom((string) $patch['status']) ?? throw new ApiError('Geçersiz durum.');
            $sets[] = 'status = ?';
            $params[] = $status->value;
        }
        foreach (['carrier' => 'carrier', 'trackingCode' => 'tracking_code'] as $key => $col) {
            if (array_key_exists($key, $patch)) {
                $v = is_string($patch[$key]) ? mb_substr(trim($patch[$key]), 0, 60) : '';
                $sets[] = "$col = ?";
                $params[] = $v === '' ? null : $v;
            }
        }
        if ($sets === []) {
            throw new ApiError('Değişecek bir şey yok.');
        }
        $params[] = $order['id'];
        $this->db->run('UPDATE orders SET ' . implode(', ', $sets) . ' WHERE id = ?', $params);

        $note = is_string($patch['note'] ?? null) ? mb_substr(trim($patch['note']), 0, 300) : null;
        if (!empty($patch['trackingCode'])) {
            $note = trim(($note ? "$note · " : '') . 'Takip no: ' . $patch['trackingCode']);
        }
        $this->event(
            (int) $order['id'],
            $status ?? OrderStatus::from($order['status']),
            $note ?: null,
            'yonetim',
        );
    }
}
