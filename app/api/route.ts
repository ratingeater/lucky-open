// app/api/route.ts
import { NextResponse } from "next/server";
import { exaSearch } from "@/lib/exa";
import { googleLuckyUrl, pickBestUrl, routeQuery } from "@/lib/intent-router";

export const runtime = "edge";

export async function GET(req: Request) {
  const reqUrl = new URL(req.url);
  const q = (reqUrl.searchParams.get("q") || "").trim();
  const debug = reqUrl.searchParams.get("debug") === "1";

  if (!q) return NextResponse.redirect(new URL("/", reqUrl.origin), { status: 302 });

  const plan = routeQuery(q);

  // direct fast-path
  if (plan.intent === "direct") {
    if (debug) {
      return NextResponse.json({ intent: "direct", url: plan.directUrl });
    }
    return NextResponse.redirect(plan.directUrl, { status: 302 });
  }

  // 预算控制：平均 5s 内
  // Phase 1: ~3000ms，Phase 2: ~2500ms（只在必要时触发）
  const phase1 = new AbortController();
  const t1 = setTimeout(() => phase1.abort(), 3000);

  try {
    const res1 = await exaSearch(plan.primary, phase1.signal);
    const best1 = pickBestUrl(plan.intent, q, res1.results);

    if (debug) {
      return NextResponse.json({
        intent: plan.intent,
        reason: plan.reason,
        phase: 1,
        best: best1,
        results: res1.results.slice(0, 5).map((r) => ({
          url: r.url,
          title: r.title,
          score: r.score
        }))
      });
    }

    if (best1.url && best1.score >= 10) {
      return NextResponse.redirect(best1.url, { status: 302 });
    }

    // 若没有 retry 或者 phase1 就已经很好（score不够但仍有url），继续 phase2 尝试提升
    if (!plan.retry) {
      if (best1.url) return NextResponse.redirect(best1.url, { status: 302 });
      return NextResponse.redirect(googleLuckyUrl(q), { status: 302 });
    }

    // Phase 2
    const phase2 = new AbortController();
    const t2 = setTimeout(() => phase2.abort(), 2500);

    try {
      const res2 = await exaSearch(plan.retry, phase2.signal);
      const best2 = pickBestUrl(plan.intent, q, res2.results);

      if (best2.url) return NextResponse.redirect(best2.url, { status: 302 });
      if (best1.url) return NextResponse.redirect(best1.url, { status: 302 });
      return NextResponse.redirect(googleLuckyUrl(q), { status: 302 });
    } finally {
      clearTimeout(t2);
    }
  } catch (e) {
    // Exa 失败/超时兜底
    if (debug) {
      return NextResponse.json({ error: String(e), fallback: googleLuckyUrl(q) });
    }
    return NextResponse.redirect(googleLuckyUrl(q), { status: 302 });
  } finally {
    clearTimeout(t1);
  }
}
