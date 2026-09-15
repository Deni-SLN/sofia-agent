# SOFIA — Repository Audit (TASK-001)

**Repository:** `Deni-SLN/sofia-agent`
**Audited revision:** initial commit `Initial commit: Sofia Trade project`
**Audit date:** 2026-09-15
**Source PRD:** `docs/PRD-SOFIA-2.0.md` (SOFIA 2.0)
**Scope of this audit:** read-only. No application code was modified for this report.

> **CATATAN (TASK-003.5):** dokumen ini adalah **BASELINE audit V1** — bukan kondisi
> terkini repository (TASK-002/003 sudah diterapkan setelah audit ini). Kondisi sekarang:
> `docs/current-architecture.md`.

---

## 0. Executive Summary

The existing repository is a **single Next.js 14 App Router application** ("SOFIA Trade V1")
implementing a crypto **paper-trading cockpit**: market scanner, deterministic signal /
decision pipeline, risk engine, paper execution, journal, performance analytics, an AI
router with multi-provider fallback, prompts, strategies, backtest, plus auth via Supabase.

It is **not** yet the SOFIA 2.0 product described in the new PRD. V1 is trading-centric;
SOFIA 2.0 is an **AI Executive Intelligence Platform** (Paperclip control plane, Hermes
runtime, 9Router gateway, OpenRouter + local LLM, n8n automation, memory/knowledge, decision
journal, finance/crypto/trading, PostgreSQL).

Verdict: **the trading/risk/backtest/AI-router core is valuable and must be preserved and
relocated behind service boundaries; the persistence layer, auth layer, provider coupling and
API surface must be refactored or replaced.**

Overall health:

| Aspect | Rating | Note |
|---|---|---|
| Type safety | GOOD | `strict: true`, `tsc --noEmit` exits 0 |
| Build health | GOOD | Next.js 14.2.35, clean baseline |
| Architecture separation | WEAK | business logic partly inside route handlers; singleton global store |
| Persistence | WEAK | Supabase-coupled, snapshot blob, no migrations |
| Security | WEAK | no local password hashing, auth delegated to Supabase |
| Test coverage | NONE | zero test files, no test runner installed |
| Observability | WEAK | ad-hoc `console.warn`, no structured logging |
| Integration readiness | NONE | no Paperclip / Hermes / 9Router / n8n client exists |

---

## 1. Architecture Map

### 1.1 Current (V1) runtime shape

```text
Browser (React 18, client components)
   │  fetch /api/*
   ▼
Next.js middleware.ts  ── Supabase session guard (fail-open when env missing)
   │
   ▼
src/app/api/**/route.ts  (33 route handlers)
   │
   ▼
src/lib/core/*  (domain singletons on globalThis)
   ├── store.ts        SofiaStore singleton (single global state object)
   ├── engine.ts       SofiaEngine autonomous loop (setInterval)
   ├── market-data.ts  Bybit tickers/kline + fallback
   ├── currency.ts     USD/IDR FX cache
   ├── scanner.ts      candidate scanner
   ├── decision.ts     deterministic multi-factor scoring
   ├── indicators.ts   EMA/RSI/ATR/ADX/BB/VWAP...
   ├── strategies.ts   strategy presets + registry
   ├── risk-engine.ts  pre-trade risk validation (deterministic)
   ├── paper-engine.ts paper orders/positions/TP/SL/trailing
   ├── performance.ts  performance analytics
   ├── backtest.ts     backtest runner
   ├── news.ts         news ingestion
   ├── onchain.ts      on-chain metrics
   ├── notify-telegram.ts Telegram notifier
   ├── ai-providers.ts raw provider HTTP adapters
   ├── ai-router.ts    cache + budget + failover orchestration
   ├── ai-store.ts     AI router singleton state
   ├── prompts.ts      prompt templates
   ├── sofia-fallback.ts deterministic chat fallback + context builder
   └── persistence.ts  Supabase snapshot + journal archive
```

### 1.2 Layer assessment

| Layer | Location | Assessment |
|---|---|---|
| Presentation | `src/app/(app)/**`, `src/components/**` | KEEP — clean App Router split, dark-first shell |
| Transport | `src/app/api/**` | REFACTOR — 33 handlers, inconsistent error shape, logic inline |
| Domain | `src/lib/core/**` | KEEP/REFACTOR — valuable, but not isolated in services |
| Persistence | `src/lib/core/persistence.ts`, `src/lib/supabase/**` | REPLACE — Supabase-specific |
| Auth | `src/middleware.ts`, `src/lib/supabase/**` | REPLACE (provider) / REFACTOR (guard) |
| Integrations | *(absent)* | MISSING — Paperclip, Hermes, 9Router, n8n, Local LLM |
| Config | `process.env.*` scattered | REPLACE — needs typed config module |
| Logging | `console.warn` in 1 file | REPLACE — needs structured logger |

