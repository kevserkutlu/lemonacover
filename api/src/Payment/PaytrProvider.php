<?php

declare(strict_types=1);

namespace Lemona\Payment;

use Lemona\ApiError;

/**
 * PayTR iFrame API.
 *
 * Akış:
 * 1) start(): PayTR'den ödeme token'ı alınır, müşteri PayTR'nin güvenli ödeme
 *    sayfasına (https://www.paytr.com/odeme/guvenli/{token}) yönlendirilir.
 * 2) PayTR, ödeme sonucunu "Bildirim URL"ine (POST /odeme/paytr/bildirim) yollar;
 *    hash doğrulanınca sipariş ödenmiş sayılır. Bu adres PayTR mağaza panelinde
 *    tanımlanmalı.
 * 3) Müşteri ödeme bitince sitedeki sipariş sayfasına döner.
 *
 * Not: Anahtarlar gelince önce test_mode = 1 ile denenmeli.
 */
final readonly class PaytrProvider implements PaymentProvider
{
    private const string TOKEN_URL = 'https://www.paytr.com/odeme/api/get-token';

    public function __construct(
        private string $merchantId,
        private string $merchantKey,
        private string $merchantSalt,
        private int $testMode,
        private string $siteUrl,
    ) {}

    public function name(): string
    {
        return 'paytr';
    }

    /** PayTR sipariş numarasında sadece harf/rakam kabul eder: LC-7K3QF → LC7K3QF */
    public static function merchantOid(string $orderNo): string
    {
        return str_replace('-', '', $orderNo);
    }

    public static function orderNoFromOid(string $oid): string
    {
        return substr($oid, 0, 2) . '-' . substr($oid, 2);
    }

    public function start(array $order, array $items, string $clientIp): string
    {
        $oid = self::merchantOid($order['order_no']);
        $amount = (string) $order['total_kurus'];
        $basket = $items
            |> (static fn (array $rows): array => array_map(
                static fn (array $i): array => [
                    $i['product_name'],
                    number_format($i['unit_price_kurus'] / 100, 2, '.', ''),
                    (int) $i['qty'],
                ],
                $rows,
            ))
            |> (static fn (array $rows): string => json_encode($rows, JSON_UNESCAPED_UNICODE))
            |> base64_encode(...);

        $noInstallment = '1';
        $maxInstallment = '0';
        $currency = 'TL';
        $hashStr = $this->merchantId . $clientIp . $oid . $order['email'] . $amount . $basket
            . $noInstallment . $maxInstallment . $currency . $this->testMode;
        $token = base64_encode(hash_hmac('sha256', $hashStr . $this->merchantSalt, $this->merchantKey, true));

        $site = rtrim($this->siteUrl, '/');
        $fields = [
            'merchant_id' => $this->merchantId,
            'user_ip' => $clientIp,
            'merchant_oid' => $oid,
            'email' => $order['email'],
            'payment_amount' => $amount,
            'paytr_token' => $token,
            'user_basket' => $basket,
            'debug_on' => $this->testMode,
            'no_installment' => $noInstallment,
            'max_installment' => $maxInstallment,
            'user_name' => $order['customer_name'],
            'user_address' => "{$order['address']} {$order['district']} / {$order['city']}",
            'user_phone' => $order['phone'],
            'merchant_ok_url' => $site . '/siparis/?no=' . rawurlencode($order['order_no']) . '&yeni=1',
            'merchant_fail_url' => $site . '/odeme/?hata=odeme',
            'timeout_limit' => '30',
            'currency' => $currency,
            'test_mode' => $this->testMode,
            'lang' => 'tr',
        ];

        $ch = curl_init(self::TOKEN_URL);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $fields,
            CURLOPT_TIMEOUT => 20,
        ]);
        $raw = curl_exec($ch);
        if ($raw === false) {
            throw new ApiError('Ödeme sayfası açılamadı, birkaç dakika sonra tekrar dene.', 502);
        }
        $res = json_decode((string) $raw, true);
        if (($res['status'] ?? '') !== 'success' || empty($res['token'])) {
            error_log('PayTR token hatası: ' . ($res['reason'] ?? $raw));
            throw new ApiError('Ödeme sayfası açılamadı, birkaç dakika sonra tekrar dene.', 502);
        }
        return 'https://www.paytr.com/odeme/guvenli/' . $res['token'];
    }

    /** PayTR bildiriminin gerçekten PayTR'den geldiğini doğrular. @param array<string, mixed> $post */
    public function verifyCallback(array $post): bool
    {
        $expected = base64_encode(hash_hmac(
            'sha256',
            ($post['merchant_oid'] ?? '') . $this->merchantSalt . ($post['status'] ?? '') . ($post['total_amount'] ?? ''),
            $this->merchantKey,
            true,
        ));
        return hash_equals($expected, (string) ($post['hash'] ?? ''));
    }
}
