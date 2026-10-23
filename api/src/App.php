<?php

declare(strict_types=1);

namespace Lemona;

use Lemona\Payment\PaymentProvider;
use Lemona\Payment\PaytrProvider;
use Lemona\Payment\TestProvider;

/**
 * Uç noktalar:
 *
 *   GET   /saglik                    API ve veritabanı çalışıyor mu
 *   GET   /katalog                   markalar, satıştaki ilanlar (fiyat, seçenek, fotoğraf, video), kargo ücreti, kurallar
 *   POST  /siparis                   sipariş oluştur → { orderId, redirectUrl }
 *   GET   /siparis/{no}              sipariş özeti (kişisel veri yok)
 *   POST  /siparis-takip             { id, phone(son 4 hane) } → sipariş özeti
 *   POST  /gorsel                    ajanda görseli yükle (multipart, alan: file) → { id }
 *   GET   /gorsel/{id}?exp=&sig=     imzalı adresle görseli göster (yönetim için)
 *   POST  /odeme/test                test modunda ödemeyi onayla
 *   POST  /odeme/paytr/bildirim      PayTR ödeme bildirimi
 *
 *   POST  /istek                     özel istek (multipart: name, email, phone?, agendaName, kilif, en?, boy?, sirt?, note?, photos[] 1–3)
 *   POST  /istek/durum               { code } → isteğin durumu, onaylandıysa fiyatı
 *   GET   /istek-gorsel/{id}[?k=1]   istek görseli (sadece imzalı adresle; yönetim için)
 *   POST  /yorum/kod                 { code } → yorum yazılabilir mi, hangi ürünler
 *   POST  /yorum                     yorum yaz (multipart: code, name, text, consent=1, photos[] ≤ 3)
 *   GET   /yorumlar                  yayındaki yorumlar
 *   GET   /yorum-gorsel/{id}[?k=1]   yorum fotoğrafı (k=1 küçük hali); yayında değilse imzalı adres gerekir
 *
 *   Yönetim (Authorization: Bearer {admin_token}):
 *   GET   /yonetim/siparisler?durum=&sayfa=
 *   GET   /yonetim/siparis/{no}
 *   PATCH /yonetim/siparis/{no}      { status?, carrier?, trackingCode?, note? }
 *   GET   /yonetim/yorumlar?durum=bekliyor|yayinda|gizli
 *   PATCH /yonetim/yorum/{id}        { status }
 *   DELETE /yonetim/yorum/{id}       yorumu ve fotoğraflarını siler
 *   GET   /yonetim/istekler?durum=bekliyor|onaylandi|reddedildi|siparis
 *   PATCH /yonetim/istek/{id}        { decision: onayla|reddet, price?, reply? } → müşteriye e-posta
 *   GET   /yonetim/urunler           tüm ilanlar, gizliler dahil (npm run fotolar kullanır)
 *   PATCH /yonetim/urun/{slug}/medya { images?: string[], videos?: string[] } (npm run fotolar kullanır)
 */
final class App
{
    private Db $db;
    private Catalog $catalog;
    private OrderService $orders;
    private UploadService $uploads;
    private RateLimiter $limiter;
    private Mailer $mailer;
    private ReviewService $reviews;
    private RequestService $requests;

    public function __construct(private readonly Config $config)
    {
        $storage = rtrim($config->string('storage_path', dirname(__DIR__) . '/storage'), '/');
        $this->db = new Db($config);
        $this->catalog = new Catalog($this->db);
        $this->uploads = new UploadService($this->db, $storage . '/uploads');
        $this->requests = new RequestService($this->db, $this->uploads, $storage . '/requests');
        $this->orders = new OrderService($this->db, $this->catalog, $this->uploads, $this->requests);
        $this->limiter = new RateLimiter($this->db, $config->string('app_secret'));
        $this->mailer = new Mailer($config, $storage . '/logs');
        $this->reviews = new ReviewService($this->db, $this->uploads, $storage . '/reviews');
    }

