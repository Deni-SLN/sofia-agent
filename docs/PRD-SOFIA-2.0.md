# PRD — SOFIA 2.0
## Strategic Operations, Finance & Intelligent Assistant

**Version:** 2.0.0  
**Status:** Development Blueprint  
**Target:** Major refactor of the existing `Deni-SLN/sofia-agent` repository  
**Platform:** Self-hosted / Proxmox  
**Frontend:** Next.js / React / TypeScript  
**Primary Database:** PostgreSQL  
**LLM Gateway:** 9Router  
**Cloud LLM:** OpenRouter  
**Local LLM:** PC utama — RTX 2060 Super 8 GB  
**Agent Control Plane:** Paperclip  
**Agent Runtime:** Hermes  
**Automation:** n8n  
**Communication:** Telegram + Discord  
**Deployment:** Docker

---

# 1. Executive Summary

SOFIA 2.0 is an **AI Executive Intelligence Platform** that acts as the primary interface for controlling, monitoring, and interacting with a personal AI ecosystem.

SOFIA is **not** an LLM, simple chatbot, trading bot, agent framework, or replacement for Paperclip.

SOFIA sits above the existing infrastructure:

```text
SOFIA
  │
  ├── Paperclip  → AI Company / Control Plane
  ├── Hermes     → Autonomous Agent Runtime
  ├── 9Router    → LLM Gateway / Model Router
  ├── OpenRouter → Cloud Model Provider
  ├── Local LLM  → Optional Local Inference
  └── n8n        → Automation Engine
```

Primary goals:

1. Become a single executive interface.
2. Manage and monitor AI agents through Paperclip.
3. Use Hermes as autonomous worker/runtime.
4. Use 9Router as the unified LLM gateway.
5. Use OpenRouter as a cloud model pool.
6. Support local LLM as an optional inference provider.
7. Provide persistent memory and knowledge.
8. Provide decision intelligence.
9. Provide finance and crypto intelligence.
10. Provide a unified command center.
11. Integrate n8n for automation.
12. Provide observability, cost tracking, audit, and security.

---

# 2. Product Positioning

**SOFIA = Your Personal AI Executive Operating System**

SOFIA should not feel like a generic chatbot.

It should function as an executive cockpit that can:

- understand user intent;
- inspect the AI company;
- delegate work;
- monitor projects;
- analyze information;
- maintain long-term context;
- make structured decisions;
- coordinate agents;
- interact with automation;
- provide finance/crypto intelligence;
- monitor AI infrastructure.

---

# 3. Core Architecture Principles

## 3.1 SOFIA must not duplicate Paperclip

Paperclip is the source of truth for:

- organizations;
- agents;
- agent hierarchy;
- projects;
- goals;
- tasks/issues;
- dependencies;
- agent execution;
- heartbeat;
- agent governance;
- agent budgets;
- activity related to Paperclip execution.

If Paperclip already provides a capability, SOFIA should consume it through the Paperclip API rather than recreate it.

## 3.2 SOFIA owns intelligence/domain data

SOFIA is the source of truth for:

- memory;
- knowledge;
- decisions;
- decision journal;
- investment thesis;
- finance domain data;
- crypto domain data;
- trading domain data;
- user preferences;
- AI usage analytics where not already owned by the gateway.

## 3.3 9Router owns LLM routing

SOFIA should not hardcode direct provider integrations throughout the application.

Preferred flow:

```text
SOFIA
  ↓
LLM Gateway abstraction
  ↓
9Router
  ↓
Provider / Model
```

## 3.4 n8n owns automation

n8n should handle deterministic workflows, scheduled jobs, webhooks, API integrations, ETL, and notifications.

n8n must not become a mandatory middleman for every SOFIA request.

## 3.5 Local LLM is optional

The main PC is not required to run 24/7.

When local inference is unavailable, SOFIA must continue operating through cloud models.

---

# 4. Existing Infrastructure

## Proxmox

Current infrastructure:

```text
Proxmox
│
├── CT 101 — hermes-agent
│   ├── Hermes Agent
│   ├── 9Router proxy
│   └── Paperclip
│
├── CT 102 — Nextcloud
│
└── Docker services on Proxmox host
    └── existing applications/services
```

CT 101 contains:

```text
Hermes Agent
9Router proxy
Paperclip
```

Paperclip is located at:

```text
/opt/data/paperclip
```

Paperclip is bound locally on:

```text
127.0.0.1:3100
```

and exposed externally through the existing SSH reverse tunnel/public domain.

## n8n

n8n is hosted outside this Proxmox instance:

```text
https://auton8n.dsln.my.id
```

It must be treated as an external service accessed through HTTPS/API/webhooks.

## Main PC

Local AI machine:

```text
CPU: Intel Core i5-13400F
RAM: 32 GB DDR5
GPU: RTX 2060 Super 8 GB
NVMe Gen 3: 1 TB
NVMe Gen 4: 500 GB
HDD: 500 GB
SATA SSD: 128 GB
PSU: Corsair 550W 80+ Bronze
```

