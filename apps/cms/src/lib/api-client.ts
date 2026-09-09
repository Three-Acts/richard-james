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
  let payload: ApiEnvelope<TData>;

  try {
    payload = (await response.json()) as ApiEnvelope<TData>;
  } catch {
    // A non-JSON body means nothing handled the request — usually the API is not
    // running. Report that instead of leaking the JSON parser's own error.
    throw new Error(`The API returned an unreadable response (${response.status}). Check that the API server is running.`);
  }

  if (!response.ok || !payload.ok) {
    const message =
      payload.ok === false ? payload.error.message : "API request failed.";

    throw new Error(message);
  }

  return payload.data;
};
