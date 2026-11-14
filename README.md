# Battle Net

An original browser game inspired by the real-time grid combat and chip strategy of Mega Man Battle Network. Built as a prototype for the NEAR Hackathon's Games With Real Economies track: https://nearhackathon.com/ . All characters and art are original.

## Play locally

Requires Node.js 18+ for tests and Python 3 for the preview server. No npm dependencies.

```sh
npm run dev
```

Open http://localhost:4173 . Move with WASD or arrows, hold Space to fire, and use 1–5 to trigger chips. On touch devices, use the directional controls and FIRE button or tap a player panel. Chips have independent eight-second cooldowns. Longsword reaches two panels ahead in the same row; Cannon travels in a straight row; Thunder homes; Recover restores HP; Barrier absorbs damage. Enemy attacks mark an entire row before firing. Escape pauses. Battle wins award 30 credits and 5 Longswords, with increasing enemy HP in subsequent sectors.

Collection lets you replace any of five folder slots and equip purchased busters or armor between battles. The marketplace buys and sells both chips and equipment with a supply-dependent merchant price. A 35% merchant spread discourages immediate arbitrage. The last equipped copy cannot be sold. The forge consumes 100 standard Longswords and creates one Gold Longsword with identical damage and range. When the last regular copies are consumed, equipped slots switch to gold. The starter save includes exactly 100 copies for an immediate forge demo.

Inventory, credits, equipment and victories persist in localStorage. Arena state does not. The account button explains storage and offers a demo reset.

## Current status

**Playable local economy demo, not an onchain game yet.** There is no connected wallet, real money, multiplayer, player order book, or deployed NEAR contract. Demo credits cannot be redeemed. Local storage is editable and is not suitable for authoritative game assets. The hosted site is owner-private by default.

### NEAR implementation plan

- Represent chips and equipment as NEP-245 multi-tokens, including separate cosmetic finish token IDs. Keep the 100-to-1 burn/mint forge atomic onchain. Verify current standard details before implementation.
- Keep combat responsive offchain. A trusted battle service validates runs and issues bounded, nonce-protected rewards; client-reported victories never mint directly.
- Add NEAR sign-in and sponsored onboarding; use limited permissions for routine play. Wallet actions explicitly approve asset trades.
- Implement escrowed player listings with atomic payment and inventory settlement, cancel/refund flows, storage deposits, and indexed transaction history.
- Keep cosmetic rarity separate from combat stats. Audit contracts and run testnet integration tests before any real funds.

The game loop is intentionally usable before wallet onboarding. Every 30 seconds: dodge, position, shoot, use chips. Every few minutes: earn rewards, tune the folder, trade extras. Across sessions: collect cosmetic finishes and optimize equipment.

## Validation

```sh
npm test
```

Tests cover forge conservation and equal damage, balance/stock limits, equipped-item protection, dynamic prices, equipment ownership, rewards, and save validation. Static assets are served directly from `dist/`; there is no build step.

## Project structure

- `dist/index.html`, `dist/style.css`: responsive game interface
- `dist/app.js`: canvas arena, input, navigation, persistence, merchant and forge UI
- `dist/core.js`: catalog and deterministic inventory/economy operations
- `dist/assets`: art produced in the parallel asset chat (when available)
- `tests/economy.test.js`: economy integrity tests

No hackathon submission has been made. Submission materials and actual NEAR integration remain future work.
