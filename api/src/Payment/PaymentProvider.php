<?php

declare(strict_types=1);

namespace Lemona\Payment;

/**
 * Sanal POS sağlayıcısı. Kart bilgisi asla bu API'den geçmez: müşteri,
 * start() ile dönen adreste (sağlayıcının kendi sayfasında) öder.
 */
interface PaymentProvider
{
    public function name(): string;

    /**
     * Ödemeyi başlatır, müşterinin gideceği adresi döndürür.
     * @param array<string, mixed> $order orders tablosundaki satır
     * @param list<array<string, mixed>> $items order_items satırları
     */
    public function start(array $order, array $items, string $clientIp): string;
}
