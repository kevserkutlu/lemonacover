<?php

declare(strict_types=1);

namespace Lemona;

/** İstek okuma ve JSON yanıt yardımcıları. */
final class Http
{
    private const int MAX_JSON_BYTES = 64 * 1024;

    public static function method(): string
    {
        return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    }

    /** /api/siparis/LC-123 → /siparis/LC-123 (API bir alt klasörde de çalışabilir) */
    public static function path(): string
    {
        $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
        $base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
        if ($base !== '' && str_starts_with($uri, $base)) {
            $uri = substr($uri, strlen($base));
        }
        return '/' . trim(rawurldecode($uri), '/');
    }

    /** @return array<string, mixed> */
    public static function json(): array
    {
        $raw = file_get_contents('php://input', length: self::MAX_JSON_BYTES + 1);
        if ($raw === false || strlen($raw) > self::MAX_JSON_BYTES) {
            throw new ApiError('İstek çok büyük.', 413);
        }
        if ($raw === '') {
            return [];
        }
        try {
            $data = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new ApiError('Geçersiz istek.', 400);
        }
        return is_array($data) ? $data : throw new ApiError('Geçersiz istek.', 400);
    }

    public static function header(string $name): string
    {
        $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        return (string) ($_SERVER[$key] ?? '');
    }

    public static function clientIp(): string
    {
        // Paylaşımlı hostinglerde/Cloudflare arkasında gerçek IP bu başlıklarda olabilir.
        foreach (['HTTP_CF_CONNECTING_IP', 'HTTP_X_REAL_IP', 'REMOTE_ADDR'] as $k) {
            $ip = trim(explode(',', (string) ($_SERVER[$k] ?? ''))[0]);
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }
        return '0.0.0.0';
    }

    /** @param array<mixed>|object $data */
    public static function send(array|object $data, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        exit;
    }

    public static function text(string $body, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: text/plain; charset=utf-8');
        echo $body;
        exit;
    }

    /** Sitenin başka bir adresten API'yi çağırabilmesi için CORS başlıkları */
    public static function cors(Config $config): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $allowed = (array) $config->get('allowed_origins', []);
        if ($origin !== '' && in_array($origin, $allowed, true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Vary: Origin');
            header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, Authorization');
            header('Access-Control-Max-Age: 600');
        }
        if (self::method() === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }
}
