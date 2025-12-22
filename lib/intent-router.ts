// lib/intent-router.ts
import type { ExaCategory, ExaResult, ExaSearchBody, ExaSearchType } from "./exa";
import { safeHttpUrl } from "./exa";

export type Intent = "direct" | "repo" | "docs" | "company" | "problem" | "default";

export type RoutedPlan =
  | { intent: "direct"; reason: string; directUrl: string }
  | {
      intent: Exclude<Intent, "direct">;
      reason: string;
      primary: ExaSearchBody;
      retry?: ExaSearchBody;
    };

// Well-known direct mappings for common queries
const WELL_KNOWN_SITES: Record<string, string> = {
  "hacker news": "https://news.ycombinator.com/",
  "hn": "https://news.ycombinator.com/",
  "hackernews": "https://news.ycombinator.com/",
  "reddit": "https://www.reddit.com/",
  "twitter": "https://twitter.com/",
  "x": "https://x.com/",
  "youtube": "https://www.youtube.com/",
  "google": "https://www.google.com/",
  "facebook": "https://www.facebook.com/",
  "instagram": "https://www.instagram.com/",
  "linkedin": "https://www.linkedin.com/",
  "github": "https://github.com/",
  "stackoverflow": "https://stackoverflow.com/",
  "stack overflow": "https://stackoverflow.com/",
  "npm": "https://www.npmjs.com/",
  "pypi": "https://pypi.org/",
  "crates.io": "https://crates.io/",
  "vercel": "https://vercel.com/",
  "netlify": "https://www.netlify.com/",
  "cloudflare": "https://www.cloudflare.com/",
  "aws": "https://aws.amazon.com/",
  "amazon": "https://www.amazon.com/",
  "notion": "https://www.notion.so/",
  "figma": "https://www.figma.com/",
  "slack": "https://slack.com/",
  "discord": "https://discord.com/",
  "spotify": "https://www.spotify.com/",
  "netflix": "https://www.netflix.com/",
  "openai": "https://openai.com/",
  "anthropic": "https://www.anthropic.com/",
};

function norm(q: string) {
  return q.trim().replace(/\s+/g, " ");
}

function tokenize(q: string) {
  return norm(q).toLowerCase().split(" ").filter(Boolean);
}

