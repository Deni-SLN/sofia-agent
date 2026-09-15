// Journal — semua trade tercatat + filter hasil.
"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useJournal } from "@/lib/hooks/use-engine";
import { formatUsd, formatDate } from "@/lib/utils";

type F = "ALL" | "OPEN" | "WIN" | "LOSS" | "BREAKEVEN";

export default function JournalPage() {
  const { data, isLoading } = useJournal();
  const [f, setF] = useState<F>("ALL");
  const rows = (data || []).filter((j) => (f === "ALL" ? true : j.result === f));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Trading Journal</h1>
      <div className="flex gap-2">
        {(["ALL", "OPEN", "WIN", "LOSS", "BREAKEVEN"] as F[]).map((x) => (
          <Button key={x} size="sm" variant={f === x ? "default" : "outline"} onClick={() => setF(x)}>{x}</Button>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Entri ({rows.length})</CardTitle>
          <CardDescription>Setiap entry mencatat strategi, regime, skor, risiko, fee &amp; slippage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.slice(0, 50).map((j) => (
            <div key={j.id} className="rounded-lg border border-border p-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{j.symbol}</span>
                <Badge variant={j.result === "WIN" ? "success" : j.result === "LOSS" ? "danger" : j.result === "OPEN" ? "warning" : "default"}>
                  {j.result}
                </Badge>
                <Badge variant="info">{j.strategy}</Badge>
                <span className={`ml-auto font-mono ${((j.pnl ?? 0) >= 0) ? "text-chart-up" : "text-chart-down"}`}>
                  {j.pnl === null ? "OPEN" : formatUsd(j.pnl)}
                </span>
              </div>
              <p className="mt-1 text-xs text-text-muted">
                entry {formatUsd(j.entry)} · SL {j.stopLoss ? formatUsd(j.stopLoss) : "—"} · TP {j.takeProfit ? formatUsd(j.takeProfit) : "—"} ·
                qty {j.qty} · conf {j.confidence} · {j.marketRegime} · {formatDate(j.createdAt)}
              </p>
              <p className="mt-1 text-xs text-text-secondary">{j.reasoning}</p>
            </div>
          ))}
          {isLoading && <p className="text-sm text-text-muted">Memuat...</p>}
          {!isLoading && !rows.length && <p className="text-sm text-text-muted">Belum ada entri jurnal.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
