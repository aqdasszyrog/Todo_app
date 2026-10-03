// Supabase errors don't serialise well (they log as `{}`), so pull out the
// fields that explain what went wrong.
export function logError(context: string, error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const { message, code, details, hint } = error as {
      message: string;
      code?: string;
      details?: string | null;
      hint?: string | null;
    };
    console.error(`${context}: ${message}`, { code, details, hint });
  } else {
    console.error(context, error);
  }
}
