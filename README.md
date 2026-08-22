# Vacto — Private Two-Party Agreements on GenLayer

Dua pihak menegosiasikan kontrak **tanpa pernah mempublikasikan isi kontrak ke blockchain**.
Isi hanya dibuka (reveal) jika terjadi sengketa — dan sengketa itu kemudian diadili oleh AI jury di GenLayer.

## Cara kerja (commit / reveal)

```
 Party A  ── HMAC-SHA256(salt, terms_a) ──>  commit_a  ─┐
                                                       ├──> on-chain: hanya digest yang tersimpan
 Party B  ── HMAC-SHA256(salt, terms_b) ──>  commit_b  ─┘

 1. Kedua pihak commit digest masing-masing (urutan bebas). Digest adalah
     **HMAC-SHA256 yang dikunci oleh salt** (rahasia tinggi-entropi ≥16 karakter
     yang dibagi off-chain) — pemegang chain tidak bisa brute-force terms dari
     digest (anti-correlation).
 2. Jika hash cocok → status ACTIVE, kontrak berjalan, terms tetap tersembunyi.
3. Alur normal  → kedua pihak masing-masing `request_completion()` (persetujuan
     2 pihak) → RESOLVED. Terms TIDAK PERNAH dibuka.
     Satu pihak saja TIDAK bisa menutup kontrak untuk "mengubur" sengketa.
     Bila mitra tidak kunjung merespons, peminta dapat `force_completion()`
     setelah jendela respons (default 7 hari) — mitra punya seluruh jendela itu
     untuk `request_dispute()` dan mengunci penutupan.
  4. Jika ada sengketa → pihak mana pun `request_dispute()` (mengunci penutupan
     privat seketika; permintaan yang tidak pernah dibuka `open_dispute` akan
     kadaluarsa setelah jendela 7 hari, jadi tidak bisa memblokir selamanya),
     lalu `open_dispute(terms, salt)` untuk reveal.
     - Hash tidak cocok    → MISMATCHED; pihak boleh `retract_commit()` sendiri,
       atau `reset_commits()` dua pihak → mulai dari awal.
     - Hash cocok          → DISPUTED, terms kini publik.
  5. Kedua pihak submit_statement() (boleh direvisi kapan pun) →
    `resolve_dispute()` → AI jury via `gl.vm.run_nondet_unsafe` dengan custom
    validator (pola yang dianjurkan docs): leader memberi putusan, setiap
    validator menjalankan ulang tugas yang sama, lalu consensus ditentukan
    dengan membandingkan **hanya field keputusan** `who_won` (A/B/DRAW) secara
    eksak. Verdict/reasoning bebas kata diambil dari leader — tanpa LLM
    pembanding kedua (lebih murah & tahan prompt-injection). Output LLM
    divalidasi ketat; skema invalid hanya revert dan bisa dicoba ulang —
    tidak pernah deadlock.
  6. Anti-stall arbitrasi: `open_dispute` membuka jendela resolusi
    (default 30 hari). Setelah lewat, `force_resolve_dispute()` tersedia:
    kedua statement ada → arbitrasi AI yang sama; hanya satu statement →
    default judgment untuk pihak yang merespons; belum ada statement → tetap
    terkunci sampai ada yang menyerahkan statement.
     Setiap transisi mencatat timestamp `*_at`/deadline yang diekspos lewat
     `get_state()`.

 7. Partial reveal (opsional): sesudah ACTIVE, kedua pihak bisa merekam
     digest per-klausa (`commit_clauses`, list harus identik — HMAC keyed
     `f"{salt}#{index}"`). Kapan pun, salah satu pihak dapat `reveal_clause`
     membuktikan SATU klausa saja (terverifikasi terhadap digest) dan
     mempublikasikannya tanpa membuka seluruh terms.
```

## Struktur project

