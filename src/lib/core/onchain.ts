// ============================================================
// SOFIA Trade — On-chain Wallet Analytics (PRD §7.9)
// Wallet analytics, balances, tx history, whale alert.
// Tanpa API key: dummy data yang konsisten untuk pengembangan.
// ------------------------------------------------------------
// TASK-002 note: file ini dead code (tidak diimpor siapa pun —
// lihat docs/audit.md §7). Perbaikan di sini MINIMAL hanya agar
// `next build` lolos lint; penghapusan/relokasi diputuskan di
// fase Trading Migration (TASK-015) dengan dokumentasi alasan.
// ============================================================

export const dynamic = "force-dynamic";

export interface WalletEntry {
  id: string;
  address: string;
  label: string;
  chains: Array<{ chain: string; balance: string; currency: string; change24hPct: number }>;
  txCount24h: number;
  inactiveDays: number;
  role: "whale" | "active" | "idle" | "normal";
  addedAt: string;
  lastSeenAt: string;
}

export interface TxSnapshot {
  txid: string;
  chain: string;
  direction: "IN" | "OUT";
  value: string;
  currency: string;
  timestamp: string;
  ageHours: number;
  confirmation: number;
  gasUsd: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function lastWalletSnapshotAt(): string {
  return nowIso();
}

function dummyWallet(id: string, address: string, label: string, role: WalletEntry["role"], seed: number): WalletEntry {
  const chains = [
    { chain: "Ethereum", balance: `${(Math.random() * 9900 + 200).toFixed(2)}`, currency: "ETH", change24hPct: Math.round((Math.random() * 12 - 6) * 10) / 10 },
    { chain: "BNB Smart Chain", balance: `${(Math.random() * 900 + 10).toFixed(4)}`, currency: "BNB", change24hPct: Math.round((Math.random() * 10 - 5) * 10) / 10 },
    { chain: "Solana", balance: `${(Math.random() * 12000 + 500).toFixed(2)}`, currency: "SOL", change24hPct: Math.round((Math.random() * 14 - 7) * 10) / 10 },
  ];
  const txCount = Math.floor(Math.random() * 25) + 1;
  const inactive = Math.floor(Math.random() * 90) + 1;
  return {
    id, address, label,
    chains,
    txCount24h: txCount,
    inactiveDays: inactive,
    role,
    addedAt: new Date(Date.now() - seed * 86_400_000).toISOString(),
    lastSeenAt: new Date(Date.now() - Math.floor(Math.random() * 60) * 60_000).toISOString(),
  };
}

export const DUMMY_WALLETS: WalletEntry[] = [
  dummyWallet("wh-1", "0x9aFb...E472", "PAK LURUH ETHEREUM WHALE", "whale", 120),
  dummyWallet("wh-2", "0xd2C1...B901", "GUDANG SOLANA CETAKAN 2022", "whale", 88),
  dummyWallet("ac-1", "0x7f33...A2Cc", "TONTON AKTIF 15-HARI", "active", 14),
  dummyWallet("ac-2", "0xbE9f...D410", "MOBIL SAFETY FUND", "active", 6),
  dummyWallet("id-1", "0x4e01...F7A9", "NEMESIS X (RED) - IDLE", "idle", 310),
  dummyWallet("id-2", "0x8a2b...E33F", "DEVELOPER FUND - BNB", "idle", 240),
  dummyWallet("nm-1", "0x0000...0001", "DEFAULT SIMULASI DUMMY", "normal", 2),
];
