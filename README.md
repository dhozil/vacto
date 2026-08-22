<div align="center">

<img src="./frontend/public/logo.svg" width="120" height="120" alt="Vacto logo" />

# Vacto

**Private two-party agreements. Committed in secret, arbitrated by an AI jury on GenLayer.**

Your terms never touch the chain while both parties cooperate. Only when a dispute
arises are they revealed — and a validator-agreed AI jury settles them.

`commit/reveal` · `HMAC keyed` · `AI-arbitrated` · `partially provable`

</div>

---

Vacto is a two-party contract primitive for the GenLayer **World Computer**. Each
party commits a keyed digest instead of their agreement; the terms stay fully
private until an actual disagreement. When that happens, the contract reveals the
terms, collects each party's statement **and** on-chain evidence, then lets the
GenLayer validator network run an impartial AI arbitration — with enforceable,
replayable proof.

## High-level flow

```
 Party A ── HMAC(salt, terms) ──► commit_a ─┐
                                            ├──► on-chain stores digests only
 Party B ── HMAC(salt, terms) ──► commit_b ─┘

  1. Both parties commit → status ACTIVE. Terms stay OFF-chain.
  2. Happy path: both approve request_completion() → RESOLVED, private forever.
  3. Dispute: request_dispute() → open_dispute(terms, salt) reveals the terms.
  4. Each party submits a statement + evidence URLs (≤3, fetched on-chain).
  5. Resolve unlocks only when BOTH parties finish input →
     run_nondet_unsafe() lets every validator re-run the LLM and reach
     consensus on who_won (A / B / DRAW).
```

## Features

| Area | What Vacto gives you |
|------|----------------------|
| **Privacy** | Terms are **never** published while cooperating; only digests are on-chain |
| **Anti-correlation** | Commit = `HMAC-SHA256(key=salt, msg=terms)`; the salt is a high-entropy secret, so digests can't be brute-forced |
| **Identity on-chain** | Optional `commit_identity()` stores `sha256(terms)` + `sha256(salt)` — disputes are re-verified purely from chain state, tamper-proof |
| **Fair resolution** | `resolve_dispute()` is gated until **both** parties finish their input (statement + evidence) |
| **Evidence-backed jury** | Each party attaches up to 3 URLs; the jury fetches them on-chain and **only credits claims the fetched pages support**; the exact fetched text is snapshotted by digest |
| **Anti-stall** | Bounded response / open-dispute / resolution windows with `force_completion()` and `force_resolve_dispute()` so nobody can freeze the contract |
| **Partial reveal** | Commit per-clause digests and prove **one clause**: `commit_clauses()` / `reveal_clause()` |
| **Consensus safety** | Custom validator agrees only on the decision field; a divergent validator is rejected via `run_nondet_unsafe` |
| **No deadlocks** | AI output is validated; statements can be revised; resolution can be retried |

## Contract surface

**20 methods** (3 read + 17 write):

- **Read** — `get_state`, `is_private`, `am_i_party`
- **Commit** — `commit_terms`, `commit_identity`, `retract_commit`, `reset_commits`
- **Close** — `request_completion`, `retract_completion`, `force_completion`
- **Dispute** — `request_dispute`, `withdraw_dispute_request`, `open_dispute`, `submit_statement`, `request_clarification`, `submit_evidence`, `resolve_dispute`, `force_resolve_dispute`
- **Partial reveal** — `commit_clauses`, `reveal_clause`

## Security model

- Commit digests are validated `64-hex`; all inputs are length-capped to bound gas and prompt size.
- Statements and evidence are **bound to the party** that submits them — nobody can overwrite the other side.
- Cooperative resolution is **two-party gated**; a lone party can never bury a dispute.
- The AI prompt treats all inputs as untrusted data and must cite fetched evidence to credit a claim — if a page is unavailable it falls back to the terms and may rule `DRAW` rather than guess.
- Time comes from the deterministic transaction timestamp (`datetime` patched per tx), never the node clock.

## Repository map

```
.
├── contracts/
│   └── private_p2p_contract.py    # Intelligent Contract (GenVM)
├── deploy/deployScript.ts          # genlayer-js deploy helper
├── tests/
│   ├── direct/                     # on-GenVM unit tests (LLM/fetch mocked)
│   └── integration/                # live-network harness (Studio)
└── frontend/                       # Next.js dApp ("Vacto")
    ├── app/                        # pages, API gateway, icon/favicon
    ├── components/                 # dispute panels, deploy wizard, demo
    └── lib/                        # contract wrapper, hooks, demo engine
```

## Getting started

Requirements: Python 3.12+, Node 20+, GenLayer CLI, MetaMask (or any EIP-1193 wallet).

```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1        # Windows (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt

npm install                          # workspace root (installs frontend too)
```

### Verify the contract

```bash
# Lint (genvm-linter)
$env:PYTHONIOENCODING="utf-8"
.\.venv\Scripts\genvm-lint.exe check contracts/private_p2p_contract.py

# Contract tests (direct GenVM — no network needed)
$env:PYTHONIOENCODING="utf-8"
.\.venv\Scripts\python.exe -m pytest tests/direct/ -v        # 88 passed

# Frontend tests + build
cd frontend
npm test                                                     # 63 passed
npm run build
```

## Deploy the contract (GenLayer Studio — free)

```bash
npx --yes genlayer deploy \
  --contract contracts/private_p2p_contract.py \
  --rpc https://studio.genlayer.com/api \
  --args <PARTY_A_ADDRESS> <PARTY_B_ADDRESS>
```

Verified on Studio: a full two-party dispute (commit → reveal → statements →
evidence → clarification → live AI-jury consensus) runs end-to-end on-chain.

## Run / deploy the dApp

```bash
cd frontend
npm run dev                        # local → http://localhost:3000
```

**Vercel** is pre-configured (`vercel.json` with `rootDirectory: "frontend"`):

```bash
npx vercel login
npx vercel --prod
```

Set these env vars (see `frontend/.env.example`):

- `NEXT_PUBLIC_CONTRACT_ADDRESS` — optional; leave empty to load addresses in the UI
- `NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api`
- `NEXT_PUBLIC_GENLAYER_CHAIN_ID=61999`
- `NEXT_PUBLIC_GENLAYER_CHAIN_NAME=GenLayer Studio`
- `NEXT_PUBLIC_GENLAYER_SYMBOL=GEN`

> The `/api/contract` route serves `contracts/private_p2p_contract.py` relative to
> the repo root, so the Deploy Wizard works in production.

## Testing

- **88 contract tests** on the direct GenVM: commitments, two-party consent,
  deadlines & force paths, authentication guards, identity commitments,
  evidence validation + on-chain fetch, AI retry/divergence, and a two-user
  "appeal" head-to-head scenario.
- **63 frontend tests**: HMAC/commit utilities, clause hashing & templates,
  case-record export, transaction audit trail, deadline countdown, notification
  detector, demo state machine, and the professional sample agreement.

## Status

- Live on GenLayer Studio (verified end-to-end, including real AI arbitration).
- Contract: **20 methods**, lint-clean, no bare-exception warnings.
- Roadmap notes: migrate to the newer runner's `init_fetch_pages`/`fetch_pages`
  once available for canonical page pinning; add Playwright E2E.

---

<div align="center">

Built as a Vacto project — committed confidentiality, fair remediation.

</div>