// ============================================================
// SOFIA Trade — AI Prompt Library (PRD §7.12) bagian 1/2
// Kategori, template + variabel {{symbol}}, {{timeframe}}, {{price}},
// {{indicators}}, {{news}}, {{portfolio}}. Render deterministik.
// ============================================================

export type PromptCategory = "TRADING" | "NEWS" | "TECHNICAL" | "PORTFOLIO" | "RISK" | "CUSTOM";
export const PROMPT_CATEGORIES: PromptCategory[] = ["TRADING", "NEWS", "TECHNICAL", "PORTFOLIO", "RISK", "CUSTOM"];

export const PROMPT_VARIABLES = [
  { key: "symbol", label: "Simbol (mis. BTCUSDT)" },
  { key: "timeframe", label: "Timeframe (mis. 60)" },
  { key: "price", label: "Harga terakhir" },
  { key: "indicators", label: "Ringkasan indikator" },
  { key: "news", label: "Ringkasan news" },
  { key: "portfolio", label: "Ringkasan portfolio" },
] as const;

export interface SavedPrompt {
  id: string;
  name: string;
  category: PromptCategory;
  template: string;
  createdAt: string;
  updatedAt: string;
}

export const BUILTIN_PROMPTS: Array<Omit<SavedPrompt, "id" | "createdAt" | "updatedAt">> = [
  {
    name: "Analisa teknikal (default)",
    category: "TECHNICAL",
    template: [
      "Kamu analis crypto Indonesia. Jelaskan kondisi {{symbol}} timeframe {{timeframe}} ringkas.",
      "DATA: price={{price}} indicators={{indicators}}",
      "Sebut level entry/SL/TP persis dari DATA, akhiri dengan risiko. Jangan buat angka baru.",
    ].join("\n"),
  },
  {
    name: "Review jurnal trade",
    category: "TRADING",
    template: [
      "Kamu mentor trading. Review trade berikut secara jujur dan ringkas.",
      "PORTFOLIO: {{portfolio}}",
      "Sebut kesalahan jika ada, pelajaran, dan satu perbaikan konkreto untuk trade berikutnya.",
    ].join("\n"),
  },
  {
    name: "Ringkas news pasar",
    category: "NEWS",
    template: [
      "Kamu editor berita crypto. Ringkas berita berikut jadi 3 poin dan beri sentimen per poin.",
      "NEWS: {{news}}",
      "Akhiri dengan implikasi singkat untuk trader {{symbol}}.",
    ].join("\n"),
  },
  {
    name: "Cek risiko portfolio",
    category: "RISK",
    template: [
      "Kamu risk manager. Evaluasi kondisi portfolio berikut.",
      "PORTFOLIO: {{portfolio}}",
      "Sebut eksposur, risiko harian, dan apakah masih dalam batas aman (risiko 1%/trade, R:R min 1:2).",
    ].join("\n"),
  },
];

/** Ganti semua token {{var}} pada template. Token tanpa nilai -> "-". */
export function renderPrompt(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (_m, k: string) => {
    const v = vars[k.toLowerCase()];
    return v === undefined || v === "" ? "-" : v;
  });
}

export function listVariables(template: string): string[] {
  const found = new Set<string>();
  const re = /\{\{\s*([a-zA-Z_]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(template)) !== null) found.add(m[1].toLowerCase());
  return Array.from(found);
}