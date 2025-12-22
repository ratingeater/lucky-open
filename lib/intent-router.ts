// lib/intent-router.ts
import type { ExaSearchBody } from "./exa";

export type Intent = "direct" | "search";

export type RoutedPlan =
  | { intent: "direct"; directUrl: string }
  | { intent: "search"; query: string; searchBody: ExaSearchBody };

function norm(q: string) {
  return q.trim().replace(/\s+/g, " ");
}

function looksLikeUrl(input: string) {
  const s = input.trim();
  if (!s) return false;
  if (/^https?:\/\//i.test(s)) return true;
  if (/^(localhost:\d+|([a-z0-9-]+\.)+[a-z]{2,})(\/.*)?$/i.test(s)) return true;
  return false;
}

function toHttpsUrl(input: string) {
  if (/^https?:\/\//i.test(input)) return input;
  return `https://${input}`;
}

export function routeQuery(raw: string): RoutedPlan {
  const q = norm(raw);

  // 如果看起来像 URL，直接跳转
  if (looksLikeUrl(q)) {
    return { intent: "direct", directUrl: toHttpsUrl(q) };
  }

  // 否则交给 Exa，完全信任其 auto 排序
  return {
    intent: "search",
    query: q,
    searchBody: { query: q, type: "auto", numResults: 10 }
  };
}

export function googleLuckyUrl(q: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(q)}&btnI=1`;
}
