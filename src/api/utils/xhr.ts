// Thin fetch-shaped wrapper around XMLHttpRequest, needed because RN's real
// fetch() silently drops the Cookie header (it's a spec-forbidden header
// name) — confirmed against react-native issue #13452. XHR does not enforce
// that restriction, so it's the only reliable way to send a manual Cookie
// header from RN.

interface XhrResponse {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
  headers: {
    get: (name: string) => string | null;
  };
}

export function xhrRequest(
  url: string,
  opts: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {},
): Promise<XhrResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open(opts.method ?? "GET", url, true);

    for (const [key, value] of Object.entries(opts.headers ?? {})) {
      xhr.setRequestHeader(key, value);
    }

    xhr.onload = () => {
      const rawHeaders = xhr.getAllResponseHeaders();

      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        text: () => Promise.resolve(xhr.responseText),
        headers: {
          get: (name: string) => {
            const target = name.toLowerCase();

            const line = rawHeaders.split(/\r?\n/).find((line) => {
              const separator = line.indexOf(":");
              if (separator === -1) return false;

              return line.slice(0, separator).trim().toLowerCase() === target;
            });

            if (!line) return null;

            return line.slice(line.indexOf(":") + 1).trim();
          },
        },
      });
    };

    xhr.onerror = () => {
      reject(new Error("Network request failed"));
    };

    xhr.ontimeout = () => {
      reject(new Error("Network request timed out"));
    };

    xhr.send(opts.body);
  });
}
