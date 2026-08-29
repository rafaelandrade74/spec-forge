export function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

export function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}

export async function safeJson(fn: () => Promise<unknown>) {
  try {
    return json(await fn());
  } catch (err) {
    return errorResult(err instanceof Error ? err.message : String(err));
  }
}