    public function handle(string $method, string $path): never
    {
        $route = "$method $path";
        match (true) {
            $route === 'GET /saglik' => $this->health(),
            $route === 'GET /katalog' => $this->catalogAll(),
            $route === 'POST /siparis' => $this->createOrder(),
            (bool) preg_match('#^GET /siparis/([A-Za-z0-9-]{1,12})$#', $route, $m) => $this->orderSummary($m[1]),
            $route === 'POST /siparis-takip' => $this->track(),
            $route === 'POST /gorsel' => $this->upload(),
            (bool) preg_match('#^GET /gorsel/([0-9a-f]{32})$#', $route, $m) => $this->image($m[1]),
            $route === 'POST /odeme/test' => $this->testPayment(),
            $route === 'POST /odeme/paytr/bildirim' => $this->paytrCallback(),
            $route === 'POST /istek' => $this->createRequest(),
            $route === 'POST /istek/durum' => $this->requestStatus(),
            (bool) preg_match('#^GET /istek-gorsel/([0-9a-f]{32})$#', $route, $m) => $this->requestPhoto($m[1]),
            $route === 'POST /yorum/kod' => $this->reviewCode(),
            $route === 'POST /yorum' => $this->createReview(),
            $route === 'GET /yorumlar' => $this->publishedReviews(),
            (bool) preg_match('#^GET /yorum-gorsel/([0-9a-f]{32})$#', $route, $m) => $this->reviewPhoto($m[1]),
            $route === 'GET /yonetim/siparisler' => $this->adminList(),
            (bool) preg_match('#^GET /yonetim/siparis/([A-Za-z0-9-]{1,12})$#', $route, $m) => $this->adminDetail($m[1]),
            (bool) preg_match('#^PATCH /yonetim/siparis/([A-Za-z0-9-]{1,12})$#', $route, $m) => $this->adminUpdate($m[1]),
            $route === 'GET /yonetim/yorumlar' => $this->adminReviews(),
            $route === 'GET /yonetim/istekler' => $this->adminRequests(),
            (bool) preg_match('#^PATCH /yonetim/istek/(\d{1,12})$#', $route, $m) => $this->adminDecide((int) $m[1]),
            $route === 'GET /yonetim/urunler' => $this->adminProducts(),
            (bool) preg_match('#^PATCH /yonetim/urun/([a-z0-9-]{1,80})/medya$#', $route, $m) => $this->adminMedia($m[1]),
            (bool) preg_match('#^PATCH /yonetim/yorum/(\d{1,12})$#', $route, $m) => $this->adminReviewStatus((int) $m[1]),
            (bool) preg_match('#^DELETE /yonetim/yorum/(\d{1,12})$#', $route, $m) => $this->adminReviewDelete((int) $m[1]),
            default => throw ApiError::notFound('Böyle bir adres yok.'),
        };
    }

    /* ---------- herkese açık ---------- */

    private function health(): never
    {
        $this->db->one('SELECT 1');
        Http::send(['ok' => true, 'php' => PHP_VERSION, 'odeme' => $this->provider()->name()]);
    }

    private function catalogAll(): never
    {
        $this->limiter->hit('katalog', Http::clientIp(), max: 600, windowSeconds: 900);
        Http::send($this->catalog->all());
    }

    private function createOrder(): never
    {
        $ip = Http::clientIp();
        $this->limiter->hit('siparis', $ip, max: 10, windowSeconds: 900);

        $body = Http::json();
        $customer = $this->orders->cleanCustomer(is_array($body['customer'] ?? null) ? $body['customer'] : []);
        $contract = ($body['consents']['contract'] ?? false) === true;
        $errors = $this->orders->validateCustomer($customer, $contract);
        if ($errors !== []) {
            throw ApiError::fields($errors);
        }
        $lines = $this->orders->priceLines($body['items'] ?? null);

        $provider = $this->provider();
        $order = $this->orders->create($customer, $lines, $provider->name(), $this->limiter->ipHash($ip));
        $redirectUrl = $provider->start($order, $this->orders->items((int) $order['id']), $ip);

        Http::send(['orderId' => $order['order_no'], 'redirectUrl' => $redirectUrl], 201);
    }

