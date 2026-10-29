import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";

const DEFAULT_TIMEOUT_MS = 10000;

function signIngressRequest(secret: string, data: { ip: string; method: string; target: string; body: Buffer }) {
  const timestamp = String(Date.now());
  const nonce = randomBytes(16).toString("hex");
  const bodyHash = createHash("sha256").update(data.body).digest("hex");
  const signature = createHmac("sha256", secret).update(["segaloka-ingress-v3", timestamp, nonce, data.ip, data.method, data.target, bodyHash].join("\n")).digest("hex");
  return { "x-segaloka-client-ip": data.ip, "x-segaloka-client-time": timestamp, "x-segaloka-client-nonce": nonce, "x-segaloka-client-body-sha256": bodyHash, "x-segaloka-client-signature": signature };
}

function getApiBaseUrl(): URL {
  const value = process.env.SEGALOKA_API_BASE_URL;

  if (!value) {
    throw new Error("SEGALOKA_API_BASE_URL_NOT_CONFIGURED");
  }

  const url = new URL(value);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("SEGALOKA_API_URL_INVALID");
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new Error("SEGALOKA_API_URL_INVALID");
  }

  return url;
}

function getOriginAuthSecret(): string {
  const secret = process.env.SEGALOKA_ORIGIN_AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("SEGALOKA_ORIGIN_AUTH_SECRET_NOT_CONFIGURED");
  }

  return secret;
}

export async function segalokaApiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("SEGALOKA_API_PATH_INVALID");
  }

  const baseUrl = getApiBaseUrl();
  const url = new URL(path, baseUrl);

  if (url.origin !== baseUrl.origin) {
    throw new Error("SEGALOKA_API_ORIGIN_MISMATCH");
  }

  const headers = new Headers(init.headers);

  headers.delete("x-segaloka-origin-auth");
  headers.delete("cf-connecting-ip");
  const body = init.body === undefined ? Buffer.alloc(0) : Buffer.from(String(init.body));
  const signed = signIngressRequest(getOriginAuthSecret(), { ip: "127.0.0.1", method: String(init.method || "GET").toUpperCase(), target: url.pathname + url.search, body });
  Object.entries(signed).forEach(([key, value]) => headers.set(key, value));

  const response = await fetch(url, {
    ...init,
    body: init.method && init.method.toUpperCase() === "GET" ? undefined : init.body,
    headers,
    cache: init.cache ?? "no-store",
    signal: init.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    redirect: "manual",
  });

  if (!response.ok) {
    throw new Error(`SEGALOKA_API_HTTP_${response.status}`);
  }

  return (await response.json()) as T;
}
