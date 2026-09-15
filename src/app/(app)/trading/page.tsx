// Trading manual — order via engine dengan SL/TP wajib.
"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useEngineStatus, postJSON } from "@/lib/hooks/use-engine";
import { formatUsd, formatDate } from "@/lib/utils";

const PAIRS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT", "ADAUSDT", "AVAXUSDT", "LINKUSDT", "MATICUSDT"];

export default function TradingPage() {
  const { data, refetch } = useEngineStatus(5000);
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [type, setType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [qty, setQty] = useState("0.001");
  const [price, setPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await postJSON<{ order: { id: string } }>("/api/orders", {
        symbol, side, type, qty: Number(qty),
        price: price ? Number(price) : undefined,
        stopLoss: stopLoss ? Number(stopLoss) : undefined,
        takeProfit: takeProfit ? Number(takeProfit) : undefined,
        reason: "Manual dari UI trading",
      });
      setMsg(`Order ${res.order.id} diterima`);
      await refetch();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function closePosition(id: string) {
    setBusy(true);
    try {
      await postJSON("/api/positions", { action: "close", id });
      await refetch();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const orders = data?.orders || [];
  const positions = data?.positions || [];
  const open = orders.filter((o) => o.status === "OPEN");
  const hist = orders.filter((o) => o.status !== "OPEN");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Trading</h1>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Place Order</CardTitle>
            <CardDescription>Semua order melewati Risk Engine. V1 long-only.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAIRS.map((p) => <SelectItem key={p} value={p}>{p.replace("USDT", "/USDT")}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              {(["BUY", "SELL"] as const).map((s) => (
                <Button key={s} variant={side === s ? (s === "BUY" ? "default" : "danger") : "outline"} onClick={() => setSide(s)}>{s}</Button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["MARKET", "LIMIT"] as const).map((t) => (
                <Button key={t} variant={type === t ? "default" : "ghost"} size="sm" onClick={() => setType(t)}>{t}</Button>
              ))}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-muted">Qty (base asset)</label>
              <Input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" />
            </div>
            {type === "LIMIT" && (
              <div className="space-y-1">
                <label className="text-xs text-text-muted">Limit price (USDT)</label>
                <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-text-muted">Stop Loss (opsional — auto ATR)</label>
                <Input value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} inputMode="decimal" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-text-muted">Take Profit (opsional)</label>
                <Input value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} inputMode="decimal" />
              </div>
            </div>
            <Button className="w-full" onClick={submit} disabled={busy}>
              {busy ? "Mengirim..." : `Kirim ${side} ${type}`}
            </Button>
            {msg && <p className="text-xs text-text-muted">{msg}</p>}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Posisi Terbuka ({positions.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {positions.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
                  <div>
                    <p className="font-semibold">{p.symbol} LONG</p>
                    <p className="text-xs text-text-muted">
                      {p.qty} @ {formatUsd(p.entryPrice)} → {formatUsd(p.currentPrice)} · PnL {formatUsd(p.unrealizedPnl)}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => closePosition(p.id)}>Close</Button>
                </div>
              ))}
              {!positions.length && <p className="text-sm text-text-muted">Tidak ada posisi.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Order</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="open">
                <TabsList>
                  <TabsTrigger value="open">Open ({open.length})</TabsTrigger>
                  <TabsTrigger value="history">History ({hist.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="open" className="space-y-2">
                  {open.map((o) => (
                    <div key={o.id} className="flex items-center justify-between text-sm">
                      <span>{o.symbol} {o.side} {o.type} {o.qty}</span>
                      <Badge variant="warning">{o.status}</Badge>
                    </div>
                  ))}
                  {!open.length && <p className="text-sm text-text-muted">Tidak ada order open.</p>}
                </TabsContent>
                <TabsContent value="history" className="space-y-2">
                  {hist.slice(0, 20).map((o) => (
                    <div key={o.id} className="flex items-center justify-between text-sm">
                      <span>{o.symbol} {o.side} {o.qty} @ {o.avgFillPrice ? formatUsd(o.avgFillPrice) : "—"}</span>
                      <span className="text-xs text-text-muted">{o.status} · {formatDate(o.createdAt)}</span>
                    </div>
                  ))}
                  {!hist.length && <p className="text-sm text-text-muted">Belum ada history.</p>}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
