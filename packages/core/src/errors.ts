export class CoreError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "CoreError";
  }
}

export class NotFoundError extends CoreError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`, "NOT_FOUND");
  }
}

export class ValidationError extends CoreError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
  }
}