The local LLM server is optional and may be offline.

---

# 5. Source of Truth Matrix

| Data | Source of Truth |
|---|---|
| Organizations | Paperclip |
| Agents | Paperclip |
| Agent hierarchy | Paperclip |
| Projects | Paperclip |
| Goals | Paperclip |
| Tasks | Paperclip |
| Agent runs | Paperclip |
| Heartbeats | Paperclip |
| Agent governance | Paperclip |
| LLM routing | 9Router |
| Provider/model routing | 9Router |
| Automation workflows | n8n |
| SOFIA memory | SOFIA DB |
| Knowledge | SOFIA DB |
| Decisions | SOFIA DB |
| Investment thesis | SOFIA DB |
| Portfolio domain data | SOFIA DB |
| Trading domain data | SOFIA DB |
| User preferences | SOFIA DB |
| Authentication | SOFIA |
| AI request analytics | SOFIA / 9Router, depending on source |

Do not create duplicate Paperclip entities inside SOFIA.

---

# 6. High-Level Architecture

```text
                         USER
                           │
              ┌────────────┼────────────┐
              │            │            │
             Web        Telegram     Discord
              │
              ▼
       ┌───────────────────┐
       │       SOFIA       │
       │ Executive Layer   │
       └─────────┬─────────┘
                 │
      ┌──────────┼──────────┐
      │          │          │
      ▼          ▼          ▼
 Paperclip      n8n      SOFIA DB
      │                     │
      ▼                     ├── Memory
    Hermes                  ├── Knowledge
      │                     ├── Decisions
      ▼                     ├── Finance
   9Router                  └── Trading
      │
 ┌────┴────────────┐
 ▼                 ▼
OpenRouter      Local LLM
Cloud Models    RTX 2060S
```

---

# 7. Main Navigation

```text
SOFIA
│
├── Dashboard
├── Chat
├── Command Center
│
├── AI Company
│   ├── Agents
│   ├── Projects
│   ├── Tasks
│   ├── Goals
│   └── Runs
│
├── Intelligence
│   ├── Memory
│   ├── Knowledge
│   ├── Decisions
│   └── Research
│
├── Finance
│   ├── Overview
│   ├── Portfolio
│   ├── Stocks
│   └── Crypto
│
├── Trading
│   ├── Terminal
│   ├── Strategies
│   ├── Backtest
│   ├── Auto Trading
│   └── Risk
│
├── Automation
│   └── n8n
│
├── Models
│   ├── Providers
│   ├── Models
│   ├── Profiles
│   ├── Routing
│   ├── Usage
│   └── Costs
│
├── Activity
│
└── Settings
```

---

# 8. Dashboard

The dashboard is an executive overview.

## System Status

Display:

```text
Paperclip       ONLINE / OFFLINE
Hermes          ONLINE / OFFLINE
9Router         ONLINE / OFFLINE
OpenRouter      ONLINE / OFFLINE
n8n             ONLINE / OFFLINE
Local LLM       ONLINE / OFFLINE
Database        ONLINE / OFFLINE
Redis           ONLINE / OFFLINE
```

## AI Company

Display:

- active projects;
- pending tasks;
- running agents;
- blocked tasks;
- failed runs;
- completed tasks.

## AI Usage

Display:

- requests today;
- tokens today;
- cost today;
- monthly cost;
- most-used model;
- most-used provider.

## Finance

Display:

- portfolio value;
- daily P/L;
- weekly P/L;
- monthly P/L.

## Trading

Display:

- active positions;
- open orders;
- risk exposure;
- active signals;
- current mode.

---

# 9. Command Center

Command Center monitors the complete AI infrastructure.

## Infrastructure

```text
Paperclip
Hermes
9Router
OpenRouter
Local LLM
n8n
PostgreSQL
Redis
```

## Agent states

```text
ONLINE
IDLE
RUNNING
BLOCKED
FAILED
OFFLINE
```

## Project states

```text
ACTIVE
BLOCKED
COMPLETED
PAUSED
```

## Trading states

```text
PAPER
LIVE
STOPPED
EMERGENCY STOP
```

## Activity feed

Example:

```text
14:32 Hermes started task #123
14:33 Coding Agent created commit
14:35 QA Agent started validation
14:36 Task completed
```

---

# 10. SOFIA Chat

Chat is an interface, not the entire product.

The chat must support:

```text
Ask
Analyze
Command
Delegate
Monitor
Explain
Execute
```

Example:

```text
User:
"SOFIA, cek project PDF Tools."
```

SOFIA should inspect Paperclip and return:

```text
Project: PDF Tools
Progress: 72%

8 completed
2 running
1 blocked

Blocked:
PDF → CSV

Reason:
Dependency missing.

Actions:
[Assign Agent]
[Open Project]
[Resolve]
```