```
├── contracts/
│   └── private_p2p_contract.py   # Intelligent Contract (GenVM)
├── deploy/
│   └── deployScript.ts           # deploy via genlayer-js, arg [partyA, partyB]
├── tests/
│   ├── direct/                   # unit tests (GenVM mocked LLM, tanpa network)
│   │   ├── conftest.py
│   │   ├── test_commit.py        # 7 tests (commit, retract, consent reset, hex guard)
│   │   ├── test_reveal.py        # 9 tests (reveal, 2-pihak completion, dispute lock)
│   │   ├── test_dispute.py       # 7 tests (arbitrasi, overwrite, consensus winner)
│   │   ├── test_deadlines.py     # 8 tests (timestamp, force close, force resolve, expiry)
│   │   ├── test_clauses.py       # 7 tests (HMAC commit, partial reveal, salt min)
│   │   └── test_clarification.py # 5 tests (request clarification nudge)
│   └── integration/              # butuh GenLayer Studio berjalan
├── frontend/                     # dApp Next.js + GenLayerJS
│   ├── app/                      # halaman utama (page.tsx, providers.tsx)
│   ├── components/               # CommitPanel, DisputePanel, ActionsPanel, DeployWizard, dst.
│   └── lib/
│       ├── contracts/            # wrapper kontrak + commit hash (WebCrypto)
│       ├── demo/                 # in-memory demo mode (DemoProvider, demoState)
│       ├── genlayer/             # client, wallet provider, fees
│       └── hooks/                # React Query hooks (usePrivateP2P)
├── gltest.config.yaml
├── requirements.txt
└── package.json                  # npm workspaces (root + frontend)
```

## Persiapan

