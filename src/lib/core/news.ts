// ============================================================
// SOFIA Trade — News Module (PRD §7.11) bagian 1/2
// Agregasi RSS publik tanpa dependency + sentiment + tagging.
// ============================================================
export type NewsSentiment = "POSITIF" | "NETRAL" | "NEGATIF";
export interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string | null;
  sentiment: NewsSentiment;
  sentimentScore: number;
  symbols: string[];
}
const SOURCES = [
  { id: "coindesk", name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { id: "cointelegraph", name: "Cointelegraph", url: "https://cointelegraph.com/rss" },
  { id: "bitcoinmag", name: "Bitcoin Magazine", url: "https://bitcoinmagazine.com/feed" },
];
const KNOWN_SYMBOLS = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "DOT", "AVAX", "LINK", "LTC", "MATIC", "UNI", "ATOM", "NEAR", "APT", "ARB", "OP", "SUI", "TON", "SHIB", "PEPE"];
const SYMBOL_MAP: Array<[RegExp, string]> = [
  [/bitcoin|\bbtc\b/i, "BTC"], [/ethereum|\beth\b/i, "ETH"], [/solana|\bsol\b/i, "SOL"],
  [/bnb|binance coin/i, "BNB"], [/ripple|\bxrp\b/i, "XRP"], [/cardano|ada\b/i, "ADA"],
  [/dogecoin|\bdoge\b/i, "DOGE"], [/polkadot|\bdot\b/i, "DOT"], [/avalanche|avax/i, "AVAX"],
  [/chainlink|\blink\b/i, "LINK"], [/litecoin|\bltc\b/i, "LTC"], [/polygon|matic/i, "MATIC"],
  [/uniswap|\buni\b/i, "UNI"], [/cosmos|\batom\b/i, "ATOM"], [/near protocol|\bnear\b/i, "NEAR"],
  [/aptos|apt\b/i, "APT"], [/arbitrum|arb\b/i, "ARB"], [/optimism|op\b/i, "OP"],
  [/sui\b/i, "SUI"], [/ton\b|toncoin/i, "TON"], [/shiba|\bshib\b/i, "SHIB"], [/pepe\b/i, "PEPE"],
];
const POSITIVE = ["surge", "surges", "soar", "rally", "rallies", "gains", "gain", "bullish", "breakout", "record", "approve", "approved", "etf", "adoption", " rise", "rises", "jump", "positive", "inflow", "win", "upgrade", "milestone", "partnership", "launch"];
const NEGATIVE = ["crash", "drop", "drops", " fall", "falls", "fell", "plunge", "bearish", "slump", "hack", "hacked", "sell-off", "selloff", "loss", "ban", "banned", "lawsuit", "sue", "sued", "liquidat", "fraud", "scam", "recession", "decline", "warning", "outflow", "below", "downgrade", "delay", "halt"];
function sentimentOf(text: string): { sentiment: NewsSentiment; score: number } {
  const t = ` ${text.toLowerCase()} `;
  let score = 0;
  for (const w of POSITIVE) if (t.includes(w)) score += 1;
  for (const w of NEGATIVE) if (t.includes(w)) score -= 1;
  score = Math.max(-3, Math.min(3, score));
  return { sentiment: score > 0 ? "POSITIF" : score < 0 ? "NEGATIF" : "NETRAL", score };
}
function symbolsOf(text: string): string[] {
  const found = new Set<string>();
  for (const m of KNOWN_SYMBOLS) {
    const re = new RegExp(`\\b${m}\\b`, "i");
    if (re.test(text)) found.add(m);
  }
  for (const [re, sym] of SYMBOL_MAP) if (re.test(text)) found.add(sym);
  return Array.from(found).sort();
}
function decodeXml(s: string): string {
  return s.replace(/<!\[CDATA\[([^]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
}
function stripTags(s: string): string { return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}
function parseRss(xml: string, source: string): NewsItem[] {
  const out: NewsItem[] = [];
  const re = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const b = m[1];
    const titleRaw = b.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
    const link = b.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] || "";
    const pubRaw = b.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] || "";
    const descRaw = b.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] || "";
    const title = decodeXml(stripTags(titleRaw)).trim();
    if (!title || !link) continue;
    const publishedAt = pubRaw ? new Date(pubRaw).toISOString() : null;
    const { sentiment, score } = sentimentOf(`${title} ${decodeXml(stripTags(descRaw))}`);
    out.push({ id: `n-${source}-${out.length}-${hash(title + link)}`, title, source, url: link, publishedAt, sentiment, sentimentScore: score, symbols: symbolsOf(title) });
  }
  return out;
}
// News Module bagian 2/2: cache 5 menit + fetch sumber + fallback.
const g = globalThis as unknown as Record<string, unknown>;
const CACHE_KEY = "__sofiaNewsCache";
const TTL = 5 * 60_000;
const FALLBACK: NewsItem[] = [
  { id: "f1", title: "Bitcoin ETF inflows hit multi-month high amid bullish momentum", source: "Sample", url: "#", publishedAt: new Date().toISOString(), sentiment: "POSITIF", sentimentScore: 2, symbols: ["BTC"] },
  { id: "f2", title: "Ethereum network activity rises as layer-2 fees decline", source: "Sample", url: "#", publishedAt: new Date().toISOString(), sentiment: "POSITIF", sentimentScore: 1, symbols: ["ETH"] },
  { id: "f3", title: "Crypto market consolidates; traders await macro data", source: "Sample", url: "#", publishedAt: new Date().toISOString(), sentiment: "NETRAL", sentimentScore: 0, symbols: ["BTC", "ETH"] },
  { id: "f4", title: "Regulators warn retail investors about volatility risks", source: "Sample", url: "#", publishedAt: new Date().toISOString(), sentiment: "NEGATIF", sentimentScore: -1, symbols: [] },
];
function setCache(items: NewsItem[]) { g[CACHE_KEY] = { ts: Date.now(), items }; }
function getCache(): { ts: number; items: NewsItem[] } | null {
  const c = g[CACHE_KEY] as { ts: number; items: NewsItem[] } | undefined;
  if (!c) return null;
  if (Date.now() - c.ts > TTL) return null;
  return c;
}
export async function fetchNews(): Promise<{ items: NewsItem[]; source: "LIVE" | "FALLBACK"; fetchedAt: string }> {
  const hit = getCache();
  if (hit) return { items: hit.items, source: "LIVE", fetchedAt: new Date().toISOString() };
  const results = await Promise.allSettled(SOURCES.map(async (src) => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 6000);
    try {
      const r = await fetch(src.url, { signal: ctl.signal, headers: { "user-agent": "SOFIA-Trade/0.1 (+paper-demo)" } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return parseRss(await r.text(), src.name);
    } finally { clearTimeout(t); }
  }));
  const items: NewsItem[] = [];
  for (const r of results) if (r.status === "fulfilled") items.push(...r.value);
  const unique = items
    .filter((n, i, a) => a.findIndex((x) => x.title === n.title) === i)
    .sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""))
    .slice(0, 60);
  if (!unique.length) {
    setCache(FALLBACK);
    return { items: FALLBACK, source: "FALLBACK", fetchedAt: new Date().toISOString() };
  }
  setCache(unique);
  return { items: unique, source: "LIVE", fetchedAt: new Date().toISOString() };
}