### 1.3 Confirmed architectural violations vs. PRD §3.1 and §28

1. **Provider coupling** — `ai-router.ts` hardcodes provider identity by `p.id` string
   comparisons (`"anthropic"`, `"gemini"`, else OpenAI-style) at 2 call sites.
   PRD §3.3 requires SOFIA → LLM Gateway abstraction → 9Router → provider.
2. **Supabase-specific persistence** — `persistence.ts` writes the *entire* application
   state as one JSON blob row (`sofia_snapshots.payload`). PRD §39 requires normalised
   PostgreSQL tables (`memory`, `knowledge`, `decisions`, `portfolio`, ...).
3. **No service abstraction** — nothing prevents a route handler from importing a domain
   singleton directly (and all of them do).
4. **Global mutable singleton** — `store.ts`, `ai-store.ts`, `engine.ts` attach to
   `globalThis`. Works for one process; breaks horizontal scaling and is untestable.
5. **Agent simulation duplicated** — `store.ts` `DEFAULT_AGENTS` defines 13 hardcoded
   "agents" with locally-tracked `runs`/`errors`. PRD §47 forbids a duplicate agent store;
   agents must come from Paperclip.
---

## 2. Dependency Map

### 2.1 Runtime dependencies (`package.json`)

| Package | Version | Purpose | PRD verdict |
|---|---|---|---|
| `next` | 14.2.35 | framework | KEEP (§56) |
| `react`, `react-dom` | ^18 | UI | KEEP |
| `typescript` | ^5 | types | KEEP |
| `tailwindcss` | ^3.4.1 | styling | KEEP |
| `@radix-ui/react-*` (19 pkgs) | various | primitives | KEEP |
| `@tanstack/react-query` | ^5.101.4 | server state | KEEP |
| `recharts` | ^3.10.1 | charts | KEEP |
| `zustand` | ^5.0.14 | client state | KEEP |
| `lucide-react` | ^1.27.0 | icons | KEEP |
| `class-variance-authority`, `clsx`, `tailwind-merge` | | styling utils | KEEP |
| `@supabase/supabase-js` | ^2.110.8 | DB/auth | **REPLACE** (§57) |
| `@supabase/ssr` | ^0.12.3 | SSR auth | **REPLACE** (§57) |

### 2.2 Notable dependency findings

- **No test runner at all** — no `jest`, `vitest`, or `playwright`. PRD §62 requires
  unit/integration/API/security tests and a `test` CI check. `package.json` has no `test` script.
- **No `typecheck` script** — PRD §62 requires a `typecheck` CI check; only `lint` exists.
- **No `pg` / `postgres` driver** — PRD §39 PostgreSQL migration needs one.
- **No `ioredis`** — PRD §40 Redis needs one.
- **No `zod`** — PRD §60 input validation is ad-hoc; `readJson<T>` performs an unsafe cast.
- **No `argon2`/`bcrypt`** — PRD §36 requires Argon2id. The password route delegates to Supabase.
- **`lucide-react@^1.27.0`** is an unusual major version. Confirmed working with `tsc`,
  left untouched, flagged as a supply-chain oddity to verify.
- **19 Radix packages installed** vs. **11 UI components implemented** — 8 unused primitives
  (see §7 Dead Code).

### 2.3 Internal fan-in (coupling concentration)

| Module | Imported by (approx.) | Risk |
|---|---|---|
| `lib/core/store.ts` | engine, scanner, decision, paper-engine, persistence, most routes | HIGH |
| `lib/core/types.ts` | nearly everything | LOW (types only) |
| `lib/core/risk-engine.ts` | engine, orders, backtest, settings | MEDIUM |
| `lib/core/ai-router.ts` | `api/ai/*`, `api/sofia-chat` | MEDIUM |
| `lib/core/persistence.ts` | store only (dynamic import) | LOW |

`store.ts` is the single largest coupling point. It is the primary target for the Phase 2
repository/service split.

---

## 3. Route Map (pages)

App Router, two route groups. `src/app/page.tsx` is a redirect stub.

| Path | File | Notes |
|---|---|---|
| `/` | `app/page.tsx` | 4-line redirect |
| `/login` | `app/(auth)/login/page.tsx` | Supabase sign-in, `demoMode` when env absent |
---