---

# 11. Executive Intent Engine

SOFIA must classify user intent.

Minimum intents:

```text
CHAT
QUESTION
RESEARCH
ANALYSIS
CREATE_TASK
CREATE_PROJECT
CHECK_PROJECT
AGENT_COMMAND
AUTOMATION
FINANCE
CRYPTO
TRADING
SYSTEM
```

Examples:

```text
"Bagaimana harga BTC?"
→ CRYPTO

"Buat aplikasi inventory."
→ CREATE_PROJECT

"Kenapa task backend gagal?"
→ CHECK_PROJECT

"Jalankan research tentang Nvidia."
→ RESEARCH
```

The intent system should be extensible.

---

# 12. Paperclip Integration

Create a typed client:

```text
lib/paperclip/
├── client.ts
├── agents.ts
├── projects.ts
├── tasks.ts
├── goals.ts
├── runs.ts
└── types.ts
```

Required operations:

```text
GET agents
GET projects
GET tasks
GET goals
GET runs
GET activity

CREATE task
UPDATE task
ASSIGN agent
CREATE project
```

Requirements:

- use Paperclip APIs;
- do not directly access Paperclip database;
- implement authentication securely;
- implement timeouts;
- implement retries where appropriate;
- handle Paperclip being temporarily unavailable.

---

# 13. Hermes Integration

Hermes is the autonomous worker/runtime.

Preferred flow:

```text
SOFIA
 ↓
Paperclip
 ↓
Hermes
 ↓
Task Execution
```

SOFIA should expose:

```text
Hermes status
Current task
Execution status
Last heartbeat
Last error
Recent activity
```

Any start/pause/resume/stop action must follow the supported Paperclip/Hermes control mechanism.

Do not create a second autonomous worker system inside SOFIA.

---

# 14. 9Router Integration

9Router is the unified LLM gateway.

Create:

```text
lib/router/
├── client.ts
├── types.ts
├── health.ts
├── routing.ts
└── usage.ts
```

SOFIA should use logical profiles:

```text
CHEAP
GENERAL
REASONING
CODING
VISION
RESEARCH
LOCAL
PREMIUM
```

Example:

```text
taskType = "coding"
profile = "CODING"
```

9Router resolves the actual model/provider.

---

# 15. OpenRouter Integration

OpenRouter is used as the cloud model pool behind 9Router.

The OpenRouter API key must be server-side only.

Never expose:

```text
NEXT_PUBLIC_OPENROUTER_API_KEY
```

or any equivalent client-side secret.

Required behavior:

- model selection;
- fallback;
- error handling;
- token usage;
- cost tracking;
- latency tracking;
- provider availability.

---

# 16. Local LLM Integration

Local LLM is hosted on the main PC.

The PC may be offline.

SOFIA must expose local status:

```text
ONLINE
OFFLINE
```

If local inference is unavailable:

```text
Local unavailable
        ↓
9Router
        ↓
OpenRouter
```

SOFIA must continue functioning.

The local provider should be configurable through an internal server-side URL such as:

```text
LOCAL_LLM_BASE_URL
```

Do not hardcode a specific runtime unless required by the deployment.

---

# 17. Model Routing

SOFIA must support:

```text
AUTO
LOCAL
CLOUD
```

Auto routing may consider:

```text
task
cost
quality
availability
latency
privacy
```

Example:

```text
Simple task
→ cheap model

Coding
→ coding model

Complex analysis
→ reasoning model

Private task
→ local model if available
```

---

# 18. Model Failover

Support configurable fallback:

```text
Primary
 ↓
Unavailable?
 ↓
Fallback
 ↓
Unavailable?
 ↓
Next fallback
```

Example:

```text
LOCAL
 ↓
OPENROUTER
 ↓
SECONDARY PROVIDER
```

Fallback events must be logged.

---

# 19. AI Cost Tracking

Record:

```text
provider
model
task_type
input_tokens
output_tokens
total_tokens
latency
cost
timestamp
agent
project
session
request_id
```

Dashboard:

```text
Today
This Week
This Month
By Model
By Provider
By Agent
By Project
```

Do not rely permanently on hardcoded model pricing in application source code.

---

# 20. AI Performance

Track:

```text
Requests
Tokens
Cost
Latency
Success
Error
Fallback
Model
Agent
```

Metrics:

```text
Cost per request
Average latency
Failure rate
Fallback rate
```

---

# 21. Memory Architecture

SOFIA has its own memory system.

Memory categories:

```text
SHORT_TERM
LONG_TERM
SEMANTIC
EPISODIC
PROJECT
DECISION
```

Suggested fields:

```text
id
type
content
metadata
source
importance
created_at
updated_at
```

Memory must be retrievable by relevance/context.

---

# 22. Knowledge

Knowledge is separate from memory.

Knowledge contains:

