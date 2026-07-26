import { NextResponse } from "next/server";

// Logs the full error server-side and returns only a generic message plus a
// correlation id the user can quote when reporting a problem. Never echo
// provider or database error text to the client.
export function apiError(context: string, error: unknown, status = 500) {
  const correlationId = crypto.randomUUID();
  console.error(`[${correlationId}] ${context}:`, error);
  return NextResponse.json(
    {
      error: `Something went wrong on our side. Reference: ${correlationId}`,
      correlationId,
    },
    { status }
  );
}
