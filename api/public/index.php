<?php

declare(strict_types=1);

// lemona cover API — tek giriş noktası. Web sunucusu bütün istekleri buraya yönlendirir.

require dirname(__DIR__) . '/src/bootstrap.php';

use Lemona\ApiError;
use Lemona\App;
use Lemona\Config;
use Lemona\Http;

// PHP'nin yerleşik sunucusunda (php -S) gerçek dosyaları olduğu gibi ver
if (PHP_SAPI === 'cli-server' && is_file(__DIR__ . parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH))) {
    return false;
}

$config = null;
try {
    $config = Config::load(dirname(__DIR__) . '/config.php');
    Http::cors($config);
    new App($config)->handle(Http::method(), Http::path());
} catch (ApiError $e) {
    Http::send(
        $e->fieldErrors !== [] ? ['error' => $e->getMessage(), 'errors' => $e->fieldErrors] : ['error' => $e->getMessage()],
        $e->status,
    );
} catch (\Throwable $e) {
    error_log('[lemona-api] ' . $e);
    $debug = $config?->bool('debug') ?? false;
    Http::send(
        ['error' => 'Sunucuda bir sorun oldu, birkaç dakika sonra tekrar dene.'] + ($debug ? ['debug' => $e->getMessage()] : []),
        500,
    );
}
