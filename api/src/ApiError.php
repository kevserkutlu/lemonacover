<?php

declare(strict_types=1);

namespace Lemona;

/** Kullanıcıya gösterilebilecek hata: { error } ya da { errors: { alan: mesaj } } */
final class ApiError extends \RuntimeException
{
    /** @param array<string, string> $fieldErrors */
    public function __construct(
        string $message,
        public readonly int $status = 422,
        public readonly array $fieldErrors = [],
    ) {
        parent::__construct($message);
    }

    public static function notFound(string $message = 'Bulunamadı.'): self
    {
        return new self($message, 404);
    }

    /** @param array<string, string> $fieldErrors */
    public static function fields(array $fieldErrors): self
    {
        return new self('Bilgileri kontrol et.', 422, $fieldErrors);
    }
}