- Python 3.12+, Node 20+ (workspace ini diuji pada Node 24)
- [GenLayer CLI](https://docs.genlayer.org) & (untuk integration test) GenLayer Studio
- MetaMask

```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1          # Windows (else: source .venv/bin/activate)
pip install -r requirements.txt

npm install                            # root (workspaces termasuk frontend)
```

Salin `.env.example` ke `.env` dan isi `PARTY_A_ADDRESS` / `PARTY_B_ADDRESS`.

## Verifikasi kontrak

```bash
# Lint (genvm-linter)
$env:PYTHONIOENCODING="utf-8"                  # penting di Windows
.\.venv\Scripts\genvm-lint.exe check contracts/private_p2p_contract.py

# Unit tests (GenVM mocked, langsung jalan tanpa network)
$env:PYTHONIOENCODING="utf-8"
.\.venv\Scripts\python.exe -m pytest tests/direct/ -v          # 43 passed

# Integration tests (butuh GenLayer Studio berjalan)
.\.venv\Scripts\python.exe -m pytest tests/integration/ -v -s
```

## Deploy

```bash
# Jalankan localnet/network GenLayer, lalu:
genlayer deploy --network http://127.0.0.1:4000/api#eth --contract-file contracts/private_p2p_contract.py \
  --args <PARTY_A_ADDRESS> <PARTY_B_ADDRESS>
# atau via deploy script TS
npx tsx deploy/deployScript.ts
```

Catat address kontrak, lalu set `NEXT_PUBLIC_CONTRACT_ADDRESS` di `frontend/.env`.

## Deploy ke Vercel

`vercel.json` di root sudah menyetel `rootDirectory: "frontend"`, jadi Vercel otomatis
membangun hanya folder `frontend` sebagai Next.js.

1. Set **Environment Variables** di project Vercel (atau `.env.production`):
   - `NEXT_PUBLIC_CONTRACT_ADDRESS` (opsional, kosongkan untuk load di UI)
   - `NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api`
   - `NEXT_PUBLIC_GENLAYER_CHAIN_ID=61999`
   - `NEXT_PUBLIC_GENLAYER_CHAIN_NAME=GenLayer Studio`
   - `NEXT_PUBLIC_GENLAYER_SYMBOL=GEN`
2. Deploy via CLI:
   ```bash
   npx vercel login
   npx vercel --prod       # dari root repo (vercel.json mengarah ke frontend/)
   ```
   atau impor repo `dhozil/vacto` dari dashboard Vercel (framework Next.js terdeteksi otomatis).

> Route `/api/contract` membaca `contracts/private_p2p_contract.py` relatif dari
> root repo — pastikan folder `contracts/` ikut di-commit agar Deploy Wizard bisa
> mengambil kode kontrak di produksi.

## Menjalankan dApp

```bash
cd frontend
npm run dev        # buka http://localhost:3000
```

Alur di UI:

1. **Connect wallet** (MetaMask).
2. Set `Contract Address` pada bar di atas (bila env kosong).
3. **Commit** — kedua pihak menulis terms; frontend menghitung `sha256(terms+salt)`, hanya hash yang dikirim on-chain.
4. **Actions (ACTIVE)** — `Approve & keep private` membutuhkan persetujuan **kedua pihak**; setelah jendela respons, peminta bisa `Force close`. `Request dispute (lock completion)` mengunci penutupan privat; permintaan yang tak dibuka kadaluarsa setelah 7 hari. **Clause proofs**: rekam digest per-klausa (identik dari kedua pihak) lalu buktikan satu klausa saja (`Prove this clause`) — sisa terms tetap privat. Bila MISMATCHED: `Retract my commit` (sepihak) atau `Reset commits` (dua pihak).
5. **Dispute** — paste terms pasangan + salt (dari "My terms" hasil commit), keduanya submit statement (bisa direvisi), lalu `Resolve with AI jury`; setelah jendela resolusi (30 hari) tersedia `Force resolve` (default judgment bila hanya satu statement). **Request clarification**: nudge mitra untuk merevisi statement bila kurang jelas.

6. **Deploy Wizard** — klik "Deploy New Contract" di hero section untuk deploy kontrak baru langsung dari UI. Masukkan alamat Party B, review, lalu deploy.

7. **Demo Mode** — klik "Start Demo" untuk mencoba seluruh alur tanpa network. State disimpan di localStorage; bisa switch party, reset, atau end demo kapan saja.

> Hasil arbitrasi diputuskan oleh AI jury di GenLayer — pemanggilan LLM yang
> non-deterministik dibungkus consensus `run_nondet_unsafe`: semua validator
> menjalankan tugas yang sama dan hanya field keputusan `who_won` yang harus cocok
> persis, mengikuti pola "custom validator" yang direkomendasikan dokumentasi
> GenLayer (bukan wrapper `prompt_comparative`).

## Catatan teknis

- **Deterministic keyed hash**: commit dihitung sebagai
  `HMAC-SHA256(key=salt, msg=terms)` (`hmac.new(salt, terms, sha256).hexdigest()`).
  Frontend memakai WebCrypto (`crypto.subtle` HMAC) sehingga identik dengan
  kontrak. Salt wajib ≥16 karakter (`_MIN_SALT`), karena ia adalah kunci rahasia —
  digest on-chain tidak bisa di-brute-force.
- **Partial reveal**: terms dapat dipisah klausa dengan marker `\n---\n`
  (helper `split_clauses`/`computeClauseHashes` di frontend & conftest). Digest
  per-klausa = `HMAC-SHA256(key=f"{salt}#{index}", msg=clause)`. Kedua pihak
  harus merekam list identik; `reveal_clause` hanya mempublikasikan klausa itu.
- **State machine**: `CREATED → PARTIAL → ACTIVE → DISPUTED → RESOLVED`, plus `MISMATCHED`.
- **Int vs u256**: GenVM tidak mendukung `int`; kode kontrak memakai `u256`/`bigint` sesuai standar SDK.
- **Windows + direct tests**: `gltest` melakukan `os.unlink()` pada file temp yang masih terbuka.
  `tests/direct/conftest.py` mem-patch `os.unlink` dengan guard `OSError` sebagai workaround.
- **Anti-stall (deadline)**: waktu dibaca dari `datetime.now()` yang diganti GenVM
  dengan timestamp transaksi (bukan jam node), sehingga deterministik. Jendela
  default: respons completion 7 hari, buka dispute 7 hari, resolusi 30 hari
  (konstanta kelas `_RESPONSE_WINDOW_SECONDS`, `_DISPUTE_OPEN_WINDOW_SECONDS`,
  `_RESOLVE_WINDOW_SECONDS` — bisa di-override per-instance di test).
  - `force_completion()`: hanya peminta pertama, setelah jendela respons —
    mitra punya seluruh jendela untuk `request_dispute()` dulu.
  - `request_dispute()` yang tak kunjung dibuka `open_dispute()` akan kadaluarsa
    dan membuka kunci completion lagi.
  - `force_resolve_dispute()`: setelah jendela resolusi — AI bila dua statement,
    default judgment bila satu, ditolak bila tak ada statement sama sekali.
- **Hardening keamanan** (hasil audit):
  - Penutupan privat wajib persetujuan **dua pihak** (`request_completion`) + lock `request_dispute`/`withdraw_dispute_request` — tak ada "satu pihak mengubur sengketa".
  - `retract_commit()` hanya menarik commit sendiri; `reset_commits()` penuh wajib **dua pihak** — tak ada sabotase sepihak.
  - Statement boleh direvisi; output AI jury divalidasi ketat (`A`/`B`/`DRAW`) — tak ada deadlock permanen.
  - Prompts dilindungi dari injection (data dibungkus marker), commit divalidasi 64-hex, semua input dibatasi panjangnya.
- **Request clarification**: selama dispute berlangsung, salah satu pihak bisa memanggil `request_clarification()` untuk menandai bahwa statement mitra perlu direvisi. Tidak ada batasan jumlah panggilan; timestamp dan pengirim tercatat di on-chain.