# Live Test Report — GenLayer Studio (owner verification)

Live on-chain verification of the current contract (`21 methods`, incl.
`commit_identity` confirmation gating + `acknowledge_party`). Every write is an
owner-signed transaction on the free GenLayer Studio testnet; links below open in
the explorer (`https://explorer-studio.genlayer.com`).

Also verifies the two items requested by the GenLayer Steward:

1. identity hashes only become **operative after BOTH parties confirm** — a
   single party installing mismatched hashes never blocks a valid dispute reveal;
2. the full dispute integration path **completes both evidence submissions before resolution**.

Parties: Party A = `0xC20a3Eea87146D6a03ADd46278307bB944c76Eca`,
Party B = `0x9F5DcB8b5eb62E3B56D63EcC706a48D846c2d949`.
Terms + salt committed are the same single-line service-delivery dataset used in
the docs (`COMMIT = 05169a51…` / `faf12498…`).

---

## Contract A — full dispute, both evidence submissions before resolve

Address: [`0x4D2b2dF1F223653b0DA1A9843e5135236418c3cf`](https://explorer-studio.genlayer.com/address/0x4D2b2dF1F223653b0DA1A9843e5135236418c3cf)

| # | Method (signer) | Explorer tx |
|---|---|---|
| 1 | `commit_terms` (A) | … (see address page) |
| 2 | `commit_terms` (B) | … (see address page) |
| 3 | `commit_identity` (A) + (B) — identity **confirmed by both** → operative | … |
| 4 | `acknowledge_party` (B) | [`0x35d3d2aac924e5f1cf72c893ffdc654c70a9d782858e35af5cc8bdace4596c20`](https://explorer-studio.genlayer.com/tx/0x35d3d2aac924e5f1cf72c893ffdc654c70a9d782858e35af5cc8bdace4596c20) |
| 5 | `acknowledge_party` (A) | [`0x751342244f9099fa4de5ee90aa42815ab7b2ed843c046c905f40e0b6eea85044`](https://explorer-studio.genlayer.com/tx/0x751342244f9099fa4de5ee90aa42815ab7b2ed843c046c905f40e0b6eea85044) |
| 6 | `request_dispute` (B) | [`0x5e51244817e1ec0d12ae4196dcfe333110028d330d2bd68eb663c2dd929411d6`](https://explorer-studio.genlayer.com/tx/0x5e51244817e1ec0d12ae4196dcfe333110028d330d2bd68eb663c2dd929411d6) |
| 7 | `withdraw_dispute_request` (B) | [`0x74018d6de9848c4923c5a42b369ce8703b2cbe4af267228b258ca0da236b4f4d`](https://explorer-studio.genlayer.com/tx/0x74018d6de9848c4923c5a42b369ce8703b2cbe4af267228b258ca0da236b4f4d) |
| 8 | `request_dispute` (B, again) | [`0x2c42e05077ec30cb804ec9051dd4b085bd7003f2c96a0ad73be6eb4550659d94`](https://explorer-studio.genlayer.com/tx/0x2c42e05077ec30cb804ec9051dd4b085bd7003f2c96a0ad73be6eb4550659d94) |
| 9 | `open_dispute` (A) — reveal verified vs committed digest **and confirmed identity** → `DISPUTED` | [`0x9f01db28163072aceac729d26aa29cf5810ae472463988ef3d966ad22b36b380`](https://explorer-studio.genlayer.com/tx/0x9f01db28163072aceac729d26aa29cf5810ae472463988ef3d966ad22b36b380) |
| 10 | `submit_statement` (A) | [`0x9eb09d828bf0edc31a601b09bb13c808f51cc9e861f12a12defbded136141675`](https://explorer-studio.genlayer.com/tx/0x9eb09d828bf0edc31a601b09bb13c808f51cc9e861f12a12defbded136141675) |
| 11 | `submit_evidence` (A) — **evidence completed** | [`0xaca14585187b1125d2036fdae3d543404f3b846a69ccf7e96e312f406d7b6895`](https://explorer-studio.genlayer.com/tx/0xaca14585187b1125d2036fdae3d543404f3b846a69ccf7e96e312f406d7b6895) |
| 12 | `request_clarification` (A) | [`0xd5e28f14e46d3c3e540765952b7f1831cdc57ff485e64ea8cad6cecd469a7555`](https://explorer-studio.genlayer.com/tx/0xd5e28f14e46d3c3e540765952b7f1831cdc57ff485e64ea8cad6cecd469a7555) |
| 13 | `submit_statement` (B) | [`0x8b0d20029484281cf3dfb100e89b4ef729534d7d9379de145381646b520c1815`](https://explorer-studio.genlayer.com/tx/0x8b0d20029484281cf3dfb100e89b4ef729534d7d9379de145381646b520c1815) |
| 14 | `submit_evidence` (B) — **evidence completed** | [`0x600dab72d990fbd3db24dc718c26f955d46695ea3233fbef8117db4bce980aa5`](https://explorer-studio.genlayer.com/tx/0x600dab72d990fbd3db24dc718c26f955d46695ea3233fbef8117db4bce980aa5) |
| 15 | `resolve_dispute` (A) — live AI jury, validator consensus | [`0x146118fd21e4dfa64d6ee286bb94fc910ed8705c419b40b2d0ea882b0ad97068`](https://explorer-studio.genlayer.com/tx/0x146118fd21e4dfa64d6ee286bb94fc910ed8705c419b40b2d0ea882b0ad97068) |

Final state: `RESOLVED`, `who_won = DRAW`, `evidence_reviewed_a = 1`,
`evidence_reviewed_b = 1`, `resolve_attempts = 1`, `ack_a = 1`, `ack_b = 1`.

---

## Contract B — unilateral identity poisoning does NOT block a valid reveal

Protocol: A commits the real terms, then **unilaterally** records WRONG identity
hashes; B never confirms them (`identity_a` set, `identity_b` empty →
non-operative). A valid reveal with the real terms/salt **must still succeed**.

Address: [`0x67Bd6b86ad9be224c6b0d37B7d83AE11584918B0`](https://explorer-studio.genlayer.com/address/0x67Bd6b86ad9be224c6b0d37B7d83AE11584918B0)

| Step | Explorer tx |
|---|---|
| `commit_terms` (A) | [`0x40f44fd024662015858890ab51fd1940b84638f4a436b8907538aceaae2eb15c`](https://explorer-studio.genlayer.com/tx/0x40f44fd024662015858890ab51fd1940b84638f4a436b8907538aceaae2eb15c) |
| `commit_identity` (A) — **poisoned** (wrong sha256, unconfirmed) | [`0x82b7a5c04dcf5df177f1c299f069052d0e6d32e42d982586a35873ac88dc21b9`](https://explorer-studio.genlayer.com/tx/0x82b7a5c04dcf5df177f1c299f069052d0e6d32e42d982586a35873ac88dc21b9) |
| `commit_terms` (B) | [`0xc23ee79bb3e800613e30e51179ff97e0899a21af72a76ef2910402436b6aff28`](https://explorer-studio.genlayer.com/tx/0xc23ee79bb3e800613e30e51179ff97e0899a21af72a76ef2910402436b6aff28) |
| `open_dispute` (B) — real terms → **`DISPUTED`** (identity ignored, not operative) | [`0x998df7a3efbada24a2e31d412ee5cec7b0b118cf821f5faf1853500f5e1a03ba`](https://explorer-studio.genlayer.com/tx/0x998df7a3efbada24a2e31d412ee5cec7b0b118cf821f5faf1853500f5e1a03ba) |
| `submit_statement` (A) / `submit_evidence` (A) / `request_clarification` (A) | [`0x1dfd76f8d9cfbc0d5e080c6bc3a33e9bd18b0517c816e5d5f379cabd25e58220`](https://explorer-studio.genlayer.com/tx/0x1dfd76f8d9cfbc0d5e080c6bc3a33e9bd18b0517c816e5d5f379cabd25e58220) · [`0x15dd863e392c6d0a1776c537cc9d9b0cfb10104a738dbdd4299d6a60a0505751`](https://explorer-studio.genlayer.com/tx/0x15dd863e392c6d0a1776c537cc9d9b0cfb10104a738dbdd4299d6a60a0505751) · [`0x7bcbf1b902d1839505c12cd61ca2f2b82064df26c7313006aff30896c11c1983`](https://explorer-studio.genlayer.com/tx/0x7bcbf1b902d1839505c12cd61ca2f2b82064df26c7313006aff30896c11c1983) |
| `submit_statement` (B) / `submit_evidence` (B) | [`0x9b5d2c759e345d73a3f7e63571c5217a0d477dae192a108f0c886c94f20c9154`](https://explorer-studio.genlayer.com/tx/0x9b5d2c759e345d73a3f7e63571c5217a0d477dae192a108f0c886c94f20c9154) · [`0x1e8a810a63bfd4c20b697c404b55d81b9b91c77b280ba619899faaf83a736b82`](https://explorer-studio.genlayer.com/tx/0x1e8a810a63bfd4c20b697c404b55d81b9b91c77b280ba619899faaf83a736b82) |
| `resolve_dispute` → `RESOLVED` (`DRAW`) | [`0xafdf5f30f5e27aeff3eea493e85ecd824dad719bf6f7f6a785d0a8df4443684b`](https://explorer-studio.genlayer.com/tx/0xafdf5f30f5e27aeff3eea493e85ecd824dad719bf6f7f6a785d0a8df4443684b) |

Final: `status = RESOLVED`, `who_won = DRAW`, with `identity_a` set and
`identity_b` empty (unconfirmed poisoning) — reveal and full dispute completed
normally, proving the poisoning path is neutralized.

Note: deploy transactions are inspectable from each contract's address page
(linked above); every subsequent write is linked per step.