## 4. API Map (route handlers)

33 handlers under `src/app/api/`. All are `GET`/`POST` — no `PUT`/`PATCH`/`DELETE` is used.
Mutations are modelled as `POST` with an action field, which is a REFACTOR target for REST
consistency.

| Endpoint | Methods | Domain | Auth (middleware) |
|---|---|---|---|
| `/api/health` | GET | system | **public** |
| `/api/currency` | GET | system | **public** |
| `/api/events` | GET | system | protected |
| `/api/market/tickers` | GET | market | **public** |
| `/api/market/kline` | GET | market | **public** |
| `/api/news` | GET | market | **public** |
| `/api/scanner` | GET | market | **public** |
| `/api/watchlist` | GET, POST | market | protected |
| `/api/signals` | GET | trading | protected |
| `/api/orders` | GET, POST | trading | protected |
| `/api/positions` | GET, POST | trading | protected |
| `/api/portfolio` | GET | trading | protected |
| `/api/risk` | GET, POST | trading | protected |
| `/api/journal` | GET | trading | protected |
| `/api/performance` | GET | trading | protected |
| `/api/backtest` | GET, POST | trading | protected |
| `/api/strategies` | GET, POST | trading | protected |
| `/api/report/export` | GET | trading | protected |
| `/api/engine/start` | POST | engine | protected |
| `/api/engine/stop` | POST | engine | protected |
| `/api/engine/status` | GET | engine | protected |
| `/api/engine/emergency-stop` | POST | engine | protected |
| `/api/engine/clear-halt` | POST | engine | protected |
| `/api/engine/live-unlock` | POST | engine | protected |
| `/api/ai/analyze` | POST | ai | protected |
| `/api/ai/consensus` | POST | ai | protected |
| `/api/ai/status` | GET | ai | protected |
| `/api/prompts` | GET, POST | ai | protected |
| `/api/sofia-chat` | GET, POST | ai | protected |
| `/api/notifications` | GET, POST | system | protected |
| `/api/notifications/test-telegram` | POST | system | protected |
| `/api/settings/exchange` | POST | settings | protected |
| `/api/settings/security/password` | POST | settings | protected |

### 4.1 API findings

1. **Inconsistent HTTP semantics.** `/api/engine/*` and `/api/risk` use verb-in-path `POST`
   rather than resource-oriented REST. PRD §41 defines a new namespace (`/api/chat`,
   `/api/intelligence`, `/api/memory`, `/api/knowledge`, `/api/decisions`, `/api/paperclip`,
   `/api/hermes`, `/api/router`, `/api/n8n`, `/api/finance`, `/api/crypto`, `/api/trading`,
   `/api/models`, `/api/usage`, `/api/activity`). **V1 endpoints are not in the target
   namespace** — a compatibility shim or staged deprecation is required.

2. **Three error envelopes are in play.** `lib/core/api.ts` exports `ok()`/`apiError()`,
   but `middleware.ts` emits a third shape (`{ ok: false, error: "Unauthorized — login dulu" }`).
   Several handlers also leak provider error text into `error` (e.g. `sofia-chat` embeds
   `m.slice(0, 120)`), conflicting with PRD §43 and §44.

3. **No input validation layer.** `readJson<T>` swallows parse errors and returns `{}`,
   then handlers read `body.message`/`body.symbol` untyped. PRD §60 requires input validation.

---

## 5. Database Map

### 5.1 Current (Supabase)

Schema file: `supabase/schema.sql`. Two tables only:

| Table | Shape | Purpose |
|---|---|---|
| `sofia_snapshots` | `id TEXT PK`, `payload JSONB`, `updated_at` | **entire app state** in one row, id = `global-v1` |
| `sofia_journal` | `id TEXT PK`, `trade_id`, `symbol`, `mode`, `strategy`, `result`, `pnl`, `entry JSONB` | journal archive |

Plus `src/types/database.ts` (250 lines) — a generated-style Supabase type file.

### 5.2 Assessment

- The snapshot model is a **state blob, not a relational model.** It cannot support
  PRD §19 (AI cost analytics by model/provider/agent/project), §24 (decision journal
  querying), §26 (finance isolation), or §21 (memory retrieval by relevance).
- **No migration tooling.** `supabase/schema.sql` is a manual script. PRD §39 requires
  versioned migrations.
- All state is loaded and saved as one unit; every write is a full-row upsert (write
  amplification plus lost-update risk between concurrent requests).