```text
Documents
Notes
Research
References
Technical documentation
Financial research
```

Memory contains:

```text
User/context information
Lessons learned
Historical interaction context
Project context
Decision history
```

Do not merge the two concepts into one generic table without a clear type model.

---

# 23. Decision Engine

SOFIA must use a structured decision framework.

Decision output may include:

```text
STRONG BUY
BUY
BUY ON PULLBACK
HOLD
REDUCE
SELL
WAIT
```

A decision must contain:

```text
Decision
Confidence
Thesis
Supporting Evidence
Risk
Invalidation
Action
Reasoning
Timestamp
```

LLM output alone must not be treated as sufficient evidence for high-risk financial execution.

---

# 24. Decision Journal

Decision journal fields:

```text
Decision ID
Asset
Decision
Thesis
Evidence
Entry
Stop Loss
Take Profit
Risk/Reward
Invalidation
Confidence
Model
Agent
Timestamp
Result
Post Mortem
Lesson
```

Decision journal should support historical review.

---

# 25. Multi-Agent Consensus

Preserve the existing parallel/consensus concept from SOFIA V1.

Target architecture:

```text
SOFIA
 │
 ├── Technical Agent
 ├── Fundamental Agent
 ├── Sentiment Agent
 └── Macro Agent
        │
        ▼
Consensus Engine
        │
        ▼
Decision
```

Where practical, agents should be managed/executed through Paperclip rather than simulated directly inside SOFIA.

---

# 26. Finance Module

Finance should include:

```text
Portfolio
Assets
Transactions
Cash
P/L
Allocation
Performance
Risk
```

Finance data must be isolated from AI orchestration data.

---

# 27. Crypto Module

Minimum:

```text
BTC
ETH
Watchlist
Market
Signals
News
Portfolio
Positions
```

Potential integrations:

```text
Bybit
OKX
Tokocrypto
CoinGecko
CoinMarketCap
```

All credentials must remain server-side.

---

# 28. Trading Engine

Existing SOFIA V1 trading logic should be migrated where valid.

Separate:

```text
UI
 ↓
Trading Service
 ↓
├── Strategy
├── Signal
├── Risk
├── Execution
└── Journal
```

Do not place trading logic directly in React components.

---

# 29. Trading Modes

Supported:

```text
PAPER
LIVE
```

Default:

```text
PAPER
```

Recommended rollout:

```text
PAPER
 ↓
SIMULATION
 ↓
READ-ONLY
 ↓
SEMI-AUTO
 ↓
LIVE
```

LIVE trading must not be implemented as the first milestone.

---

# 30. Emergency Stop

Emergency stop must be a real execution-level control.

It must not merely change a frontend state.

Conceptually:

```text
EMERGENCY STOP
      ↓
Trading Engine HALT
      ↓
Apply configured cancellation/stop policy
```

All emergency stop events must be audited.

---

# 31. Risk Engine

Preserve and harden the existing V1 risk engine.

Minimum:

```text
Max Position
Max Daily Loss
Max Exposure
Max Open Positions
Max Drawdown
Stop Loss Required
Minimum Risk/Reward
```

Risk checks must execute before live order execution.

---

# 32. Backtest

Preserve the existing backtest capability.

Required metrics:

```text
Initial Capital
Final Capital
ROI
Win Rate
Profit Factor
Max Drawdown
Sharpe
Trades
Average Win
Average Loss
```

Backtest must never have access to live execution credentials.

---

# 33. Strategy Engine

Strategy contains:

```text
Indicators
Entry
Exit
Risk
Parameters
```

Strategy may be used by:

```text
Backtest
Paper Trading
Live Trading
```

Live execution requires separate risk validation.

---

# 34. n8n Integration

n8n is external:

```text
https://auton8n.dsln.my.id
```

Use HTTPS/API/webhook integration.

n8n can handle:

```text
Schedules
Webhooks
API integrations
Database workflows
ETL
Notifications
External services
```

If n8n is unavailable:

```text
SOFIA = ONLINE
Automation = UNAVAILABLE
```

Do not make n8n mandatory for basic chat, Paperclip monitoring, or local/cloud LLM usage.

---

# 35. Telegram and Discord

Hermes is already connected to Telegram and Discord.

Do not create duplicate bots during the first phase.

Use existing integrations through Hermes and/or n8n where appropriate.

Avoid multiple services competing for the same Telegram/Discord events.

---

# 36. Authentication

SOFIA requires secure authentication.

Minimum:

```text
Login
Logout
Session
Password
Protected routes
Authorization
```

Passwords must never be stored plaintext.

Use a modern password hashing method such as Argon2id or a secure authentication framework.

---

# 37. Secrets

Expected environment variables may include:

```env
NODE_ENV=production

DATABASE_URL=
REDIS_URL=

SOFIA_BASE_URL=

PAPERCLIP_BASE_URL=
PAPERCLIP_API_KEY=

ROUTER_BASE_URL=
ROUTER_API_KEY=

N8N_BASE_URL=
N8N_API_KEY=

OPENROUTER_API_KEY=

LOCAL_LLM_BASE_URL=

AUTH_SECRET=
ENCRYPTION_KEY=
```

Never commit secrets.

Never expose secrets through `NEXT_PUBLIC_*`.

---

# 38. Secret Storage

Sensitive credentials must be:

- server-side;
- encrypted at rest where persisted;
- excluded from logs;
- excluded from client bundles;
- excluded from prompts;
- excluded from Git.

Examples:

```text
OpenRouter API key
Exchange API key
Exchange API secret
Paperclip credentials
n8n API key
Authentication secrets
```

---

# 39. Database

Migrate away from Supabase-specific persistence toward self-hosted PostgreSQL.

Suggested SOFIA tables:

```text
users
sessions
user_preferences

memory
knowledge

decisions
decision_evidence
decision_results

portfolio
assets
transactions

strategies
backtests

watchlists
market_snapshots

ai_requests
ai_usage
ai_costs

system_events
audit_logs
```

Paperclip data must remain in Paperclip's own data layer.

Do not create duplicate Paperclip tables.

---

# 40. Redis

Redis may be used for:

```text
Cache
Sessions
Rate limiting
Market data cache
Temporary state
Queues
```

Redis must not be the only permanent storage for important business data.

---

# 41. API Architecture

Suggested SOFIA API structure:

```text
/api
│
├── auth
├── chat
├── intelligence
├── memory
├── knowledge
├── decisions
│
├── paperclip
├── hermes
├── router
├── n8n
│
├── finance
├── crypto
├── trading
├── portfolio
├── backtest
│
├── models
├── usage
├── activity
└── health
```

---

# 42. Health System

SOFIA must expose health information for:

```text
Paperclip
Hermes
9Router
OpenRouter
Local LLM
n8n
PostgreSQL
Redis
```

Example:

```json
{
  "status": "healthy",
  "services": {
    "paperclip": "online",
    "hermes": "online",
    "router": "online",
    "openrouter": "online",
    "local_llm": "offline",
    "n8n": "online",
    "database": "online",
    "redis": "online"
  }
}
```

---

# 43. Error Handling

Errors must be understandable.

Bad:

```text
500 Internal Server Error
```

Better:

```text
Service unavailable.

9Router is currently unreachable.

Fallback:
OpenRouter available.

[Use OpenRouter]
```

Do not expose internal stack traces to users.

---

# 44. Activity / Audit

Log important actions:

```text
USER_LOGIN
MODEL_REQUEST
MODEL_FAILURE
MODEL_FALLBACK
AGENT_STARTED
AGENT_COMPLETED
TASK_CREATED
TASK_COMPLETED
TRADING_STARTED
TRADING_STOPPED
LIVE_UNLOCKED
EMERGENCY_STOP
API_KEY_CHANGED
```

Never log:

```text
API keys
Passwords
Secrets
Private credentials
Raw authentication tokens
```

---

# 45. SOFIA Executive Delegation

Example:

```text
User:
"Buatkan aplikasi inventory sederhana."
```

SOFIA should:

```text
1. Understand request
2. Determine/create project
3. Create project in Paperclip
4. Generate execution plan
5. Create tasks
6. Assign agents
7. Monitor execution
8. Review results
9. Report to user
```

Paperclip remains the orchestration source of truth.

---

# 46. AI Company

SOFIA should display Paperclip's organization structure.

Example:

```text
SOFIA COMPANY

CEO
│
├── CTO
│   ├── Backend Engineer
│   ├── Frontend Engineer
│   └── QA
│
├── Research Lead
│   └── Researcher
│
└── Finance Lead
    ├── Stock Analyst
    └── Crypto Analyst
```

This hierarchy should be loaded from Paperclip.

---

# 47. Agent Management UI

Display:

```text
Agent
Role
Status
Model
Project
Current Task
Last Run
Budget
```

Possible actions:

```text
View
Assign
Pause
Resume
Open in Paperclip
```

Do not create a duplicate agent database.

---

# 48. Project Management

SOFIA should provide an executive view:

```text
Project
Progress
Tasks
Agents
Blocked
Last Activity
```

CRUD should use Paperclip APIs where the entity belongs to Paperclip.

---

# 49. Prompt Management

Preserve the prompt-management concept from V1.

Categories:

```text
Prompt Templates
System Instructions
Agent Instructions
Decision Frameworks
Research Templates
Trading Templates
```

Never store secrets in prompts.

---

# 50. UI/UX

Design direction:

```text
Premium
Minimal
Professional
Dark-first
Data-dense
Responsive
```

Avoid:

- excessive gradients;
- excessive animation;
- gaming-style visuals;
- unnecessary cards;
- generic chatbot appearance.

SOFIA should feel like a professional command center.

---

# 51. Responsive Design