    private function orderSummary(string $no): never
    {
        $this->limiter->hit('ozet', Http::clientIp(), max: 120, windowSeconds: 900);
        $order = $this->orders->find($no) ?? throw ApiError::notFound('Sipariş bulunamadı.');
        Http::send($this->orders->summary($order));
    }

    private function track(): never
    {
        $this->limiter->hit('takip', Http::clientIp(), max: 15, windowSeconds: 900);
        $body = Http::json();
        $order = $this->orders->findForTracking((string) ($body['id'] ?? ''), (string) ($body['phone'] ?? ''))
            ?? throw ApiError::notFound(
                'Bu sipariş numarası ve telefonla eşleşen bir sipariş bulamadım. Sipariş numarası onay e-postasında yazıyor.',
            );
        // Takip doğrulandığı için (no + telefon) kargodaki siparişin yorum kodu da gösterilir
        $canReview = in_array($order['status'], [OrderStatus::Shipped->value, OrderStatus::Delivered->value], true);
        Http::send($this->orders->summary($order) + [
            'reviewCode' => $canReview ? $this->reviews->codeFor((int) $order['id']) : null,
        ]);
    }

    private function upload(): never
    {
        $ip = Http::clientIp();
        $this->limiter->hit('gorsel', $ip, max: 30, windowSeconds: 3600);
        Http::send($this->uploads->store($_FILES['file'] ?? null, $this->limiter->ipHash($ip)), 201);
    }

    /** API'nin kendi adresi (görsel bağlantıları için) */
    private function apiBase(): string
    {
        $base = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
        return $base . rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
    }

    /** Yönetim sayfası görseli <img> ile açabilsin diye kısa ömürlü imzalı adres */
    private function imageUrl(string $id): string
    {
        $exp = time() + 3600;
        $sig = hash_hmac('sha256', "$id|$exp", $this->config->string('app_secret'));
        return "{$this->apiBase()}/gorsel/$id?exp=$exp&sig=$sig";
    }

    private function image(string $id): never
    {
        $exp = (int) ($_GET['exp'] ?? 0);
        $sig = (string) ($_GET['sig'] ?? '');
        $expected = hash_hmac('sha256', "$id|$exp", $this->config->string('app_secret'));
        if ($exp < time() || !hash_equals($expected, $sig)) {
            throw new ApiError('Bu bağlantının süresi dolmuş.', 403);
        }
        $path = $this->uploads->path($id);
        if (!is_file($path)) {
            throw ApiError::notFound();
        }
        header('Content-Type: image/jpeg');
        header('Content-Length: ' . filesize($path));
        header('Cache-Control: private, max-age=3600');
        readfile($path);
        exit;
    }

    /* ---------- ödeme ---------- */

    private function provider(): PaymentProvider
    {
        $site = $this->config->string('site_url');
        return match ($this->config->string('payment.provider', 'test')) {
            'paytr' => new PaytrProvider(
                $this->config->string('payment.paytr.merchant_id'),
                $this->config->string('payment.paytr.merchant_key'),
                $this->config->string('payment.paytr.merchant_salt'),
                (int) $this->config->get('payment.paytr.test_mode', 1),
                $site,
            ),
            default => new TestProvider($site),
        };
    }

    private function testPayment(): never
    {
        if ($this->provider()->name() !== 'test') {
            throw ApiError::notFound();
        }
        $body = Http::json();
        $order = $this->orders->find((string) ($body['orderId'] ?? ''));
        if ($order === null || $order['status'] !== OrderStatus::AwaitingPayment->value) {
            throw ApiError::notFound('Sipariş bulunamadı ya da ödemesi zaten alınmış.');
        }
        $this->paid($order, 'TEST-' . time(), 'test', ['orderId' => $order['order_no']]);
        Http::send(['ok' => true]);
    }

