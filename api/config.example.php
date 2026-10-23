<?php
// Bu dosyayı config.php adıyla kopyala ve değerleri doldur.
// config.php gizli bilgiler içerir: repoya girmez, sunucuda public/ dışında durur.
// Rastgele anahtar üretmek için:  php -r 'echo bin2hex(random_bytes(32)), PHP_EOL;'

return [
    'debug' => false, // true: hatanın ayrıntısı yanıtta görünür (sadece kendi bilgisayarında)

    'db' => [
        'dsn'  => 'mysql:host=127.0.0.1;port=3306;dbname=lemonacover;charset=utf8mb4',
        'user' => 'lemona',
        'pass' => 'BURAYA-VERITABANI-SIFRESI',
    ],

    // Sitenin adresi: ödeme sonrası müşteri buraya döner
    'site_url' => 'https://lemonacover.com',

    // Bu adreslerdeki site API'yi tarayıcıdan çağırabilir (CORS)
    'allowed_origins' => [
        'https://lemonacover.com',
        'https://www.lemonacover.com',
    ],

    // İmza ve IP gizleme için gizli anahtar (64 karakter)
    'app_secret' => 'BURAYA-RASTGELE-64-KARAKTER',

    // Yönetim sayfasının (/yonetim) şifresi gibi düşün: uzun ve rastgele olsun
    'admin_token' => 'BURAYA-RASTGELE-64-KARAKTER',

    'payment' => [
        // 'test'  → ödeme taklit edilir, para çekilmez
        // 'paytr' → PayTR iFrame API (aşağıdaki bilgiler PayTR mağaza panelinde)
        'provider' => 'test',
        'paytr' => [
            'merchant_id'   => '',
            'merchant_key'  => '',
            'merchant_salt' => '',
            'test_mode'     => 1, // canlıya geçerken 0
        ],
    ],

    'mail' => [
        // false iken e-postalar gönderilmez, storage/logs/mail.log dosyasına yazılır
        'enabled' => false,
        'from'    => 'siparis@lemonacover.com',
        'seller'  => 'merhaba@lemonacover.com', // yeni sipariş bildirimi buraya gelir
    ],

    'storage_path' => __DIR__ . '/storage',
];