Target:

```text
Desktop
Tablet
Mobile
```

Mobile should prioritize:

```text
Chat
Dashboard
Command Center
Notifications
```

Desktop should provide:

```text
Sidebar
Full dashboard
Multi-column workspace
```

---

# 52. PWA

Maintain PWA capability:

```text
manifest
icons
installable
responsive
```

Optional future improvements:

```text
offline shell
service worker
push notifications
```

---

# 53. Performance

Application targets:

```text
Dashboard initial load < 2 sec
Standard API response < 500 ms
Health check < 2 sec
Chat streaming start < 2 sec
```

LLM generation time is external and should be measured separately.

---

# 54. Streaming

Chat should support streaming where the configured gateway supports it.

Flow:

```text
SOFIA
 ↓
9Router
 ↓
LLM
 ↓
stream
 ↓
SOFIA UI
```

---

# 55. Structured Logging

Use structured logs.

Example:

```json
{
  "timestamp": "...",
  "service": "sofia",
  "event": "llm_request",
  "model": "...",
  "requestId": "...",
  "latency": 1234
}
```

Never include credentials or secrets.

---

# 56. Existing Repository Migration

Repository:

```text
Deni-SLN/sofia-agent
```

Existing stack should be evaluated and reused where practical.

## KEEP

```text
Next.js
React
TypeScript
Tailwind
Radix UI
TanStack Query
Recharts

Trading indicators
Risk concepts
Backtest concepts
Strategy concepts
Journal concepts
Market UI
Watchlist UI
Command Center concept
AI performance concept
```

## REFACTOR

```text
AI Router
Persistence
API architecture
Trading engine integration
Portfolio
Chat
Dashboard
Settings
```

## REPLACE

```text
Direct provider coupling
Supabase-specific persistence
Hardcoded provider configuration
Agent simulation
Duplicate manager functionality
```

## REMOVE

```text
Unused provider integrations
Unused mock data
Duplicate state
Prototype-only APIs
Supabase-specific persistence
```

Do not delete reusable business logic without documenting why.

---

# 57. Supabase Migration

The existing Supabase integration should be removed from core persistence over time.

Migration strategy:

```text
Audit existing Supabase tables
        ↓
Create PostgreSQL schema
        ↓
Create migrations
        ↓
Migrate required data
        ↓
Update services
        ↓
Remove Supabase dependency
```

Do not destroy existing data without a backup.

---

# 58. Docker Deployment

SOFIA should support production deployment through Docker.

Recommended core stack:

```text
SOFIA
PostgreSQL
Redis
```

Do not unnecessarily bundle:

```text
Paperclip
Hermes
9Router
n8n
```

because those services already exist independently.

SOFIA communicates with them through APIs.

---

# 59. Deployment Architecture

Target:

```text
                         INTERNET
                            │
                ┌───────────┴───────────┐
                │                       │
           Telegram                  Discord
                │                       │
                └───────────┬───────────┘
                            │
                            ▼
                    ┌─────────────┐
                    │    SOFIA    │
                    └──────┬──────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
        Paperclip        Hermes          n8n
            │              │              │
            └──────┬───────┘              │
                   ▼                      │
                9Router                   │
                   │                      │
             ┌─────┴──────┐               │
             ▼            ▼               │
        OpenRouter     Local LLM           │
                           │               │
                           ▼               │
                       Main PC             │
                                           │
                                  External automation
```

---

# 60. Security Requirements

Minimum:

```text
Authentication
Authorization
Server-side secrets
Encryption
Audit logging
Rate limiting
Input validation
Output validation
CSRF protection where applicable
Secure cookies
HTTPS
```

Financial operations require stronger controls.

---

# 61. Trading Safety

Do not enable automatic live trading during initial implementation.

Before LIVE:

```text
PAPER
 ↓
Risk validation
 ↓
Security audit
 ↓
Execution testing
 ↓
Read-only exchange test
 ↓
Semi-auto
 ↓
Explicit user approval
 ↓
LIVE
```

All live operations must be auditable.

---

# 62. Testing

Required:

```text
Unit Tests
Integration Tests
API Tests
Authentication Tests
Security Tests
Paperclip Integration Tests
9Router Tests
OpenRouter Tests
Local LLM Fallback Tests
n8n Integration Tests
Trading Risk Tests
Build Tests
```

Minimum CI checks:

```text
lint
typecheck
test
build
```

---

# 63. Failure Scenarios

Test at minimum:

```text
Paperclip offline
Hermes offline
9Router offline
OpenRouter offline
Local LLM offline
n8n offline
Database unavailable
Redis unavailable
Model rate limit
Model timeout
Provider error
Invalid credentials
Agent execution failure
Trading API failure
```

SOFIA must degrade gracefully.

---

# 64. Backup

Back up:

```text
SOFIA PostgreSQL
SOFIA configuration
Paperclip data according to its own backup mechanism
Important secrets/configuration
Decision Journal
Knowledge
Trading records
```