    private function paytrCallback(): never
    {
        $provider = $this->provider();
        if (!$provider instanceof PaytrProvider) {
            Http::text('PAYTR kapalı', 404);
        }
        $post = $_POST;
        $verified = $provider->verifyCallback($post);
        $order = $this->orders->find(PaytrProvider::orderNoFromOid((string) ($post['merchant_oid'] ?? '')));
        $this->db->run(
            'INSERT INTO payment_events (order_id, provider, verified, payload) VALUES (?, ?, ?, ?)',
            [$order['id'] ?? null, 'paytr', (int) $verified, json_encode($post, JSON_UNESCAPED_UNICODE)],
        );
        if (!$verified) {
            Http::text('PAYTR notification failed: bad hash', 400);
        }
        if ($order !== null && ($post['status'] ?? '') === 'success'
            && (int) ($post['total_amount'] ?? 0) >= (int) $order['total_kurus']) {
            $this->paid($order, 'PAYTR-' . $post['merchant_oid'], 'paytr', null);
        }
        // PayTR "OK" yanıtı almazsa bildirimi tekrar tekrar yollar
        Http::text('OK');
    }

    /** @param array<string, mixed> $order @param array<string, mixed>|null $payload */
    private function paid(array $order, string $ref, string $provider, ?array $payload): void
    {
        if ($payload !== null) {
            $this->db->run(
                'INSERT INTO payment_events (order_id, provider, verified, payload) VALUES (?, ?, 1, ?)',
                [$order['id'], $provider, json_encode($payload, JSON_UNESCAPED_UNICODE)],
            );
        }
        if ($this->orders->markPaid($order, $ref)) {
            $this->mailer->orderPaid($order, $this->orders->items((int) $order['id']));
        }
    }

    /* ---------- yönetim ---------- */

    private function requireAdmin(): void
    {
        $token = $this->config->string('admin_token');
        $given = preg_replace('/^Bearer\s+/i', '', Http::header('Authorization'));
        if (strlen($token) < 32 || !hash_equals($token, $given)) {
            $this->limiter->hit('yonetim-hata', Http::clientIp(), max: 20, windowSeconds: 900);
            throw new ApiError('Yönetim anahtarı hatalı.', 401);
        }
    }

    private function adminList(): never
    {
        $this->requireAdmin();
        $status = isset($_GET['durum']) && $_GET['durum'] !== '' ? (string) $_GET['durum'] : null;
        Http::send($this->orders->list($status, max(1, (int) ($_GET['sayfa'] ?? 1))));
    }

    private function adminDetail(string $no): never
    {
        $this->requireAdmin();
        $order = $this->orders->find($no) ?? throw ApiError::notFound('Sipariş bulunamadı.');
        Http::send($this->adminOrder($order));
    }

    /** @param array<string, mixed> $order @return array<string, mixed> */
    private function adminOrder(array $order): array
    {
        $review = $this->reviews->forOrder((int) $order['id']);
        $paid = $order['status'] !== OrderStatus::AwaitingPayment->value && $order['status'] !== OrderStatus::Cancelled->value;
        return $this->orders->detail($order, $this->imageUrl(...)) + [
            'reviewCode' => $paid ? $this->reviews->codeFor((int) $order['id']) : null,
            'reviewStatus' => $review['status'] ?? null,
        ];
    }

    private function adminUpdate(string $no): never
    {
        $this->requireAdmin();
        $order = $this->orders->find($no) ?? throw ApiError::notFound('Sipariş bulunamadı.');
        $this->orders->update($order, Http::json());
        $fresh = $this->orders->find($no);
        if ($fresh['status'] === OrderStatus::Shipped->value && $order['status'] !== OrderStatus::Shipped->value) {
            $this->mailer->shipped($fresh, $this->reviews->codeFor((int) $fresh['id']));
        }
        Http::send($this->adminOrder($fresh));
    }