- **Deliberate safety behaviour worth preserving:** `loadSnapshot()` always resets
  `engineState = "STOPPED"` and clears `halted` on boot, preventing an auto-restart of a
  trading loop after a crash. **This invariant must be carried into PostgreSQL.**

### 5.3 Target PostgreSQL tables (PRD §39 — not yet present)

`users`, `sessions`, `user_preferences`, `memory`, `knowledge`, `decisions`,
`decision_evidence`, `decision_results`, `portfolio`, `assets`, `transactions`,
`strategies`, `backtests`, `watchlists`, `market_snapshots`, `ai_requests`, `ai_usage`,
`ai_costs`, `system_events`, `audit_logs`.

Explicitly **not** to be created (Paperclip owns them — PRD §5, §39): organizations,
agents, agent hierarchy, projects, goals, tasks, runs, heartbeats.

---

## 6. Reusable Components & Business Logic

### 6.1 UI primitives — KEEP (PRD §56)

`src/components/ui/` — 11 shadcn-style components on Radix: `badge`, `button`, `card`,
`dialog`, `dropdown-menu`, `input`, `progress`, `scroll-area`, `select`, `switch`, `tabs`,
`tooltip`. Consistent `cn()` usage and CVA variants. Well-formed; reuse as-is.

`src/components/layout/` — `sidebar` (197 lines, nested nav config), `header` (93),
`bottom-nav` (38, mobile), `notification-bell` (124). KEEP; the nav config in `sidebar.tsx`
is the single place to add SOFIA 2.0 sections.

`src/components/providers.tsx` — TanStack Query + Tooltip providers. KEEP.

### 6.2 Domain logic — KEEP, then relocate behind services (PRD §56, §28)

| Module | Lines | Reuse verdict | Reason |
|---|---|---|---|
| `indicators.ts` | 150 | **KEEP** | pure functions (EMA/RSI/ATR/ADX/BB/VWAP), zero I/O, ideal for unit tests |
| `risk-engine.ts` | 161 | **KEEP + HARDEN** | deterministic, already returns `RiskCheck[]`; add max-drawdown, exposure |
| `backtest.ts` | 146 | **KEEP** | pure-ish runner; must be isolated from live credentials (PRD §32) |
| `strategies.ts` | 228 | **KEEP** | strategy registry + saved strategies |
| `paper-engine.ts` | 332 | **KEEP** | full paper execution incl. TP/SL/trailing/fees/slippage |
| `decision.ts` | 168 | **KEEP** | multi-factor scoring + `ScoreBreakdown` |
| `performance.ts` | 61 | **KEEP** | win rate / PF / expectancy / drawdown / equity curve |
| `scanner.ts` | 39 | **KEEP** | candidate selection |
| `market-data.ts` | 203 | **KEEP** | Bybit adapter + explicit `DataSource` fallback flag |
| `currency.ts` | 49 | **KEEP** | FX with TTL cache + `API`/`FALLBACK` provenance |
| `news.ts` | 118 | **KEEP** | news ingestion |
| `onchain.ts` | 60 | KEEP | on-chain metrics |
---

## 7. Dead Code Candidates

Verified by exhaustive import search across `src/**/*.{ts,tsx}`.

### 7.1 Confirmed unreferenced files

| File | Lines | Evidence | Action |
|---|---|---|---|
| `src/types/database.ts` | 250 | **zero imports** anywhere in `src/` | REMOVE (§56) — Supabase-generated types |
| `src/lib/core/onchain.ts` | 60 | **zero imports**; only textual match is inside `types/database.ts` | REMOVE — no route or UI consumes it |
| `src/lib/supabase/middleware.ts` | 28 | exports `updateSession`, **never imported**; `src/middleware.ts` re-implements the same logic inline | REMOVE — duplicate of the real middleware |

Total: **338 lines** of confirmed dead code.

### 7.2 Unused dependencies (12 Radix primitives)

Installed (21) vs. actually imported in `src/` (9): `dialog`, `dropdown-menu`, `progress`,
`scroll-area`, `select`, `slot`, `switch`, `tabs`, `tooltip`.

Never imported:
`react-accordion`, `react-alert-dialog`, `react-avatar`, `react-checkbox`, `react-label`,
`react-navigation-menu`, `react-popover`, `react-radio-group`, `react-separator`,
`react-toast`, `react-toggle`, `react-toggle-group`.

Action: **do not remove yet** — PRD §50/§51 require a richer dashboard and these are the
correct primitives for SOFIA 2.0 (avatar for agents, popover for detail panels, toast for
notifications, accordion for activity/audit). Retain and consume.

