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
- **Deck book:** exactly 30 chips, at most three copies of each, and one owned copy per deck copy. Add/remove cards, auto-fill, inspect focus costs, and equip a Focus Wand or Traveler’s Cloak.
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

**Testnet contract:** `battlenet.testnet` is running NEP-245 contract v0.5.0. It was funded through the testnet faucet. No mainnet account or funds have been used.

The in-game Trading Hall uses NEAR Connect and a **separate testnet inventory**. Players can register, create/buy/cancel escrowed card lots, forge gold cards, and withdraw sale proceeds. A wallet deck can use confirmed onchain cards in the same combat engine. Players can send chips and equipment to another registered wallet from the Trading Hall. Local victory claims never mint onchain assets.

The Rust contract uses NEP-245 for 38 stackable card, equipment, currency, and Pocket Home decoration types, with onchain token metadata for decor. New registrations receive the starter decor; existing v0.4 players can claim the set once. The artwork paths are project-relative, so external wallets/markets need a public media host to display it. Battle Net defines lot escrow, native NEAR settlement, and the 100-Longsword forge. A registration costs 0.05 testnet NEAR and a listing costs 0.005 testnet NEAR. Both storage deposits are nonrefundable. Lot prices cover the entire lot. See [contract API and deployment](docs/near-contract.md) and the [hackathon demo walkthrough](docs/near-demo.md).

No online PvP or authoritative battle reward server is implemented. Campaign and local gold saves are browser-owned and editable; they are never accepted as evidence of onchain asset ownership. Connect a testnet wallet to use the Trading Hall. The owner’s deployment key is stored in this Mac’s keychain.

## Verification

```sh
npm test                  # gameplay, deck, save, economy and NEAR adapter tests
npm run build             # bundles Phaser + wallet connector, validates every runtime art path
npm run test:contract      # Rust contract tests
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


## Exploring the network

New players start in Your Pocket, a flat personal base with six furniture types. Its gate leads to Relay Town, the main safe hub. Open the Decoration Console with Y to place, rotate, or store items. The layout saves locally. The east, south, and north gates open Verdant Circuit, Tideglass Aqueduct, and Lantern Archive. Enemies appear through random battles while moving through the routes. The gates at the far ends are sealed for future towns.

Use WASD or the arrow keys to walk, Shift to run, Y or Space to interact, Q/R to rotate the camera, and H to return to town. Pulse has eight directions of idle and walk sprites, including mirrored west-facing poses. Pulse has separate sprint frames. Press Y near a bench in Your Pocket to sit, and press Y again or move to stand. Press J to visit the legacy forest and B to edit the command folder. The Duel Pavilion offers same-keyboard matches and bot practice.

## World art refresh (0.4.1)

Running has no stamina cost, exhaustion, or recovery delay. The stamina HUD was removed. Wandering encounters start with E/Interact rather than proximity popups.

The overworld uses a cached textured ground layer with irregular road silhouettes, side trails, pond banks and material variation. Dense trees leave collision-tested corridors to every destination. New vegetation clusters, village fences and lamps, leaf drift, proximity labels, and a terrain-based minimap make the map easier to read. Old saved positions covered by the revised forest move to nearby clear ground.

Validation includes unlimited sprint, safe saved positions, and a complete path from the starting village to every landmark.


## NetBattle protocol (0.5.0)

Solo battles start with a paused Custom sidebar beside the visible arena. Random encounters enter through a screen fracture effect. Choose up to five chips with matching names or matching codes; wildcard chips link with any code. Enter sends the loadout in selection order. Z or 1 executes the next loaded chip. No focus cost, mid-round redraw, or discard reshuffle applies to solo NetBattles. Chips are spent once per battle. Folders contain 30 chips with up to three copies per chip. Both modes open with five shuffled chips. In solo battles, press C once the eight-second gauge fills. In local PvP, the shared timer opens Custom automatically every eight seconds of active combat.

The Custom Gauge fills over eight seconds of active battle time. C or the on-screen Custom button returns to chip selection when full. Unselected chips remain available; the selection window refills from the remaining folder. Unused loaded chips are spent when a new loadout is sent. Three Cannon chips selected together become the original TRI CANNON Program Advance, consuming all three copies for a triple-power shot. Full Custom fills the gauge; Fast Custom advances it by four seconds. Local PvP uses a fixed shared timer, independent of individual gauge boosts.

Hold Space (or touch Buster) to charge, release to shoot. Tap shots deal 5 base damage; a fully charged shot deals 40. Movement stays real-time on the connected 6×3 field. Y still triggers the character's existing Resolve ability.

Exploration now defaults to a jack-in network realm with connected platforms, service terminals, mystery data and battle nodes. Walking into the void is blocked. J toggles jack-in/jack-out to the preserved forest world. The game uses original characters and generated network art. Local PvP uses the shared Custom timer and private chip selection.

Verification: 59 JavaScript tests, including chip compatibility, Custom time freezing, single-use conservation, Program Advances, buster charging and network node reachability; browser checked chip selection, execution, Custom Gauge refill and network exploration.

## License

Original Battle Net code and its documentation are available under the [MIT License](LICENSE). Art, audio, fonts, and third-party packages are outside the scope of this grant and retain their applicable terms.
