<?php

declare(strict_types=1);

// Basit otomatik yükleyici: Lemona\Payment\TestProvider → src/Payment/TestProvider.php
spl_autoload_register(static function (string $class): void {
    $prefix = 'Lemona\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }
    $file = __DIR__ . '/' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
    if (is_file($file)) {
        require $file;
    }
});

if (PHP_VERSION_ID < 80500) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Bu API PHP 8.5 veya üstü gerektirir.'], JSON_UNESCAPED_UNICODE);
    exit;
}

date_default_timezone_set('Europe/Istanbul');