### 7.3 Near-dead / single-consumer modules

| Module | Consumers | Note |
|---|---|---|
| `notify-telegram.ts` | 2 (`api/ai/status`, dynamic import from `store.ts`) | live, keep |
| `onchain.ts` | 0 | dead (see above) |
| `lib/supabase/client.ts` | 3 (`login`, `register`, `header`) | becomes dead once auth is replaced (§57) |
| `lib/supabase/server.ts` | **0 direct** — only reachable via the dead `supabase/middleware.ts` | effectively dead today |

### 7.4 Duplicated functionality

1. **Two middleware implementations** — `src/middleware.ts` and `src/lib/supabase/middleware.ts`
   contain the same cookie-relay code. Keep one.
2. **`DEFAULT_AGENTS` (store.ts) vs. Paperclip agents** — a hardcoded 13-agent roster with
   locally tracked counters duplicates the Paperclip control plane. PRD §47: *"Do not create
   a duplicate agent database."* Action: REMOVE the local roster in Phase 3 and read agents
---

## 8. Security Issues

Severity: **CRITICAL / HIGH / MEDIUM / LOW**. Assessed against PRD §36–§44 and §60.

### CRITICAL

**S-1 — `SUPABASE_SERVICE_ROLE_KEY` used with an anon-key fallback.**
`persistence.ts:24-34` builds a client with `service || anon`. The service-role key bypasses
RLS entirely. When the fallback is taken, any party holding the anon key (which is *public*
by design, since it is a `NEXT_PUBLIC_*` value inlined into the client bundle) can write the
global snapshot row. Mitigation: PostgreSQL with server-only credentials (PRD §38, §39).

**S-2 — Global snapshot write is not authorised per user.**
`persistSnapshot()` upserts the single row `global-v1` containing account, orders, positions
and journal. There is no ownership column and no user scoping. Any authenticated session can
trigger a write that overwrites **all** application state for **all** users.
PRD §36/§60 require authorization; PRD §5 requires user-scoped domain data.

### HIGH

**S-3 — `middleware.ts` fails open when Supabase env is absent.**
`authEnabled()` returns `false` when `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` are unset, and
middleware then calls `NextResponse.next()` for **every** path, including `/api/orders`,
`/api/engine/*`, and `/api/settings/exchange`. The comment calls this "mode demo/dev", but the
identical branch runs in production if env is misconfigured. PRD §36 requires protected
routes. Mitigation: require an explicit `SOFIA_DEMO_MODE=true`; otherwise default to deny.

**S-4 — Unauthenticated engine control in demo mode.**
Because of S-3, `POST /api/engine/start` is reachable without a session whenever auth env is
missing. It starts a server-side `setInterval` loop. With no rate limiting (S-6), repeated
calls allow loop starts / resource exhaustion. PRD §30 requires emergency-stop to be a real
execution-level control, and §60 requires rate limiting.

**S-5 — Provider error text is returned to the client.**
`api/sofia-chat` returns `[LLM gagal (${m.slice(0, 120)})]`, and `ai-router.ts` composes
`"Semua provider gagal (...): ${lastErr}"`. Upstream provider errors can echo request
payloads, model names, account identifiers, or partial auth hints. PRD §43: *"Do not expose
internal stack traces to users."*

### MEDIUM

**S-6 — No rate limiting on any endpoint.** Auth, AI, and engine-control routes are all
unthrottled. PRD §60 requires rate limiting.

**S-7 — No password hashing in the application.** `api/settings/security/password` delegates
to Supabase; no Argon2id is present. PRD §36 mandates *"a modern password hashing method such
as Argon2id"* and *"Passwords must never be stored plaintext."* Currently satisfied only
indirectly while Supabase Auth is in use, and lost at migration.

**S-8 — No CSRF protection.** All mutations are `POST` with cookie-based auth and no
origin/`SameSite` enforcement in application code. PRD §60 requires CSRF protection where
applicable.

**S-9 — No input validation.** `readJson<T>()` casts untrusted JSON to a caller-chosen type
without verification, then handlers consume fields directly. PRD §60 requires input
validation; PRD §23 requires that LLM output not be treated as sufficient evidence for
high-risk financial execution (output validation too).

**S-10 — No audit trail.** See §4.1(5). PRD §44 requires durable attribution for
`LIVE_UNLOCKED`, `EMERGENCY_STOP`, `API_KEY_CHANGED`, `TRADING_STARTED`.

---

## 9. Technical Debt Register

