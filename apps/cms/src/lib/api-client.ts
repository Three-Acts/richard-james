export type ApiEnvelope<TData> =
  | {
      ok: true;
      data: TData;
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
      };
    };

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const apiBaseUrl = trimTrailingSlash(
  import.meta.env.VITE_API_URL ?? "/api"
);

export const apiUrl = (path: `/${string}`) => `${apiBaseUrl}${path}`;

export const apiFetch = async <TData>(
  path: `/${string}`,
  init?: RequestInit
) => {
  const response = await fetch(apiUrl(path), {
    headers: {
      Accept: "application/json",
      ...init?.headers
    },
    ...init
  });
  const payload = (await response.json()) as ApiEnvelope<TData>;

  if (!response.ok || !payload.ok) {
    const message =
      payload.ok === false ? payload.error.message : "API request failed.";

    throw new Error(message);
  }

  return payload.data;
};
