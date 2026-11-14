# NEAR testnet contract

Deployment is deliberately unconfigured until the owner supplies a dedicated testnet account. Do not deploy over an existing personal account. The frontend only accepts `.testnet`/implicit testnet account names and the official testnet RPC URL.

## Build and test

```sh
rustup target add wasm32-unknown-unknown
npm ci
npm run test:contract
npm run build:contract
npm run test:integration
```

`build:contract` uses the pinned npm-distributed cargo-near 0.23 CLI. The older globally installed cargo-near 0.13 cannot validate the bulk-memory opcodes emitted by current Rust. Artifacts are in `contract/artifacts/battle_net_economy.wasm` and the matching `_abi.json`/`_abi.zst`. The source pins `near-sdk` 5.30.2 and keeps `Cargo.lock`.

The integration suite starts NEAR Sandbox 2.14 through `near-sandbox`, then uses the test harness against that local RPC. Its default signing key is an intentionally public, disposable sandbox fixture provided by the package. It never reads user credentials or connects to testnet/mainnet. Stop and clean up the sandbox in `finally`.

## Deploy later

1. Create and fund a dedicated testnet account using a wallet or the NEAR CLI.
2. From the contract directory, use the official CLI's interactive deployment flow to deploy `artifacts/battle_net_economy.wasm` and call `new` with `{}`. Keep signing in the owner's wallet or CLI; never put private keys in the repository or browser configuration.
3. Verify `get_config` reports version `0.3.0`, standard `battle_net_custom_multi_token`, and the expected ordered item IDs.
4. Enter that account in the in-game Trading Hall, or set only the public `contractId` in `dist/near-config.json` and rebuild/publish.
5. Sign in with two testnet wallets, register both, list a small lot, buy it, withdraw proceeds, and verify the final balances. Wallet confirmations remain per transaction.

The build intentionally has no mainnet switch. A separate review and explicit owner authorization are required before using real funds. This implementation has unit and sandbox coverage; it has not had an independent full security audit.

## API

All quantity fields are positive JSON integers, capped at 10,000 per call. Listing IDs use decimal strings (`U64`); NEAR values use decimal yoctoNEAR strings (`U128`). No floating-point arithmetic is used for prices.

| Method | Args | Attached amount | Effect |
| --- | --- | --- | --- |
| `new` | `{}` | 0 | Initialize once |
| `get_config` | `{}` | 0 | Configuration and ordered item IDs |
| `get_player` | `{account_id}` | 0 | Inventory, pending proceeds, active listing count and withdrawal lock |
| `balance_of` | `{account_id,item_id}` | 0 | One item balance as a decimal string |
| `get_listings` | `{from_index?,limit?}` | 0 | Bounded page, max 100 active lots |
| `get_listing` | `{listing_id}` | 0 | One lot or null |
| `register` | `{}` | Exactly 0.05 NEAR | One-time starter inventory and persistent player storage |
| `transfer` | `{receiver_id,item_id,quantity}` | Exactly 1 yoctoNEAR | Move owned cards to a registered recipient |
| `forge` | `{}` | Exactly 1 yoctoNEAR | Burn 100 Longswords, mint one gold finish atomically |
| `create_listing` | `{item_id,quantity,price}` | Exactly 0.005 NEAR | Escrow a lot; `price` is the total lot price |
| `cancel_listing` | `{listing_id}` | Exactly 1 yoctoNEAR | Seller-only return of escrowed cards |
| `buy_listing` | `{listing_id}` | Exact lot price | Atomic item delivery and seller proceeds credit |
| `withdraw` | `{}` | Exactly 1 yoctoNEAR | Withdraw the caller’s proceeds through a transfer promise |
| `resolve_withdraw` | `{account_id,amount}` | 0 | Private callback; failed receipt restores the claim |

Item order: `cannon`, `longsword`, `thunder`, `recover`, `barrier`, `gold`, `buster`, `armor`, `shotgun`, `firewall`, `icewave`, `areagrab`, `charge`, `vampire`, `prism`, `repair`. Display names are supplied by the game catalog and can differ from the stable internal identifiers.

Registration grants 3 Arc Bolts, 100 Longswords, 2 Thunder, 3 Mend, 2 Ward, no gold finish, and one of each other standard card/equipment. Every account registers once. There is no scarce-supply claim or battle minting. Registration and listing storage deposits are nonrefundable; cancelled listings return items, not the storage fee. An account may have at most 20 active lots. Lot prices are capped at 1,000 NEAR. There is no trading commission.

Seller proceeds use a pull-payment model. Buying a lot makes no external transfer. Withdrawal zeros the claim and locks a pending withdrawal before scheduling a transfer; its private callback either clears the lock or restores the claim. New sales that arrive while the withdrawal is pending remain intact. Cancelled or sold lots cannot be consumed twice. Every mutation emits a `battle_net` event.

The 0.3.0 contract catalog contains 32 item IDs. It requires a fresh deployment; no existing onchain ledger migration is provided. The frontend rejects older catalogs. Live deployment remains on hold.