| ID | Debt | Location | Cost of delay | Fix phase |
|---|---|---|---|---|
| TD-1 | Global mutable singleton as the database | `store.ts`, `ai-store.ts`, `engine.ts` (`globalThis`) | no horizontal scale, no tests, lost updates | Phase 1 (abstraction) → Phase 2 (PostgreSQL) |
| TD-2 | Snapshot blob instead of relational schema | `persistence.ts`, `supabase/schema.sql` | no analytics, no memory retrieval, write amplification | Phase 2 |
| TD-3 | Hardcoded provider identity branches | `ai-router.ts` (2 sites: `p.id === "anthropic"` / `"gemini"`) | cannot route via 9Router without rewriting | Phase 1 (Gateway interface) → Phase 5 (9Router) |
| TD-4 | Three error envelopes | `api.ts`, route handlers, `middleware.ts` | inconsistent UX, leaked internals (S-5, S-15) | Phase 1 |
| TD-5 | Unsafe JSON cast in request parsing | `api.ts#readJson` | invalid payloads crash or silently degrade (S-9) | Phase 1 |
| TD-6 | Ad-hoc logging | `persistence.ts#logThrottled` (`console.warn`) | no observability, secrets risk (S-5) | Phase 1 |
| TD-7 | Client-component authenticated shell | `app/(app)/layout.tsx` | whole shell in client bundle, no SSR data loading | Phase 8 |
| TD-8 | Typo in comment (`"tiddak"`) | `store.ts:205` | signal of low review coverage | Phase 1 (fixed with refactor) |
| TD-9 | Missing CI checks (`typecheck`, `test`, `build`) | `package.json` | regressions invisible (PRD §62) | Phase 1 |
| TD-10 | No migration tooling | `supabase/schema.sql` | schema drift, no rollback | Phase 2 |
| TD-11 | No seeded/typed service clients | — | Paperclip/Hermes/9Router/n8n integration unstartable | Phase 1 (contracts) |
| TD-12 | `demoMode` derived from `NEXT_PUBLIC_*` at module scope in 3 client components | `login`, `register`, `header` | duplicated env wiring, client-baked flags | Phase 1 |

---

## 10. KEEP / REFACTOR / REPLACE / REMOVE Classification

Cross-checked against PRD §56's own KEEP/REFACTOR/REPLACE/REMOVE lists. Verdicts agree with
the PRD except where noted.

### KEEP (preserve as-is, protect with tests)

Next.js 14 · React 18 · TypeScript (strict) · Tailwind · Radix UI · TanStack Query ·
Recharts · zustand · 11 UI primitives · layout components (`sidebar`, `header`,
`bottom-nav`, `notification-bell`) · `indicators.ts` · `risk-engine.ts` (plus additive
checks) · `backtest.ts` · `strategies.ts` · `paper-engine.ts` · `decision.ts` ·
`performance.ts` · `scanner.ts` · `market-data.ts` (Bybit + `DataSource` provenance) ·
`currency.ts` (FX TTL + `API`/`FALLBACK` provenance) · `news.ts` · `prompts.ts` ·
`types.ts` (extend, do not rewrite) · the `loadSnapshot` boot invariant
(`engineState = "STOPPED"`, clear `halted`) · deterministic offline chat in
`sofia-fallback.ts`.

### REFACTOR (keep the idea, change the shape)

AI Router (gateway abstraction first) · persistence (repository interface first) ·
API architecture (PRD §41 namespace via additive routes + compatibility shim) ·
trading engine integration (isolate `engine.ts` loop behind a service boundary) ·
portfolio (normalise into `portfolio`/`assets`/`transactions`) · chat (intent + streaming) ·
dashboard (aggregated health + usage) · settings (server-only secrets, KDF for LIVE gate) ·
`ai-store.ts` budget/cache/usage (persist to `ai_usage`/`ai_costs`) ·
`ai-router.ts` provider identity (data-driven transport selection) · auth guard
(explicit `SOFIA_DEMO_MODE`, fail-closed) · `(app)/layout.tsx` (server shell + client nav).

### REPLACE (swap the mechanism)

Direct provider coupling → 9Router gateway client (Phases 5–7) · Supabase persistence →
self-hosted PostgreSQL with migrations (Phase 2) · Supabase Auth → local auth with
Argon2id (Phase 15 / TASK-017) · hardcoded model pricing → priced usage ledger
(`ai_requests`/`ai_costs`, PRD §19) · ad-hoc logging → structured logger (Phase 1) ·
unsafe `readJson<T>` → schema-validated parsing (Phase 1).

### REMOVE (delete, with backup note)