Never rely only on the live server.

---

# 65. AI Coding Agent Rules

The coding agent MUST follow these rules:

```text
You are modifying an existing production-oriented Next.js project.

DO NOT rewrite the application from scratch.

First inspect the entire repository.

Before modifying any file:
1. Understand the architecture.
2. Identify dependencies.
3. Identify reusable components.
4. Identify existing business logic.
5. Identify dead code.
6. Identify duplicated functionality.

SOFIA must not duplicate Paperclip functionality.

Paperclip is the source of truth for:
- organizations
- agents
- projects
- goals
- tasks
- runs
- agent hierarchy
- agent execution

SOFIA is the source of truth for:
- memory
- knowledge
- decisions
- finance domain data
- crypto domain data
- trading domain data
- user preferences
- SOFIA-specific intelligence

9Router is the LLM gateway.

n8n is the automation engine.

Never expose API keys to the browser.

Never put secrets in NEXT_PUBLIC_* variables.

Do not directly access the Paperclip database.

Use Paperclip APIs.

Do not make n8n mandatory for basic SOFIA operation.

If Local LLM is unavailable, SOFIA must continue through cloud providers.

Do not implement LIVE trading until all safety requirements are implemented and tested.

Do not remove existing trading/risk/backtest functionality without documenting the reason.

After every major change:
- run TypeScript checks;
- run lint;
- run tests;
- run production build;
- report changed files;
- report remaining issues.
```

---

# 66. Development Strategy

Do not implement the entire product in one task.

Use incremental milestones:

```text
Phase 0
Repository Audit

Phase 1
Architecture Foundation

Phase 2
PostgreSQL Migration

Phase 3
Paperclip Integration

Phase 4
Hermes Integration

Phase 5
9Router Integration

Phase 6
OpenRouter

Phase 7
Local LLM

Phase 8
Executive Dashboard

Phase 9
Chat / Intent Engine

Phase 10
Memory / Knowledge

Phase 11
Decision Engine

Phase 12
Finance / Crypto

Phase 13
Trading Migration

Phase 14
n8n Integration

Phase 15
Security Hardening

Phase 16
Testing

Phase 17
Production Deployment
```

---

# 67. Task Breakdown

## TASK-001 — Repository Audit

```text
Audit the existing SOFIA repository.

Do not modify code.

Produce:
- architecture map
- dependency map
- route map
- API map
- database map
- reusable components
- dead code candidates
- security issues
- technical debt
- KEEP/REFACTOR/REPLACE/REMOVE classification

Save the report to:
docs/audit.md
```

## TASK-002 — Architecture Foundation

```text
Implement the SOFIA 2.0 architecture foundation.

Do not implement business features yet.

Create:
- service abstraction
- configuration system
- API client architecture
- error handling
- structured logging
- health checks

Do not break existing functionality.
```

## TASK-003 — PostgreSQL Migration

```text
Replace Supabase persistence with self-hosted PostgreSQL.

Create migrations.

Preserve required existing domain data.

Do not duplicate Paperclip entities.

Do not destroy existing data without backup.
```

## TASK-004 — Paperclip Client

```text
Create a typed Paperclip API client.

Implement:
- agents
- projects
- tasks
- goals
- runs
- activity

SOFIA must consume Paperclip as the source of truth.
```

## TASK-005 — Hermes Integration

```text
Integrate SOFIA with the existing Hermes runtime through the supported Paperclip workflow.

Implement:
- status
- task/execution visibility
- heartbeat visibility
- error visibility

Do not create a duplicate autonomous worker system.
```

## TASK-006 — 9Router

```text
Create a provider-agnostic LLM service.

SOFIA → 9Router.

Support logical profiles:
- general
- cheap
- reasoning
- coding
- vision
- research
- local
- premium

Do not expose provider API keys to the frontend.
```

## TASK-007 — OpenRouter

```text
Integrate OpenRouter behind the 9Router abstraction.

Support:
- model configuration
- fallback
- usage
- cost
- latency
- errors
```

## TASK-008 — Local LLM

```text
Implement optional local LLM support.

The local endpoint may be unavailable.

When unavailable:
- report OFFLINE;
- do not crash;
- continue using cloud providers.
```

## TASK-009 — Executive Dashboard

```text
Build SOFIA Executive Dashboard.

Show:
- infrastructure health
- agents
- projects
- tasks
- AI usage
- AI cost
- trading status
- finance overview
```

## TASK-010 — Chat and Intent

```text
Implement SOFIA executive chat.

Support:
- question
- research
- analysis
- project creation
- task creation
- agent commands
- finance
- crypto
- trading
- system status
```

## TASK-011 — Memory and Knowledge

```text
Implement:
- short-term memory
- long-term memory
- semantic memory
- project context
- decision memory
- knowledge storage/retrieval
```