    /* ---------- yorumlar ---------- */

    private function reviewCode(): never
    {
        $this->limiter->hit('yorum-kod', Http::clientIp(), max: 20, windowSeconds: 900);
        $code = (string) (Http::json()['code'] ?? '');
        $order = $this->reviews->orderForCode($code) ?? throw ApiError::notFound(
            'Bu kodu bulamadım. Teşekkür kartındaki 6 haneli kodu kontrol et; kodlar kılıf kargoya verildikten sonra çalışır.',
        );
        $review = $this->reviews->forOrder((int) $order['id']);
        Http::send([
            'code' => ReviewService::normalizeCode($code),
            'products' => $this->reviews->productNames((int) $order['id']),
            'review' => $review ? ['status' => $review['status']] : null,
        ]);
    }

    private function createReview(): never
    {
        $ip = Http::clientIp();
        $this->limiter->hit('yorum', $ip, max: 6, windowSeconds: 3600);
        $order = $this->reviews->orderForCode((string) ($_POST['code'] ?? ''))
            ?? throw ApiError::notFound('Bu kodu bulamadım. Teşekkür kartındaki kodu kontrol et.');
        $this->reviews->create($order, $_POST, self::uploadedList('photos'), $this->limiter->ipHash($ip));
        Http::send(['status' => 'bekliyor'], 201);
    }

