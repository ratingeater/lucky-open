"use client";

import { useState } from "react";
import BrowserSetupModal from "@/components/ui/browser-setup-modal";

const CHIPS = [
  "hacker news",
  "github segmentanything",
  "bing web search pricing",
  "tailwind border",
  "a repo which generate random seed",
  "nextjs routing",
  "怎么修复 nextjs middleware 重定向循环",
  "tailwind margin"
];

export default function Page() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  function go(query: string) {
    const v = query.trim();
    if (!v) return;
    window.location.href = `/api?q=${encodeURIComponent(v)}`;
  }

  return (
    <div className="min-h-screen bg-gray-200 text-gray-900">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16">
        <div className="w-full">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-semibold tracking-tight">Quick Open</h1>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-sm font-medium text-gray-700 underline-offset-4 hover:underline"
            >
              Setup your browser
            </button>
          </div>

          <div className="rounded-2xl border border-gray-300 bg-white shadow-sm">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") go(q);
              }}
              placeholder="Search quick open…"
              className="w-full rounded-2xl bg-transparent px-5 py-4 text-lg outline-none placeholder:text-gray-400"
              spellCheck={false}
              inputMode="search"
            />
          </div>

          <div className="mt-6">
            <div className="text-sm text-gray-700">Try some keywords:</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {CHIPS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setQ(c);
                    go(c);
                  }}
                  className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 shadow-sm hover:bg-gray-50"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-10 text-xs text-gray-600">
            Press Enter to jump instantly. If Exa fails, it falls back to Google &quot;I&apos;m Feeling Lucky&quot;.
          </div>
        </div>
      </div>

      <BrowserSetupModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
