// lib/exa.ts
import "server-only";

export type ExaSearchType = "neural" | "keyword" | "auto";
export type ExaCategory =
  | "company"
  | "research paper"
  | "news"
  | "pdf"
  | "github"
  | "tweet"
  | "personal site"
  | "financial report"
  | "people";

export type ExaSearchBody = {
  query: string;
  type?: ExaSearchType;
  category?: ExaCategory;
  numResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  useAutoprompt?: boolean;
};

export type ExaResult = {
  url: string;
  title?: string;
  id?: string;
  publishedDate?: string | null;
  author?: string | null;
  score?: number;
};

export type ExaSearchResponse = {
  requestId?: string;
  autopromptString?: string;
  results: ExaResult[];
};

type ExaAuthMode = "x-api-key" | "bearer" | "both";

function env(name: string): string | undefined {
  const v = process.env[name];
  if (!v) return undefined;
  const trimmed = v.trim();
  return trimmed ? trimmed : undefined;
}

function getExaAuthMode(): ExaAuthMode {
  const v = (env("EXA_AUTH_MODE") || "x-api-key").toLowerCase();
  if (v === "x-api-key" || v === "bearer" || v === "both") return v;
  throw new Error(`Invalid EXA_AUTH_MODE: ${v}`);
}

function getExaSearchEndpoint(): string {
  const explicit = env("EXA_SEARCH_ENDPOINT");
  if (explicit) {
    const u = new URL(explicit);
    if (u.protocol !== "https:" && u.protocol !== "http:") {
      throw new Error("EXA_SEARCH_ENDPOINT must be http(s)");
    }
    return u.toString();
  }

  const base = env("EXA_API_BASE_URL") || "https://api.exa.ai";
  const u = new URL(base);
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    throw new Error("EXA_API_BASE_URL must be http(s)");
  }
  return new URL("/search", u).toString();
}

function buildExaAuthHeaders(apiKey: string): Record<string, string> {
  const mode = getExaAuthMode();
  if (mode === "x-api-key") return { "x-api-key": apiKey };
  if (mode === "bearer") return { authorization: `Bearer ${apiKey}` };
  return { "x-api-key": apiKey, authorization: `Bearer ${apiKey}` };
}

export async function exaSearch(body: ExaSearchBody, signal?: AbortSignal): Promise<ExaSearchResponse> {
  const apiKey = env("EXA_API_KEY");
  if (!apiKey) throw new Error("Missing EXA_API_KEY");

  const endpoint = getExaSearchEndpoint();
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      ...buildExaAuthHeaders(apiKey)
    },
    body: JSON.stringify({
      numResults: 10,
      ...body
    }),
    cache: "no-store",
    signal
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Exa error ${res.status}: ${t.slice(0, 300)}`);
  }

  return (await res.json()) as ExaSearchResponse;
}

export function safeHttpUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
    return null;
  } catch {
    return null;
  }
}