    /**
     * photos[] alanındaki dosyaları tek tek $_FILES girdisine çevirir.
     * @return list<array<string, mixed>>
     */
    private static function uploadedList(string $field): array
    {
        $f = $_FILES[$field] ?? null;
        if (!is_array($f) || !isset($f['name'])) return [];
        if (!is_array($f['name'])) return ($f['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE ? [] : [$f];
        $list = [];
        foreach (array_keys($f['name']) as $i) {
            if (($f['error'][$i] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) continue;
            $list[] = [
                'name' => $f['name'][$i],
                'type' => $f['type'][$i] ?? '',
                'tmp_name' => $f['tmp_name'][$i] ?? '',
                'error' => $f['error'][$i],
                'size' => $f['size'][$i] ?? 0,
            ];
        }
        return $list;
    }

    private function publishedReviews(): never
    {
        $this->limiter->hit('yorumlar', Http::clientIp(), max: 300, windowSeconds: 900);
        Http::send(['reviews' => $this->reviews->published($this->publicPhotoUrl(...))]);
    }

    private function publicPhotoUrl(string $id, bool $thumb): string
    {
        return "{$this->apiBase()}/yorum-gorsel/$id" . ($thumb ? '?k=1' : '');
    }

    /** Onay bekleyen yorumların fotoğrafları yönetim sayfasında imzalı adresle açılır */
    private function signedPhotoUrl(string $id, bool $thumb): string
    {
        $exp = time() + 3600;
        $sig = hash_hmac('sha256', "yorum|$id|$exp", $this->config->string('app_secret'));
        return "{$this->apiBase()}/yorum-gorsel/$id?" . ($thumb ? 'k=1&' : '') . "exp=$exp&sig=$sig";
    }

    private function reviewPhoto(string $id): never
    {
        $public = $this->reviews->photoIsPublic($id);
        if (!$public) {
            $exp = (int) ($_GET['exp'] ?? 0);
            $expected = hash_hmac('sha256', "yorum|$id|$exp", $this->config->string('app_secret'));
            if ($exp < time() || !hash_equals($expected, (string) ($_GET['sig'] ?? ''))) {
                throw ApiError::notFound();
            }
        }
        $path = $this->reviews->photoPath($id, thumb: ($_GET['k'] ?? '') === '1');
        if (!is_file($path)) {
            throw ApiError::notFound();
        }
        header('Content-Type: image/jpeg');
        header('Content-Length: ' . filesize($path));
        header('Cache-Control: ' . ($public ? 'public, max-age=86400' : 'private, max-age=3600'));
        header('X-Content-Type-Options: nosniff');
        readfile($path);
        exit;
    }

    private function adminReviews(): never
    {
        $this->requireAdmin();
        Http::send($this->reviews->adminList((string) ($_GET['durum'] ?? 'bekliyor'), $this->signedPhotoUrl(...)));
    }

    private function adminReviewStatus(int $id): never
    {
        $this->requireAdmin();
        $this->reviews->setStatus($id, (string) (Http::json()['status'] ?? ''));
        Http::send(['ok' => true]);
    }

    private function adminReviewDelete(int $id): never
    {
        $this->requireAdmin();
        $this->reviews->delete($id);
        Http::send(['ok' => true]);
    }

    /* ---------- ürünler (yönetim) ---------- */

    private function adminProducts(): never
    {
        $this->requireAdmin();
        Http::send(['products' => $this->catalog->adminProducts()]);
    }

    private function adminMedia(string $slug): never
    {
        $this->requireAdmin();
        $body = Http::json();
        $this->catalog->setMedia(
            $slug,
            isset($body['images']) ? (is_array($body['images']) ? $body['images'] : throw new ApiError('images bir liste olmalı.')) : null,
            isset($body['videos']) ? (is_array($body['videos']) ? $body['videos'] : throw new ApiError('videos bir liste olmalı.')) : null,
        );
        Http::send(['ok' => true]);
    }

    /* ---------- özel istekler ---------- */

    private function createRequest(): never
    {
        $ip = Http::clientIp();
        $this->limiter->hit('istek', $ip, max: 6, windowSeconds: 3600);
        $r = $this->requests->create(
            $_POST,
            self::uploadedList('photos'),
            $this->catalog->rule('ajandaAdiMin'),
            $this->catalog->rule('ajandaAdiMax'),
            $this->limiter->ipHash($ip),
        );
        $this->mailer->requestReceived($r);
        Http::send(['code' => $r['code']], 201);
    }

    private function requestStatus(): never
    {
        $this->limiter->hit('istek-durum', Http::clientIp(), max: 40, windowSeconds: 900);
        $r = $this->requests->findByCode((string) (Http::json()['code'] ?? ''))
            ?? throw ApiError::notFound('Bu istek kodunu bulamadım. E-postandaki 6 haneli kodu kontrol et.');
        Http::send($this->requests->publicView($r));
    }

    private function requestPhotoUrl(string $id, bool $thumb): string
    {
        $exp = time() + 3600;
        $sig = hash_hmac('sha256', "istek|$id|$exp", $this->config->string('app_secret'));
        return "{$this->apiBase()}/istek-gorsel/$id?" . ($thumb ? 'k=1&' : '') . "exp=$exp&sig=$sig";
    }

    private function requestPhoto(string $id): never
    {
        $exp = (int) ($_GET['exp'] ?? 0);
        $expected = hash_hmac('sha256', "istek|$id|$exp", $this->config->string('app_secret'));
        if ($exp < time() || !hash_equals($expected, (string) ($_GET['sig'] ?? '')) || !$this->requests->photoExists($id)) {
            throw ApiError::notFound();
        }
        $path = $this->requests->photoPath($id, thumb: ($_GET['k'] ?? '') === '1');
        if (!is_file($path)) {
            throw ApiError::notFound();
        }
        header('Content-Type: image/jpeg');
        header('Content-Length: ' . filesize($path));
        header('Cache-Control: private, max-age=3600');
        header('X-Content-Type-Options: nosniff');
        readfile($path);
        exit;
    }

    private function adminRequests(): never
    {
        $this->requireAdmin();
        Http::send($this->requests->adminList((string) ($_GET['durum'] ?? 'bekliyor'), $this->requestPhotoUrl(...)));
    }

    private function adminDecide(int $id): never
    {
        $this->requireAdmin();
        $r = $this->requests->decide($id, Http::json());
        $this->mailer->requestDecided($r);
        Http::send(['ok' => true, 'status' => $r['status']]);
    }
}