`src/types/database.ts` (250 lines, zero imports) · `src/lib/core/onchain.ts` (60 lines,
zero imports) · `src/lib/supabase/middleware.ts` (28 lines, dead duplicate of the real
middleware) · unused provider integrations **only after** 9Router is live (PRD §56 —
`ai-providers.ts` adapters are transport for the gateway in the interim, not waste) ·
duplicate local agent simulation (`DEFAULT_AGENTS` roster, after Paperclip client lands) ·
snapshot-blob persistence (after PostgreSQL migration, keeping a backup) · prototype-only
mock APIs not reachable from any page.

## 11. Recommended Phase-1 Entry Point

Per PRD §65/§66 (incremental milestones, never rewrite in one task), the next task after
this audit is **TASK-002 — Architecture Foundation**, scoped to be strictly additive:

1. `src/lib/config/*` — typed, validated, server-only environment loading
   (fixes S-13/S-14 hygiene, TD-12).
2. `src/lib/core/errors.ts` — single error taxonomy + PRD §43 user-safe messages
   (fixes S-5/S-15, TD-4).
3. `src/lib/core/logger.ts` — structured JSON logging, secret redaction
   (fixes TD-6, supports §44/§55).
4. `src/lib/services/*` — typed client contracts for Paperclip, Hermes, 9Router,
   OpenRouter, Local LLM, n8n, PostgreSQL, Redis (fixes TD-11; no business features).
5. `GET /api/health/services` — additive aggregated health for all 8 services (PRD §42);
   existing `/api/health` untouched.
6. `package.json` scripts — add `typecheck` and `test` placeholders for CI (TD-9).

Nothing in TASK-002 changes runtime behaviour of V1; it only adds the foundation the later
phases build on. Supabase code must keep working untouched until Phase 2 migrates it
(PRD §57: *"Remove Supabase dependency"* only after data is preserved).
**S-11 — `ENCRYPTION_KEY` is declared but unused.** `.env.local.example` defines it, yet no
module reads it. Exchange credentials posted to `/api/settings/exchange` therefore have no
at-rest encryption path. PRD §38 requires secrets to be *"encrypted at rest where persisted."*

**S-12 — `livePinHash` lives in global memory and inside the persisted snapshot blob.**
`store.ts` keeps `livePinHash` beside `liveUnlocked`. No documented KDF, salt, or rotation.
PRD §30/§61 require LIVE unlock to be a real, audited gate.

### LOW

**S-13 — `NEXT_PUBLIC_SUPABASE_*` naming.** Correct for these specific public values, but the
pattern invites future secrets to be prefixed the same way. PRD §37: *"Never expose secrets
through `NEXT_PUBLIC_*`."*

**S-14 — `.gitignore` secrets hygiene.** Only `.env*.local` is ignored, so a committed
`.env` or `.env.production` would **not** be ignored. Add `.env` and `.env.*` with
`!.env.example` negations. (Addressed in Phase 1.)

**S-15 — Error text mixes internal identifiers with UI copy** (`"NO_PROVIDER"`,
`"Unauthorized — login dulu"`), which both leaks internals and violates PRD §43's
requirement that errors be understandable and actionable.
   from Paperclip; keep `AgentStatus` as a *view* type, not a stored entity.
3. **Snapshot + journal dual-write** — `addJournal()` writes to both `s.journal` (in-memory,
   capped at 1000) and `sofia_journal` (Supabase). Two sources of truth for one record.
4. **`agentError`/`touchAgent` counters** duplicate what Paperclip heartbeats already provide.

### 7.5 Prototype-only / hardcoded remnants

- `ai-types.ts` `DEFAULT_PROVIDERS` hardcodes model pricing (including `0` for OpenRouter) in
  source. PRD §19: *"Do not rely permanently on hardcoded model pricing in application source
  code."*
- `currency.ts` `FALLBACK_RATE = 16_250` is a hardcoded FX value, but it is correctly
  provenance-flagged as `FALLBACK`, refreshed hourly, and self-heals to `API`. **Retain** —
  documented as intentional offline behaviour.
- `sofia-fallback.ts` deterministic chat is intentional and matches PRD §16 (local LLM
  unavailable → keep operating). **Retain.**
