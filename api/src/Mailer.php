<?php

declare(strict_types=1);

namespace Lemona;

/**
 * Sipariş e-postaları. Paylaşımlı hostinglerde PHP mail() genelde hazır çalışır.
 * config.php'de mail.enabled = false iken gönderilmez, storage/logs/mail.log'a yazılır.
 */
final readonly class Mailer
{
    public function __construct(private Config $config, private string $logDir) {}

    /** @param array<string, mixed> $order @param list<array<string, mixed>> $items */
    public function orderPaid(array $order, array $items): void
    {
        $lines = implode("\n", array_map(
            static fn (array $i): string => sprintf(
                "• %s × %d — %s TL\n  %s",
                $i['product_name'],
                $i['qty'],
                number_format($i['unit_price_kurus'] * $i['qty'] / 100, 0, ',', '.'),
                implode(', ', json_decode($i['details_json'], true)),
            ),
            $items,
        ));
        $total = number_format($order['total_kurus'] / 100, 0, ',', '.');
        $site = rtrim($this->config->string('site_url'), '/');

        $this->send(
            $order['email'],
            "Siparişini aldım ({$order['order_no']})",
            "Merhaba {$order['customer_name']},\n\n"
            . "Siparişin için teşekkürler! Kılıfını 2–4 iş günü içinde dikip kargoya vereceğim.\n\n"
            . "Sipariş no: {$order['order_no']}\n$lines\nToplam: $total TL\n\n"
            . "Siparişinin durumuna sipariş numaran ve telefonunun son 4 hanesiyle bakabilirsin:\n$site/siparis-takip/\n\n"
            . "lemona cover",
        );

        $seller = $this->config->string('mail.seller');
        if ($seller !== '') {
            $this->send(
                $seller,
                "Yeni sipariş: {$order['order_no']} — $total TL",
                "{$order['customer_name']} ({$order['district']} / {$order['city']})\n\n$lines\n\n"
                . "Ayrıntılar: $site/yonetim/?siparis={$order['order_no']}",
            );
        }
    }

    /** @param array<string, mixed> $order */
    public function shipped(array $order, string $reviewCode): void
    {
        $site = rtrim($this->config->string('site_url'), '/');
        $this->send(
            $order['email'],
            "Kılıfını kargoya verdim ({$order['order_no']})",
            "Merhaba {$order['customer_name']},\n\nKılıfın yola çıktı!\n"
            . ($order['carrier'] ? "Kargo: {$order['carrier']}\n" : '')
            . ($order['tracking_code'] ? "Takip no: {$order['tracking_code']}\n" : '')
            . "\nSiparişin: $site/siparis-takip/\n\n"
            . "Kılıfın eline ulaşınca nasıl bulduğunu yazarsan çok sevinirim, istersen fotoğraf da ekleyebilirsin:\n"
            . "$site/yorum/?kod=$reviewCode\n(Yorum kodun: " . Codes::group($reviewCode) . " — teşekkür kartında da yazıyor.)\n\n"
            . "Güzel günlerde kullanman dileğiyle,\nlemona cover",
        );
    }

    /* ---------- özel istekler ---------- */

    /** @param array<string, mixed> $r */
    public function requestReceived(array $r): void
    {
        $site = rtrim($this->config->string('site_url'), '/');
        $this->send(
            $r['email'],
            "İsteğini aldım (istek kodu " . Codes::group($r['code']) . ")",
            "Merhaba {$r['customer_name']},\n\n"
            . "{$r['agenda_name']} için kılıf isteğini aldım. Ajandanı inceleyip en kısa sürede sana döneceğim.\n\n"
            . "İstek kodun: " . Codes::group($r['code']) . "\nDurumuna buradan bakabilirsin: $site/istek/?kod={$r['code']}\n\n"
            . "(E-postam gelmezse spam klasörüne de bakmayı unutma.)\n\nlemona cover",
        );
        $seller = $this->config->string('mail.seller');
        if ($seller !== '') {
            $this->send(
                $seller,
                "Yeni özel istek: {$r['agenda_name']}",
                "{$r['customer_name']} ({$r['email']}" . ($r['phone'] ? ", {$r['phone']}" : '') . ")\n"
                . "Kılıf: " . ($r['kilif'] === 'simli' ? 'Simli' : 'Şeffaf') . "\n"
                . ($r['note'] ? "Not: {$r['note']}\n" : '')
                . "\nBakmak için: $site/yonetim/?bolum=istekler",
            );
        }
    }

    /** @param array<string, mixed> $r */
    public function requestDecided(array $r): void
    {
        $site = rtrim($this->config->string('site_url'), '/');
        $note = $r['reply'] ? "\n{$r['reply']}\n" : '';
        if ($r['status'] === 'onaylandi') {
            $price = number_format($r['price_kurus'] / 100, 0, ',', '.');
            $this->send(
                $r['email'],
                "Kılıfını dikebilirim! (istek kodu " . Codes::group($r['code']) . ")",
                "Merhaba {$r['customer_name']},\n\n"
                . "{$r['agenda_name']} için kılıf dikebilirim.\n$note\n"
                . "Fiyatı: $price TL (kargo ayrıca eklenir)\n\n"
                . "Siparişini buradan tamamlayabilirsin:\n$site/istek/?kod={$r['code']}\n\nlemona cover",
            );
        } else {
            $this->send(
                $r['email'],
                "Kılıf isteğin hakkında (istek kodu " . Codes::group($r['code']) . ")",
                "Merhaba {$r['customer_name']},\n\n"
                . "{$r['agenda_name']} için kılıf isteğine baktım; maalesef bu ajandaya kılıf dikemiyorum.\n$note\n"
                . "İlgin için çok teşekkür ederim. Sitedeki diğer kılıflara göz atabilirsin: $site\n\nlemona cover",
            );
        }
    }

    private function send(string $to, string $subject, string $body): void
    {
        $from = $this->config->string('mail.from');
        if (!$this->config->bool('mail.enabled')) {
            if (!is_dir($this->logDir)) @mkdir($this->logDir, 0750, true);
            file_put_contents(
                $this->logDir . '/mail.log',
                sprintf("[%s] Kime: %s\nKonu: %s\n%s\n\n", date('c'), $to, $subject, $body),
                FILE_APPEND,
            );
            return;
        }
        $headers = implode("\r\n", [
            "From: lemona cover <$from>",
            "Reply-To: {$this->config->string('mail.seller', $from)}",
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
        ]);
        $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
        if (!@mail($to, $encodedSubject, $body, $headers)) {
            error_log("E-posta gönderilemedi: $to / $subject");
        }
    }
}
