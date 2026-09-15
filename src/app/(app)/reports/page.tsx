// Reports (PRD §7.14) — ringkasan + ekspor PDF/Excel/CSV/JSON journal, performa, posisi.
"use client";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEngineStatus, usePerformance, useJournal } from "@/lib/hooks/use-engine";
import { formatUsd, formatPercent } from "@/lib/utils";

function dl(scope: string, format: string) {
  const a = document.createElement("a");
  a.href = `/api/report/export?scope=${scope}&format=${format}`;
  a.download = "";
  a.click();
}

export default function ReportsPage() {
  const { data } = useEngineStatus(10000);
  const { data: perf } = usePerformance();
  const { data: journal } = useJournal();
  const acct = data?.account;
  const stats = [
    { label: "Equity", value: acct ? formatUsd(acct.equity) : "—" },
    { label: "Balance", value: acct ? formatUsd(acct.balanceUsd) : "—" },
    { label: "Realized PnL", value: acct ? formatUsd(acct.realizedPnl) : "—" },
    { label: "Total trades", value: perf ? String(perf.tradeCount) : "—" },
    { label: "Win rate", value: perf ? formatPercent(perf.winRatePct) : "—" },
    { label: "Profit factor", value: perf?.profitFactor != null ? perf.profitFactor.toFixed(2) : "—" },
    { label: "Max DD", value: perf ? `${perf.maxDrawdownPct.toFixed(2)}%` : "—" },
    { label: "Journal entries", value: journal ? String(journal.length) : "—" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Reports</h1>
        <p className="text-sm text-text-muted">Ringkasan performa + ekspor data (PDF/Excel/CSV/JSON) untuk analisis offline.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ringkasan</CardTitle>
          <CardDescription>Data live dari engine paper-trading</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-lg border border-border p-3">
                <p className="text-xs text-text-muted">{s.label}</p>
                <p className="mt-1 font-mono text-lg font-semibold text-text-primary">{s.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Trading Journal</CardTitle>
            <CardDescription>{journal?.length || 0} entri — semua trade tercatat</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" onClick={() => dl("journal", "csv")}>Ekspor CSV</Button>
            <Button variant="outline" className="w-full" onClick={() => dl("journal", "json")}>Ekspor JSON</Button>
            <Button variant="outline" className="w-full" onClick={() => dl("journal", "xlsx")}>Ekspor Excel</Button>
            <Button variant="outline" className="w-full" onClick={() => dl("journal", "pdf")}>Ekspor PDF</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
            <CardDescription>Ringkasan statistik + equity curve</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" onClick={() => dl("performance", "csv")}>Ekspor CSV</Button>
            <Button variant="outline" className="w-full" onClick={() => dl("performance", "json")}>Ekspor JSON</Button>
            <Button variant="outline" className="w-full" onClick={() => dl("performance", "xlsx")}>Ekspor Excel</Button>
            <Button variant="outline" className="w-full" onClick={() => dl("performance", "pdf")}>Ekspor PDF</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Posisi</CardTitle>
            <CardDescription>Open &amp; closed positions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" onClick={() => dl("positions", "csv")}>Ekspor CSV</Button>
            <Button variant="outline" className="w-full" onClick={() => dl("positions", "json")}>Ekspor JSON</Button>
            <Button variant="outline" className="w-full" onClick={() => dl("positions", "xlsx")}>Ekspor Excel</Button>
            <Button variant="outline" className="w-full" onClick={() => dl("positions", "pdf")}>Ekspor PDF</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
