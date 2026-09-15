// Reports Export API (PRD §7.14) — PDF/Excel/CSV/JSON untuk journal, performance, positions.
import { getStore } from "@/lib/core/store";
import { buildPerformance } from "@/lib/core/performance";
import type { JournalEntry } from "@/lib/core/types";
export const dynamic = "force-dynamic";

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const head = headers.map(csvEscape).join(",");
  const body = rows.map((r) => headers.map((h) => csvEscape(r[h])).join(","));
  return [head, ...body].join("\r\n");
}
function journalRows(j: JournalEntry[]): Array<Record<string, unknown>> {
  const headers = ["id", "tradeId", "symbol", "mode", "strategy", "marketRegime", "result", "confidence", "entry", "stopLoss", "takeProfit", "qty", "riskUsd", "feeUsd", "slippageUsd", "pnl", "pnlPct", "durationMs", "createdAt", "closedAt"];
  const rows = j.map((e) => ({ ...e, marketRegime: e.marketRegime }));
  return rows.map((r) => {
    const o: Record<string, unknown> = {};
    for (const h of headers) o[h] = (r as unknown as Record<string, unknown>)[h] ?? "";
    return o;
  });
}
function positionRows(): Array<Record<string, unknown>> {
  const s = getStore();
  const headers = ["id", "symbol", "side", "qty", "entryPrice", "currentPrice", "takeProfit", "stopLoss", "trailingStopPct", "unrealizedPnl", "realizedPnl", "feeUsd", "strategy", "marketRegime", "status", "openedAt", "closedAt", "closePrice", "closeReason"];
  return s.positions.map((p) => {
    const o: Record<string, unknown> = {};
    for (const h of headers) (o as unknown as Record<string, unknown>)[h] = (p as unknown as Record<string, unknown>)[h] ?? "";
    return o;
  });
}
function perfRows() {
  const s = getStore();
  const perf = buildPerformance(s.journal);
  const bySymbol = perf.bySymbol.map((b, i) => ({ id: `s${i + 1}`, ...b }));
  return { performance: { ...perf, bySymbol: undefined, equityCurve: undefined }, equityCurve: perf.equityCurve, bySymbol };
}
function htmlPdf(title: string, sections: Array<{ heading: string; rows: Array<Record<string, unknown>> }>): string {
  const allHeaders = Array.from(new Set(sections.flatMap((s) => (s.rows[0] ? Object.keys(s.rows[0]) : []))));
  const escape = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = sections.map((sec) => {
    const headers = sec.rows[0] ? Object.keys(sec.rows[0]) : allHeaders;
    const thead = `<tr>${headers.map((h) => `<th>${escape(h)}</th>`).join("")}</tr>`;
    const tbody = sec.rows.map((r) => `<tr>${headers.map((h) => `<td>${escape(r[h])}</td>`).join("")}</tr>`).join("");
    return `<h2 style="margin-top:24px;font-size:16px;">${escape(sec.heading)}</h2><table><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
  }).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escape(title)}</title>
<style>body{font-family:Arial,sans-serif;font-size:11px;color:#111;margin:20px;}
h1{font-size:18px;margin-bottom:4px;}h2{font-size:13px;margin:16px 0 6px;}
table{border-collapse:collapse;width:100%;}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left;font-size:10px;}
th{background:#f5f5f5;}@media print{body{margin:0}}</style></head><body>
<h1>${escape(title)}</h1><p>Generated ${new Date().toISOString().slice(0, 10)} — SOFIA Trade</p>
${body}<script>window.onload=function(){window.print()}</script></body></html>`;
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const scope = String(u.searchParams.get("scope") || "journal");
  const format = String(u.searchParams.get("format") || "csv").toLowerCase();

  const filename = `sofia-${scope}-${new Date().toISOString().slice(0, 10)}`;
  let body: string;
  let content = "text/plain; charset=utf-8";
  let fname = `${filename}.csv`;

  if (format === "xlsx") {
    const rows = scope === "performance" ? [] : scope === "positions" ? positionRows() : journalRows(getStore().journal);
    body = "﻿" + toCsv(rows[0] ? Object.keys(rows[0]) : [], rows);
    content = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    fname = `${filename}.xlsx.csv`;
  } else if (format === "pdf") {
    if (scope === "performance") {
      const d = perfRows();
      body = htmlPdf("SOFIA Performance Report", [
        { heading: "Performance Summary", rows: [d.performance as unknown as Record<string, unknown>] },
        { heading: "By Symbol", rows: d.bySymbol },
        { heading: "Equity Curve", rows: d.equityCurve.map((e, i) => ({ step: i + 1, t: e.t, cumulative: e.cumulative })) },
      ]);
    } else if (scope === "positions") {
      body = htmlPdf("SOFIA Positions Report", [{ heading: "Positions", rows: positionRows() }]);
    } else {
      body = htmlPdf("SOFIA Trading Journal", [{ heading: "Journal Entries", rows: journalRows(getStore().journal) }]);
    }
    content = "text/html; charset=utf-8";
    fname = `${filename}.html`;
  } else if (format === "json") {
    const d = scope === "performance" ? perfRows() : scope === "positions" ? { rows: positionRows() } : { rows: journalRows(getStore().journal) };
    body = JSON.stringify(d, null, 2);
    content = "application/json; charset=utf-8";
    fname = `${filename}.json`;
  } else {
    if (scope === "performance") {
      const d = perfRows();
      const P = d.performance as unknown as Record<string, unknown>;
      body = toCsv(["tradeCount", "wins", "losses", "winRatePct", "grossProfitUsd", "grossLossUsd", "profitFactor", "expectancyUsd", "avgWinUsd", "avgLossUsd", "totalPnlUsd", "maxDrawdownPct", "bestTradeUsd", "worstTradeUsd"], [P]);
    } else if (scope === "positions") {
      const rows = positionRows();
      body = toCsv(["id", "symbol", "side", "qty", "entryPrice", "currentPrice", "takeProfit", "stopLoss", "trailingStopPct", "unrealizedPnl", "realizedPnl", "feeUsd", "strategy", "marketRegime", "status", "openedAt", "closedAt", "closePrice", "closeReason"], rows);
    } else {
      const rows = journalRows(getStore().journal);
      body = toCsv(["id", "tradeId", "symbol", "mode", "strategy", "marketRegime", "result", "confidence", "entry", "stopLoss", "takeProfit", "qty", "riskUsd", "feeUsd", "slippageUsd", "pnl", "pnlPct", "durationMs", "createdAt", "closedAt"], rows);
    }
    fname = `${filename}.csv`;
  }

  return new Response(body, {
    headers: { "content-type": content, "content-disposition": `attachment; filename="${fname}"` },
  });
}
