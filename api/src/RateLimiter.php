<?php

declare(strict_types=1);

namespace Lemona;

/** Aynı IP'den belli sürede en fazla N istek. IP açık değil, hash'i tutulur. */
final readonly class RateLimiter
{
    public function __construct(private Db $db, private string $secret) {}

    public function ipHash(string $ip): string
    {
        return hash_hmac('sha256', $ip, $this->secret);
    }

    public function hit(string $action, string $ip, int $max, int $windowSeconds): void
    {
        $bucket = $action . ':' . substr($this->ipHash($ip), 0, 40);
        $now = time();
        $windowStart = $now - ($now % $windowSeconds);
        // MySQL ve MariaDB'de aynı çalışsın diye iki basit sorgu
        $this->db->run('INSERT IGNORE INTO rate_limits (bucket, window_start, hits) VALUES (?, ?, 0)', [$bucket, $windowStart]);
        $this->db->run(
            'UPDATE rate_limits SET hits = IF(window_start = ?, hits + 1, 1), window_start = ? WHERE bucket = ?',
            [$windowStart, $windowStart, $bucket],
        );
        $hits = (int) $this->db->one('SELECT hits FROM rate_limits WHERE bucket = ?', [$bucket])['hits'];
        if ($hits > $max) {
            throw new ApiError('Çok fazla deneme yaptın. Birkaç dakika sonra tekrar dene.', 429);
        }
    }
}