## TASK-012 — Decision Engine

```text
Implement:
- structured decision framework
- evidence
- confidence
- risk
- invalidation
- action
- decision journal
```

## TASK-013 — Multi-Agent Consensus

```text
Migrate the existing AI parallel/consensus concept.

Use Paperclip-managed agents where appropriate.

Implement:
- technical
- fundamental
- sentiment
- macro
- consensus
```

## TASK-014 — Finance/Crypto

```text
Migrate and improve:
- portfolio
- watchlist
- market data
- crypto
- stocks
- finance analytics
```

## TASK-015 — Trading Migration

```text
Migrate existing trading functionality into isolated services.

Preserve:
- indicators
- strategy
- backtest
- risk
- paper trading
- journal

Do not enable live trading automatically.
```

## TASK-016 — n8n

```text
Implement optional n8n integration.

n8n is external:
https://auton8n.dsln.my.id

If n8n is unavailable, SOFIA must remain operational.
```

## TASK-017 — Security

```text
Implement:
- authentication
- authorization
- secret handling
- encryption
- audit logs
- rate limiting
- input validation
- secure cookies
```

## TASK-018 — Production

```text
Create production Docker deployment.

Include:
- SOFIA
- PostgreSQL
- Redis

Do not unnecessarily bundle external services.
```

---

# 68. Definition of Done

## Infrastructure

```text
[ ] Paperclip connected
[ ] Hermes connected
[ ] 9Router connected
[ ] OpenRouter connected
[ ] n8n connected
[ ] PostgreSQL connected
[ ] Redis connected
[ ] Local LLM optional
```

## Executive

```text
[ ] Dashboard
[ ] Chat
[ ] Command Center
[ ] Agent overview
[ ] Project overview
[ ] Activity
```

## Intelligence

```text
[ ] Memory
[ ] Knowledge
[ ] Decision Engine
[ ] Decision Journal
[ ] Multi-agent consensus
```

## AI

```text
[ ] Model profiles
[ ] Routing
[ ] Fallback
[ ] Token tracking
[ ] Cost tracking
[ ] Latency tracking
```

## Finance

```text
[ ] Portfolio
[ ] Stocks
[ ] Crypto
[ ] Watchlist
[ ] Journal
```

## Trading

```text
[ ] Strategy
[ ] Backtest
[ ] Risk
[ ] Paper trading
[ ] Live safety architecture
[ ] Emergency stop
```

## Security

```text
[ ] Authentication
[ ] Authorization
[ ] Secret encryption
[ ] Audit logs
[ ] Rate limiting
[ ] No client-side secrets
```

## Deployment

```text
[ ] Docker
[ ] PostgreSQL
[ ] Redis
[ ] Health checks
[ ] Production build
[ ] Backup strategy
```

---

# 69. MVP Definition

## MVP 1 — AI Executive Core

```text
SOFIA UI
+
Dashboard
+
Chat
+
Paperclip
+
Hermes
+
9Router
+
OpenRouter
+
Local LLM detection
+
Activity
```

## MVP 2 — Intelligence

```text
Memory
Knowledge
Decision Engine
Multi-Agent
```

## MVP 3 — Finance

```text
Portfolio
Crypto
Stocks
Trading
```

## MVP 4 — Automation

```text
n8n
Telegram
Discord
```

## MVP 5 — Production

```text
Security
Audit
Monitoring
Backup
Recovery
```

---

# 70. Final Architecture

```text
                         ┌─────────────┐
                         │    DENI     │
                         └──────┬──────┘
                                │
                  ┌─────────────┼─────────────┐
                  │             │             │
                 WEB        TELEGRAM       DISCORD
                  │
                  ▼
        ┌───────────────────────┐
        │         SOFIA         │
        │ Executive Intelligence│
        └───────────┬───────────┘
                    │
       ┌────────────┼─────────────┐
       │            │             │
       ▼            ▼             ▼
   PAPERCLIP       n8n        SOFIA DB
   Control Plane Automation   Intelligence
       │                         │
       ▼                         ├── Memory
    HERMES                       ├── Knowledge
       │                         ├── Decisions
       ▼                         ├── Finance
    9ROUTER                      └── Trading
       │
   ┌───┴──────────────┐
   ▼                  ▼
OPENROUTER         LOCAL LLM
Cloud              RTX 2060S
```

---

# 71. Final Product Principle

The final system must preserve this separation:

```text
SOFIA
= Executive Intelligence

PAPERCLIP
= AI Company / Control Plane

HERMES
= Autonomous Worker

9ROUTER
= LLM Gateway

OPENROUTER
= Cloud Model Pool

LOCAL LLM
= Optional Private/Local Inference

n8n
= Automation Engine
```

The objective is not to create another generic AI chatbot.

The objective is to create a **personal AI executive system where SOFIA becomes the unified command center for agents, projects, intelligence, finance, automation, and AI infrastructure.**
