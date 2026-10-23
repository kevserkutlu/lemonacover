<?php

declare(strict_types=1);

namespace Lemona\Payment;

/**
 * Test ödemesi: sitedeki /odeme/test sayfasına yönlendirir, orada
 * "Test ödemesini onayla" denince POST /odeme/test ile sipariş ödenmiş sayılır.
 * Para çekilmez. Canlıya geçmeden önce config.php'de provider değiştirilmeli.
 */
final readonly class TestProvider implements PaymentProvider
{
    public function __construct(private string $siteUrl) {}

    public function name(): string
    {
        return 'test';
    }

    public function start(array $order, array $items, string $clientIp): string
    {
        return rtrim($this->siteUrl, '/') . '/odeme/test/?siparis=' . rawurlencode($order['order_no']);
    }
}
