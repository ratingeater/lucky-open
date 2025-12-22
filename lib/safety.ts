// lib/safety.ts
import { safeHttpUrl } from "./exa";

function isProbablyIpHost(host: string) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host.includes(":");
}

function hasCredentials(u: URL) {
  return !!u.username || !!u.password;
}

function isPunycode(host: string) {
  const h = host.toLowerCase();
  return h.startsWith("xn--") || h.includes(".xn--");
}

export function normalizeAndScreenUrl(input: string): string | null {
  const safe = safeHttpUrl(input);
  if (!safe) return null;

  let u: URL;
  try {
    u = new URL(safe);
  } catch {
    return null;
  }

  if (hasCredentials(u)) return null;

  const host = u.hostname;
  if (!host) return null;
  if (isProbablyIpHost(host)) return null;
  if (isPunycode(host)) return null;

  // 强制 https
  if (u.protocol === "http:") {
    u.protocol = "https:";
  }
  if (u.protocol !== "https:") return null;

  return u.toString();
}
