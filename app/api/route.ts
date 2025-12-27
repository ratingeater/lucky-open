// app/api/route.ts
import { NextResponse } from "next/server";
import { exaSearch } from "@/lib/exa";
import { googleLuckyUrl, routeQuery } from "@/lib/intent-router";
import { normalizeAndScreenUrl } from "@/lib/safety";

export const runtime = "edge";

// 按 Exa 原顺序，取第一个安全的 URL
function pickFirstSafe(urls: string[]): string | null {
  for (const u of urls) {
    const safe = normalizeAndScreenUrl(u);
    if (safe) return safe;
  }
  return null;
}

export async function GET(req: Request) {
  const reqUrl = new URL(req.url);
  const q = (reqUrl.searchParams.get("q") || "").trim();
  const debug = reqUrl.searchParams.get("debug") === "1";

  if (!q) {
    return NextResponse.redirect(new URL("/", reqUrl.origin), { status: 302 });
  }

  const plan = routeQuery(q);

  // 直接 URL 跳转
  if (plan.intent === "direct") {
    const safe = normalizeAndScreenUrl(plan.directUrl);
    if (safe) {
      if (debug) return NextResponse.json({ q, intent: "direct", url: safe });
      return NextResponse.redirect(safe, { status: 302 });
    }
    return NextResponse.redirect(googleLuckyUrl(q), { status: 302 });
  }

  // Exa 搜索
  const controller = new AbortController();
  const timeoutMsRaw = process.env.EXA_TIMEOUT_MS;
  const timeoutMs = timeoutMsRaw ? Number(timeoutMsRaw) : 3000;
  const effectiveTimeoutMs = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 3000;
  const timeout = setTimeout(() => controller.abort(), effectiveTimeoutMs);

  try {
    const res = await exaSearch(plan.searchBody, controller.signal);
    const urls = res.results.map((r) => r.url);
    const picked = pickFirstSafe(urls);

    if (debug) {
      return NextResponse.json({
        q,
        intent: "search",
        picked,
        results: res.results.slice(0, 5).map((r) => ({ url: r.url, title: r.title }))
      });
    }

    if (picked) {
      return NextResponse.redirect(picked, { status: 302 });
    }

    return NextResponse.redirect(googleLuckyUrl(q), { status: 302 });
  } catch (err) {
    if (debug) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ q, error: "exa_failed", message, fallback: googleLuckyUrl(q) });
    }
    return NextResponse.redirect(googleLuckyUrl(q), { status: 302 });
  } finally {
    clearTimeout(timeout);
  }
}