| `notify-telegram.ts` | 43 | **KEEP** | becomes an n8n/Hermes notification channel later (§35 forbids duplicate bots in phase 1) |
| `prompts.ts` | 75 | **KEEP** | prompt template store (PRD §49) |
| `types.ts` | 288 | **KEEP** | solid domain type vocabulary; extend, do not rewrite |
| `ai-store.ts` | 94 | REFACTOR | cache/budget/usage logic is good; must move behind gateway abstraction |
| `ai-providers.ts` | 111 | **REFACTOR → REPLACE** | raw provider adapters; becomes the 9Router/local-SDK transport |
| `ai-router.ts` | 141 | REFACTOR | keeps orchestration shape; provider identity must come from config data, not `if (p.id === ...)` |
| `store.ts` | 302 | **REFACTOR** | becomes a repository layer; `DEFAULT_AGENTS` must be removed (§47) |
| `engine.ts` | 264 | **KEEP + REFACTOR** | loop is sound; timer must not restart a HALTED engine |
| `persistence.ts` | 146 | **REPLACE** | Supabase-specific (PRD §57) |

### 6.3 Highest-value reuse for SOFIA 2.0

1. `risk-engine.ts` + `types.ts#RiskConfig` — directly satisfies PRD §31 with only additive
   checks.
2. `paper-engine.ts` — satisfies PRD §29 default `PAPER` mode and §61 safety ladder.
3. `indicators.ts` + `decision.ts` + `performance.ts` — reusable for the Finance/Crypto and
   Decision Engine modules (PRD §23, §26, §27).
4. `market-data.ts` `DataSource` provenance pattern — a good model to copy for the new
   service-health contract (PRD §42).
5. `ai-store.ts` budget/cache/usage — the seed for PRD §19/§20 cost and performance tracking.
4. **No rate limiting** anywhere. PRD §60 requires it, especially for AI and trading routes.

5. **No audit logging.** PRD §44 lists 13 mandatory audit events (`USER_LOGIN`,
   `MODEL_REQUEST`, `MODEL_FAILURE`, `MODEL_FALLBACK`, `AGENT_STARTED`, `AGENT_COMPLETED`,
   `TASK_CREATED`, `TASK_COMPLETED`, `TRADING_STARTED`, `TRADING_STOPPED`, `LIVE_UNLOCKED`,
   `EMERGENCY_STOP`, `API_KEY_CHANGED`). **Zero are emitted.** The in-memory `events` array is
   an operational log, not an audit trail (not durable, not acknowledged as an audit trail).

6. **`/api/health` is public and unauthenticated** — correct per PRD §42, but it must be
   extended to report all 8 services, not only engine/market/FX.
| `/register` | `app/(auth)/register/page.tsx` | Supabase sign-up |
| `/dashboard` | `app/(app)/dashboard/page.tsx` | 119 lines |
| `/command-center` | `app/(app)/command-center/page.tsx` | 322 lines — largest page |
| `/trading` | `app/(app)/trading/page.tsx` | manual trading |
| `/trading/auto` | `app/(app)/trading/auto/page.tsx` | auto trading |
| `/market` | `app/(app)/market/page.tsx` | scanner |
| `/market/watchlist` | `app/(app)/market/watchlist/page.tsx` | |
| `/market/news` | `app/(app)/market/news/page.tsx` | |
| `/portfolio` | `app/(app)/portfolio/page.tsx` | |
| `/backtest` | `app/(app)/backtest/page.tsx` | |
| `/strategy` | `app/(app)/strategy/page.tsx` | 245 lines |
| `/journal` | `app/(app)/journal/page.tsx` | |
| `/reports` | `app/(app)/reports/page.tsx` | |
| `/ai` | `app/(app)/ai/page.tsx` | insights |
| `/ai/performance` | `app/(app)/ai/performance/page.tsx` | |
| `/ai/router` | `app/(app)/ai/router/page.tsx` | |
| `/ai/prompts` | `app/(app)/ai/prompts/page.tsx` | |
| `/manager` | `app/(app)/manager/page.tsx` | SOFIA chat |
| `/settings` | `app/(app)/settings/page.tsx` | |
| `/settings/risk` | `app/(app)/settings/risk/page.tsx` | |
| `/settings/exchange` | `app/(app)/settings/exchange/page.tsx` | |
| `/settings/security` | `app/(app)/settings/security/page.tsx` | |
| `/settings/notifications` | `app/(app)/settings/notifications/page.tsx` | |

**Gap vs. PRD:** no `/agents`, `/projects`, `/tasks`, `/ai-company`, `/memory`, `/knowledge`,
`/decisions`, `/finance`, `/crypto`, `/automation`, or `/system`. These are Phase 3+ work.

**Notable:** `(app)/layout.tsx` is a **client component** (`"use client"`) that reads zustand.
This forces the entire authenticated shell into the client bundle and blocks server-side
data loading for layout-level state.