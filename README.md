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

## How it works

```
 Party A ── HMAC(salt, terms) ──► commit_a ─┐
                                            ├──► on-chain stores digests only
 Party B ── HMAC(salt, terms) ──► commit_b ─┘

  1. Commit in secret   — both parties commit the same HMAC-SHA256 digest.
                          The real terms are never stored on-chain.
  2. Stay private       — while cooperating, both approve request_completion()
                          and the matter closes with full confidentiality.
  3. Dispute unlocks    — request_dispute() locks closure; open_dispute(terms,
                          salt) verifies the reveal against the committed digest
                          (and the on-chain sha256 identity commitment) and
                          publishes the terms.
  4. Each party inputs  — each submits its own statement and up to 3 evidence
                          URLs. Cooperative resolution only unlocks when BOTH
                          parties complete their input (evidence may be "none").
  5. AI jury consensus  — resolve_dispute() runs inside run_nondet_unsafe():
                          validators fetch the evidence pages on-chain, re-run
                          the LLM, and must agree exactly on who_won (A / B / DRAW).
                          Verdict + reasoning are stored; fetched text is
                          snapshotted by digest for later verification.
```

### Which contracts can you load?

The dApp only loads **Pacto contracts** — i.e. contracts deployed from
[`contracts/private_p2p_contract.py`](./contracts/private_p2p_contract.py) on the
configured GenLayer network (by default GenLayer Studio).

When you paste an address into **Contract of record**, the app:

1. validates it is a `0x…` address,
2. calls `get_state()` on it,
3. **checks the schema** — it must expose `party_a`, `party_b`, `status`, and
   `commit_a`. If any key is missing or the call fails, you get a clear error:
   *"This address is not a compatible Vacto contract."*

Any other (non-Pacto) contract — or an address from a different network — will
**not** load. Deploy the contract first (`genlayer deploy` or the in-app Deploy
Wizard), then paste the returned address.

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

**Vercel** is pre-configured — the app lives in `frontend/`, so set the project's
**Root Directory = `frontend`** (Project Settings → General → Root Directory, or choose
it during repo import). This cannot be set in `vercel.json` — that file only holds
`framework` / build commands:

```bash
npx vercel login
npx vercel --prod         # run from the repo root; Vercel uses Root Directory=frontend
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