<?php

declare(strict_types=1);

namespace Lemona;

enum OrderStatus: string
{
    case AwaitingPayment = 'odeme-bekleniyor';
    case Preparing = 'hazirlaniyor';
    case Shipped = 'kargoda';
    case Delivered = 'teslim-edildi';
    case Cancelled = 'iptal';

    public function label(): string
    {
        return match ($this) {
            self::AwaitingPayment => 'Ödeme bekleniyor',
            self::Preparing => 'Dikiliyor',
            self::Shipped => 'Kargoda',
            self::Delivered => 'Teslim edildi',
            self::Cancelled => 'İptal edildi',
        };
    }
}
