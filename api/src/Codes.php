<?php

declare(strict_types=1);

namespace Lemona;

/**
 * Müşterinin okuyup yazacağı kodlar: sadece rakam (O/0, I/1 karışıklığı yok,
 * telefonda rakam klavyesiyle yazılır).
 *   Sipariş no:  LC-48213   (5 rakam)
 *   İstek kodu:  482 913    (6 rakam, 3'erli gösterilir)
 *   Yorum kodu:  482 913    (6 rakam, teşekkür kartına elle yazılır)
 * Girişte boşluk, tire ve harfler yok sayılır.
 */
final class Codes
{
    public static function digits(int $length): string
    {
        $out = '';
        for ($i = 0; $i < $length; $i++) {
            $out .= (string) random_int(0, 9);
        }
        return $out;
    }

    public static function onlyDigits(string $code): string
    {
        return preg_replace('/\D/', '', $code);
    }

    /** 482913 → "482 913" */
    public static function group(string $code): string
    {
        return trim(chunk_split($code, 3, ' '));
    }
}
