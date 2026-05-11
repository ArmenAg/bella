/**
 * Typed error classes thrown by services and actions so that the
 * action result mapper can deterministically convert them to ErrorCode
 * branches without relying on substring matching against error.message.
 *
 * Each class extends Error and sets its own `name` so server-side logs
 * make the error category obvious. The default message matches the
 * class name when none is provided.
 */

export class AuthenticationRequiredError extends Error {
  constructor(message: string = "AuthenticationRequiredError") {
    super(message);
    this.name = "AuthenticationRequiredError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = "ForbiddenError") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string = "NotFoundError") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  constructor(message: string = "ConflictError") {
    super(message);
    this.name = "ConflictError";
  }
}

export class UnsupportedMediaTypeError extends Error {
  constructor(message: string = "UnsupportedMediaTypeError") {
    super(message);
    this.name = "UnsupportedMediaTypeError";
  }
}

export class PayloadTooLargeError extends Error {
  constructor(message: string = "PayloadTooLargeError") {
    super(message);
    this.name = "PayloadTooLargeError";
  }
}
