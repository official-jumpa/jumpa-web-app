import type { ZodError } from "zod";

export interface ValidationErrorResponse {
  error: string;
  field?: string;
}

/**
 * Converts a ZodError into a human-readable single error message and target field.
 */
export function formatZodError(error: ZodError): ValidationErrorResponse {
  const firstIssue = error.issues?.[0];
  if (!firstIssue) {
    return { error: "Validation failed" };
  }

  const field = firstIssue.path.length > 0 ? firstIssue.path.join(".") : undefined;
  return {
    error: firstIssue.message,
    ...(field ? { field } : {}),
  };
}