function looksLikeUrlish(input: string) {
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

function hasCJK(q: string) {
  return /[\u4e00-\u9fff]/.test(q);
}

function isRepoIntent(qLower: string) {
  return [
    "repo",
    "repository",
    "github",
    "gitlab",
    "source",
    "source code",
    "implementation",
    "library",
    "package",
    "sdk",
    "cli",
    "boilerplate",
    "template",
    "starter",
    "open source",
    "npm",
    "pypi",
    "pip",
    "crate",
    "cargo",
    "gem",
    "composer",
    "仓库",
    "源码",
    "开源",
    "项目",
    "库"
  ].some((k) => qLower.includes(k));
}

function isDocsIntent(qLower: string) {
  return [
    "docs",
    "documentation",
    "api",
    "reference",
    "props",
    "parameters",
    "options",
    "config",
    "routing",
    "router",
    "middleware",
    "margin",
    "padding",
    "border",
    "hook",
    "文档",
    "接口",
    "参考",
    "参数",
    "配置"
  ].some((k) => qLower.includes(k));
}

function isProblemIntent(qLower: string) {
  return [
    "how to",
    "how do i",
    "fix",
    "error",
    "issue",
    "bug",
    "exception",
    "stack trace",
    "not working",
    "doesn't work",
    "fails",
    "crash",
    "解决",
    "报错",
    "异常",
    "怎么",
    "如何",
    "修复",
    "失败"
  ].some((k) => qLower.includes(k));
}

function isShortEntityQuery(tokens: string[]) {
  if (tokens.length === 0) return false;
  if (tokens.length > 3) return false;
  const joined = tokens.join(" ");
  if (/[\/#:@(){}\[\]]/.test(joined)) return false;

  const bad = ["docs", "documentation", "api", "how", "fix", "error", "issue", "repo", "github", "文档", "报错", "仓库"];
  if (tokens.some((t) => bad.includes(t))) return false;

  return true;
}

function mkPrimary(query: string, type: ExaSearchType, category?: ExaCategory): ExaSearchBody {
  return { query, type, category, numResults: 10 };
}

/**
 * 路由策略：尽量不改写原 query，只用 useAutoprompt 做覆盖增强，保持遵循度。
 */
export function routeQuery(raw: string): RoutedPlan {
  const q = norm(raw);
  const qLower = q.toLowerCase();
  const tokens = tokenize(q);
  const cjk = hasCJK(q);

  // Direct URL fast path
  if (looksLikeUrlish(q)) {
    const url = safeHttpUrl(toHttpsUrl(q));
    if (url) return { intent: "direct", reason: "direct-url", directUrl: url };
  }

  // Well-known sites fast path
  const wellKnown = WELL_KNOWN_SITES[qLower];
  if (wellKnown) {
    return { intent: "direct", reason: "well-known-site", directUrl: wellKnown };
  }

  // Repo
  if (isRepoIntent(qLower)) {
    const primary = mkPrimary(q, "auto", "github");
    // retry：用 autoprompt 让 Exa 自动扩展
    const retry: ExaSearchBody = {
      query: cjk ? `${q} GitHub 仓库 源码` : `${q} github repository source code`,
      type: "auto",
      category: "github",
      numResults: 10,
      useAutoprompt: true
    };
    return { intent: "repo", reason: "repo-category-github", primary, retry };
  }

  // Problem solving
  if (isProblemIntent(qLower)) {
    const primary: ExaSearchBody = {
      query: cjk ? `${q} 解决方案` : `${q} solution`,
      type: "auto",
      numResults: 10,
      useAutoprompt: true
    };
    // retry：更宽松的搜索
    const retry: ExaSearchBody = {
      query: cjk ? `${q} 解决 修复` : `${q} fix stackoverflow`,
      type: "auto",
      numResults: 10,
      useAutoprompt: true
    };
    return { intent: "problem", reason: "problem-auto", primary, retry };
  }

  // Docs
  if (isDocsIntent(qLower)) {
    const primary: ExaSearchBody = {
      query: cjk ? `${q} 官方文档` : `${q} official documentation`,
      type: "auto",
      numResults: 10,
      useAutoprompt: true
    };
    const retry: ExaSearchBody = {
      query: cjk ? `${q} API 参考` : `${q} api reference docs`,
      type: "auto",
      numResults: 10,
      useAutoprompt: true
    };
    return { intent: "docs", reason: "docs-auto", primary, retry };
  }

  // Company / product home
  if (isShortEntityQuery(tokens)) {
    const primary = mkPrimary(q, "neural", "company");
    const retry: ExaSearchBody = {
      query: cjk ? `${q} 官网` : `${q} official website`,
      type: "auto",
      numResults: 10,
      useAutoprompt: true
    };
    return { intent: "company", reason: "company-category", primary, retry };
  }

  // Default
  const primary: ExaSearchBody = {
    query: q,
    type: "auto",
    numResults: 10,
    useAutoprompt: true
  };
  const retry: ExaSearchBody = {
    query: cjk ? `${q} 官方` : `${q} official`,
    type: "auto",
    numResults: 10,
    useAutoprompt: true
  };
  return { intent: "default", reason: "default-auto", primary, retry };
}

export function googleLuckyUrl(q: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(q)}&btnI=1`;
}

/**
 * rerank：用 URL 结构"识别落点页"，不靠域名列表。
 * 目标：repo 根、docs 页、问题解答页、公司主页更容易排第一。
 */
export function pickBestUrl(intent: Intent, query: string, results: ExaResult[]): { url: string | null; score: number } {
  if (!results?.length) return { url: null, score: -999 };

  const qTokens = tokenize(query).filter((t) => t.length >= 3);
  const qLower = query.toLowerCase();

  const scored = results
    .map((r) => {
      const u = safeHttpUrl(r.url);
      if (!u) return { url: null, score: -999, r };
      const url = new URL(u);
      const host = url.hostname.replace(/^www\./, "").toLowerCase();
      const path = (url.pathname || "/").toLowerCase();
      const title = (r.title || "").toLowerCase();

      let score = 0;

      // 使用 Exa 返回的 score 作为基础分（如果有的话）
      if (r.score && r.score > 0) {
        score += r.score * 3;
      }

      // Penalize login/auth pages
      if (/\/(login|signin|sign-in|auth)\b/.test(path)) score -= 12;

      // token 覆盖：域名命中更像"官方"
      for (const t of qTokens) {
        if (host.includes(t)) score += 4;
        if (title.includes(t)) score += 2;
        if (path.includes(t)) score += 3;
      }

      // "二手内容"轻惩罚（不是黑名单，只是更不像官方落点）
      if (host.includes("medium.com")) score -= 5;
      if (host.includes("dev.to")) score -= 4;
      if (host.includes("blog.")) score -= 3;
      
      // Prefer official/company domains
      if (host.endsWith(".microsoft.com") || host.endsWith(".google.com") || host.endsWith(".apple.com")) score += 5;
      if (host.endsWith(".azure.com") || host.endsWith(".aws.amazon.com")) score += 4;
      
      // Pricing pages are often what users want
      if (path.includes("/pricing")) score += 6;

      if (intent === "repo") {
        // GitHub / GitLab：强偏好"仓库根路径"
        if (host === "github.com") {
          const seg = path.split("/").filter(Boolean);
          if (seg.length === 2) score += 12; // /owner/repo
          if (seg.length > 2) score -= (seg.length - 2) * 1.5;
          if (/\/(issues|pull|pulls|actions|wiki|releases|blob|tree|compare)\b/.test(path)) score -= 6;
          
          // Prefer well-known organizations
          const owner = seg[0]?.toLowerCase() || "";
          const wellKnownOrgs = ["facebookresearch", "google", "microsoft", "openai", "meta", "facebook", "apple", "amazon", "nvidia", "anthropic", "huggingface"];
          if (wellKnownOrgs.includes(owner)) score += 10;
        } else if (host === "gitlab.com") {
          const seg = path.split("/").filter(Boolean);
          if (seg.length === 2) score += 10;
        }
      }

      if (intent === "docs") {
        if (/\/(docs|documentation|api|reference|references|learn|guide|guides|handbook)\b/.test(path)) score += 14;
        if (/\bdocs\b|\breference\b|\bapi\b/.test(title)) score += 4;
        if (path.includes("/blog")) score -= 3;
        
        // Prefer specific docs pages that match query tokens
        for (const t of qTokens) {
          if (path.includes(t)) score += 4;
          if (title.includes(t)) score += 2;
        }
        
        // Prefer main/overview routing page over api-routes
        const pathLower = path.toLowerCase();
        if (pathLower.endsWith("/routing") || pathLower.endsWith("/routing/")) score += 5;
      }

      if (intent === "company") {
        if (host.includes("wikipedia.org")) score -= 10;
        if (host.includes("crunchbase.com")) score -= 7;
        if (path === "/") score += 10;
        if (/\/(pricing|product|about)\b/.test(path)) score += 2;
      }

      if (intent === "problem") {
        if (host.includes("stackoverflow.com") && path.includes("/questions/")) score += 12;
        if (host === "github.com" && /\/issues\/\d+/.test(path)) score += 10;
        if (/\/(troubleshoot|troubleshooting|faq|errors)\b/.test(path)) score += 6;
        if (/\/(pricing|home|landing)\b/.test(path)) score -= 3;
      }

      if (intent === "default") {
        // 例：hacker news 直达
        if (qLower === "hacker news" || qLower === "hn") {
          if (host === "news.ycombinator.com") score += 25;
        }
      }

      return { url: u, score, r };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  return { url: best?.url ?? null, score: best?.score ?? -999 };
}
