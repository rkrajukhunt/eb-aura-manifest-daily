import { API_ERROR_STATUS, type ApiError, type ApiErrorKey } from '@aura/shared';
import { HttpException } from '@nestjs/common';

/**
 * The error envelope from 07 §5, as a throwable.
 *
 * `key` is the stable contract: mobile maps it to in-voice copy (product 14).
 * `message` is developer-facing and never shown to a user — codes and technical
 * strings must not reach the surface (05 §8).
 */
export class ApiException extends HttpException {
  constructor(
    readonly key: ApiErrorKey,
    message: string,
    details?: Record<string, unknown>,
  ) {
    const body: ApiError = {
      error: { key, message, ...(details ? { details } : {}) },
    };
    super(body, API_ERROR_STATUS[key]);
  }

  static unauthorized(message: string): ApiException {
    return new ApiException('unauthorized', message);
  }

  static validationFailed(message: string, details?: Record<string, unknown>): ApiException {
    return new ApiException('validation_failed', message, details);
  }

  static internal(message: string): ApiException {
    return new ApiException('internal', message);
  }
}
