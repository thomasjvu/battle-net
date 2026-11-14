# Battle Net

A full-screen **Phaser 3** card tactics adventure, built for the NEAR Hackathon. Original adult anime fantasy companions, a nine-chapter journey, real-time grid combat, and an owned-card economy. The game has no website navigation, dashboard, or scrolling page layout.

## Play and build

Requires Node.js 22.22.2+ and Python 3. Rust 1.98+ is needed only for contract work.

```sh
npm ci
npm run build
npm run dev
```

Open http://localhost:4173. Use the in-game fullscreen button in a browser that supports native fullscreen. The Codex embedded browser blocks native fullscreen; the game still fits its entire available viewport. The game uses a 1280×720 logical stage, preserves its aspect ratio, and supplies touch controls on touch devices. Landscape orientation is recommended.

### Controls

| Control | Action |
| --- | --- |
| Enter | Continue from the title screen |
| WASD / arrow keys | Move within your half of the battlefield |
| Space (hold) | Fire your wand |
| 1–5 / click a hand card | Play a card |
| E | Use your companion’s Resolve at 100% |
| Escape | Pause in battle / return from menus |
| Touch direction pad / WAND | Move / fire on touch devices |

## The game

- **Journey:** nine chapters across the Elderwood, Frostfall Reach, and Hollow Court. Bosses change attack patterns as their health falls. Nova joins after chapter three; Echo joins after chapter six.
- **Deck book:** exactly 12 cards, at most three copies of each, and one owned copy per deck copy. Add/remove cards, auto-fill, inspect focus costs, and equip a Focus Wand or Traveler’s Cloak.
- **Combat:** five-card opening hand; cards cost focus, are discarded on use, and are replaced after 0.7 seconds. Focus starts at three, regenerates at 0.85/second, and caps at six. The discard pile reshuffles when the draw pile runs out. Cards do not use the old independent cooldown system.
- **Combinations:** Frost Tide wets/freezes foes; Thunder doubles against wet/frozen foes, while Flame Wall shatters frozen foes for 1.5× damage. Advance temporarily claims ground; Leech Blade steals health; Quickening doubles wand damage.
- **Rewards:** victories award gold, experience, Longswords, and a choice of one of three cards. An unclaimed choice survives a reload.
- **Merchant:** supply-dependent prices, bulk buy/sell, and a seven-day NPC trade simulation. Copies in your deck and equipped gear are protected from sale.
- **Forge:** 100 Longswords become one Gold Longsword. Power, range and focus cost are identical. The deck is reconciled with your remaining inventory after forging; if it becomes incomplete, add another owned card before setting out.
- **Companions:** Pulse, Nova and Echo have original portraits and distinct drawn idle/attack poses, with different Resolve abilities.
- **Endless road:** escalating encounters and a boss every fifth wave. Completed waves earn local rewards when the run ends.
- **Journal/options:** seven one-time commissions, sound/music/volume controls, reduced motion support, export/import, and local reset.

The source catalog retains its original internal IDs (`cannon`, `buster`, etc.) to keep saves, tests, and the contract ledger compatible. Player-facing terminology and all loaded game art use the fantasy/card direction.

## NEAR economy

**Live contract deployment is intentionally on hold at the owner’s request.** No account or mainnet funds have been used. The contract is compiled and has passed a real local NEAR sandbox transaction suite.

The in-game Trading Hall uses NEAR Connect and a **separate testnet inventory**. Once a dedicated contract account is deployed and configured, players can register, create/buy/cancel escrowed card lots, forge gold cards, and withdraw sale proceeds. A wallet deck can use confirmed onchain cards in the same combat engine. The contract also supports card transfers via its public API. Local victory claims never mint onchain assets.

The Rust contract is a **custom multi-token ledger**, not a claim of full NEP-245 conformance. It has no external token integrations, admin minting endpoint, or client-controlled reward minting. Starter cards are granted once per registered account. Registration costs 0.05 testnet NEAR; a listing costs 0.005 testnet NEAR for storage. These storage deposits are nonrefundable. All lot prices are total prices, not per-card prices. See [contract deployment and API](docs/near-contract.md).

No online PvP or authoritative battle reward server is implemented. Campaign and local gold saves are browser-owned and editable; they are never accepted as evidence of onchain asset ownership. Native wallet signing and a dedicated deployed account remain the required live integration step.

## Verification

```sh
npm test                  # 30 gameplay, deck, save, economy and NEAR adapter tests
npm run build             # bundles Phaser + wallet connector, validates every runtime art path
npm run test:contract      # 13 Rust contract tests
npm run build:contract     # official cargo-near 0.23 toolchain; produces WASM + ABI
npm run test:integration   # NEAR 2.14 local sandbox; disposable accounts, no real funds
```

The sandbox suite deploys the actual WASM and checks registration, escrow, payment, seller withdrawal and callback, atomic forging, transfers, cancellation, duplicate registration, and callback privacy. It downloads the official sandbox binary on its first run and needs permission to bind local ports. The browser smoke test covered title → journey → deck book → battle → victory → card choice → journey.

## Source map

| Path | Responsibility |
| --- | --- |
| `src/game/index.js` | Phaser boot, loader, scene registration and viewport/fullscreen setup |
| `src/game/menus.js` | Title, journey, deck book, merchant, forge, party, journal, options and rewards |
| `src/game/combat-scene.js` | Phaser battlefield, sprites, effects, cards and input |
| `src/game/network-scene.js` | In-game NEAR Trading Hall and player listings |
| `src/game/state.js`, `ui.js` | Shared game services and canvas UI primitives |
| `dist/core.js`, `deck.js`, `combat.js`, `card-battle.js` | Framework-independent gameplay rules |
| `dist/near.js`, `near-config.json` | Testnet-only wallet/RPC adapter and public configuration |
| `dist/audio.js` | Synthesized battle music and effects |
| `dist/art-manifest.json` | Generated authoritative runtime art paths |
| `contract/` | Rust economy, tests, compiled WASM and ABI |
| `ASSETS.md` | Asset provenance, dimensions and anchors |

Original source art and previous visual iterations remain preserved in the asset tree for provenance. The build loads only the new fantasy set. No hackathon entry has been submitted.

The shipped runtime dependency advisory check (`npm audit --omit=dev`) returned zero advisories on 2026-11-14. The full development dependency tree still reports upstream NEAR build/test-tool advisories; the archive-extraction critical advisory was removed through a patched override. These tools are not included in the browser bundle. This is an advisory check, not a full security audit.
