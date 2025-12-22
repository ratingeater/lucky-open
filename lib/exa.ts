// lib/exa.ts
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

const EXA_SEARCH_ENDPOINT = "https://api.exa.ai/search";

export async function exaSearch(body: ExaSearchBody, signal?: AbortSignal): Promise<ExaSearchResponse> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) throw new Error("Missing EXA_API_KEY");

  const res = await fetch(EXA_SEARCH_ENDPOINT, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-api-key": apiKey
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
