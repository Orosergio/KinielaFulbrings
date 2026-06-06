export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "REQUEST_FAILED",
  ) {
    super(message);
  }
}

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}

export function handleError(error: unknown) {
  console.error(error);

  if (error instanceof HttpError) {
    return json({ error: error.message, code: error.code }, error.status);
  }

  const databaseError = error as { code?: string; message?: string };
  if (databaseError?.message?.includes("PREDICTION_LOCKED")) {
    return json(
      {
        error: "El partido ya comenzó. La predicción quedó bloqueada.",
        code: "PREDICTION_LOCKED",
      },
      409,
    );
  }

  if (databaseError?.code === "23505") {
    return json(
      { error: "Ese registro ya existe.", code: "CONFLICT" },
      409,
    );
  }

  return json(
    { error: "No se pudo completar la solicitud.", code: "INTERNAL_ERROR" },
    500,
  );
}
