/**
 * クライアントコンポーネントから `app/api/**` の Route Handler を呼び出すための
 * 薄い fetch ラッパー。失敗時（レスポンスが non-OK）はサーバーの `error` メッセージで
 * Error を throw するのみで、リトライやロールバックは呼び出し側に委ねる。
 *
 * `lib/api/workspace-client.ts`・`lib/api/members-client.ts` の双方から使う共通処理
 * のため、ここに切り出している。
 */

export async function apiFetch<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    const message = await res
      .json()
      .then((body: unknown) =>
        typeof body === "object" && body !== null && "error" in body
          ? String((body as { error: unknown }).error)
          : null,
      )
      .catch(() => null);
    throw new Error(
      message ?? `APIリクエストに失敗しました (status: ${res.status})`,
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
