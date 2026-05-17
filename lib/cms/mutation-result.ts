export const CMS_MUTATION_ERROR_CODES = [
  "UNAUTHORIZED",
  "VALIDATION_ERROR",
  "CONFLICT",
  "NOT_FOUND",
  "DB_ERROR",
  "UNKNOWN_ERROR",
] as const;

export type CmsMutationErrorCode = (typeof CMS_MUTATION_ERROR_CODES)[number];

export type CmsMutationSuccess<TData = void> = {
  ok: true;
  code: "OK";
  message: string;
  data: TData;
};

export type CmsMutationFailure = {
  ok: false;
  code: CmsMutationErrorCode;
  message: string;
};

export type CmsMutationResult<TData = void> =
  | CmsMutationSuccess<TData>
  | CmsMutationFailure;

export function cmsMutationSuccess<TData>(
  data: TData,
  message = "Saved.",
): CmsMutationSuccess<TData> {
  return { ok: true, code: "OK", message, data };
}

export function cmsMutationFailure(
  code: CmsMutationErrorCode,
  message: string,
): CmsMutationFailure {
  return { ok: false, code, message };
}

export function normalizeMutationError(error: unknown): CmsMutationFailure {
  if (isUnauthorizedError(error)) {
    return cmsMutationFailure("UNAUTHORIZED", "You are not authorized.");
  }

  if (isValidationError(error)) {
    return cmsMutationFailure("VALIDATION_ERROR", "Invalid input.");
  }

  if (isConflictError(error)) {
    return cmsMutationFailure("CONFLICT", "A conflicting change exists.");
  }

  if (isNotFoundError(error)) {
    return cmsMutationFailure("NOT_FOUND", "The target record was not found.");
  }

  if (isDbError(error)) {
    return cmsMutationFailure("DB_ERROR", "Unable to save changes right now.");
  }

  return cmsMutationFailure("UNKNOWN_ERROR", "Unexpected error. Please retry.");
}

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasStringMessage(value: unknown): value is { message: string } {
  return isObjectLike(value) && typeof value.message === "string";
}

function isUnauthorizedError(error: unknown) {
  if (!hasStringMessage(error)) return false;
  return /unauthorized|forbidden/i.test(error.message);
}

function isValidationError(error: unknown) {
  if (!hasStringMessage(error)) return false;
  return /validation|invalid/i.test(error.message);
}

function isConflictError(error: unknown) {
  if (!hasStringMessage(error)) return false;
  return /conflict|duplicate|unique/i.test(error.message);
}

function isNotFoundError(error: unknown) {
  if (!hasStringMessage(error)) return false;
  return /not found|missing/i.test(error.message);
}

function isDbError(error: unknown) {
  if (!isObjectLike(error)) return false;
  return (
    typeof error.code === "string" ||
    (typeof error.name === "string" && /drizzle|postgres/i.test(error.name))
  );
}
