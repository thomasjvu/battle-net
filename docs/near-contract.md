# NEAR testnet contract

The NEP-245 contract v0.5.0 is deployed at `battlenet.testnet` on NEAR testnet. Its migration preserved v0.4 player, supply, and listing state. The game reads this public account ID from `dist/near-config.json`. The contract has no mainnet configuration.

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

## Deployment record

The owner created `battlenet.testnet` through the NEAR testnet faucet using NEAR CLI 0.31.1. The CLI generated a FullAccess key and stored it in the Mac keychain. Initial deployment transaction: [HYxZpfZTGozd81VXsHEG1jsQfrCvpKRpw8cy17fEQh9f](https://explorer.testnet.near.org/transactions/HYxZpfZTGozd81VXsHEG1jsQfrCvpKRpw8cy17fEQh9f), v0.4.0 WASM checksum `c9a32a50e5c507666c76c279e2da8539cba361994728b05fa52ee8ae81612d33`.

The authorized v0.5.0 migration was deployed with the owner key. It uses `migrate`, never `new`, and ran in 18.9 Tgas. Transaction: [GWXE4fbUrGbzzCnvPrR5LRoSWPWaQHqJCfruHCMy6bKU](https://explorer.testnet.near.org/transactions/GWXE4fbUrGbzzCnvPrR5LRoSWPWaQHqJCfruHCMy6bKU). WASM SHA-256: `e9af6322f6988b577879f86bf8b0679ff2de7359486cf3fafe3567fb8147ee26`; deployed code hash: `GjD7CntJWqG9tMvkZ5TSaCu67A6JZuAcdHH5meKotrz1`.

   ```sh
   near contract deploy battlenet.testnet use-file contract/artifacts/battle_net_economy.wasm \
     with-init-call migrate json-args '{}' prepaid-gas '50 Tgas' attached-deposit '0 NEAR' \
     network-config testnet sign-with-keychain send
   ```

   Review the signer and target account before signing. Keep signing in the owner's wallet or CLI.

3. Verify the version is `0.5.0`, the standard is `nep245`, and all 38 item IDs match the game catalog.

   ```sh
   near contract call-function as-read-only battlenet.testnet get_config json-args '{}' network-config testnet now
   ```
4. Check the public contract ID is `battlenet.testnet` in `dist/near-config.json`.
5. Connect two testnet wallets in the Trading Hall, register both, list a small lot, buy it, withdraw proceeds, then verify balances. Wallet approvals are requested for each transaction.

The build intentionally has no mainnet switch. A separate review and explicit owner authorization are required before using real funds. This implementation has unit and sandbox coverage; it has not had an independent full security audit.


## Using the deployed contract

The contract account `battlenet.testnet` is the game’s program account. Its owner key lives in the NEAR CLI keychain on the Mac and the CLI has already used it to sign deployment. That key is not automatically imported into a browser wallet. Keep using `near ... sign-with-keychain` for owner actions. Players should connect separate testnet accounts. The contract account itself cannot register as a player.

Battle Net uses NEAR Connect with its current testnet wallet manifest. Meteor Wallet, Intear Wallet, Nightly, Ledger and the NEAR CLI currently declare the testnet and transaction-signing features this app filters for. Wallet support is read from a remotely updated manifest, so the popup reflects the current compatible choices. WalletConnect and Unity require a WalletConnect client, which this app does not configure. MyNearWallet does not currently advertise testnet support in that manifest and may not appear. Check the popup’s options before creating a new wallet. See the [NEAR Connect wallet manifest](https://raw.githubusercontent.com/hot-dao/near-selector/refs/heads/main/repository/manifest.json) and [connector documentation](https://github.com/azbang/near-connect#available-wallets-in-manifest).

Each player wallet needs its own testnet account and balance. Registration costs 0.05 NEAR plus gas. The contract owner’s remaining balance stays in `battlenet.testnet` and is not automatically sent to player accounts. Create player accounts with a testnet wallet or the sponsored faucet flow in the [NEAR CLI account guide](https://github.com/near/near-cli-rs/blob/main/docs/GUIDE.en.md). Open the Trading Hall, choose **Connect wallet**, select a wallet that appears, and confirm the account is a `.testnet` account. Register, then approve each transaction in that wallet.

## API

Game lot and legacy transfer quantities are positive JSON integers capped at 10,000 per call. NEP-245 amounts use decimal strings. Listing IDs use decimal strings (`U64`); NEAR values use decimal yoctoNEAR strings (`U128`). No floating-point arithmetic is used for prices.

| Method | Args | Attached amount | Effect |
| --- | --- | --- | --- |
| `new` | `{}` | 0 | Initialize once |
| `get_config` | `{}` | 0 | Configuration and ordered item IDs |
| `get_player` | `{account_id}` | 0 | 38-item inventory, pending proceeds, active listing count, withdrawal lock and starter-decor claim flag |
| `decor_balances_of` | `{account_id}` | 0 | Six decor balances in `decor_ids` order, as decimal strings |
| `can_claim_starter_decor` | `{account_id}` | 0 | Whether this registered account can claim its one-time decor set |
| `balance_of` | `{account_id,item_id}` | 0 | One item balance as a decimal string |
| `get_listings` | `{from_index?,limit?}` | 0 | Bounded page, max 100 active lots |
| `get_listing` | `{listing_id}` | 0 | One lot or null |
| `register` | `{}` | Exactly 0.05 NEAR | One-time starter inventory and persistent player storage |
| `claim_starter_decor` | `{}` | Exactly 1 yoctoNEAR | Idempotent one-time six-piece set for registered v0.4 players; returns `false` after a previous claim |
| `transfer` | `{receiver_id,item_id,quantity}` | Exactly 1 yoctoNEAR | Move owned cards to a registered recipient |
| `forge` | `{}` | Exactly 1 yoctoNEAR | Burn 100 Longswords, mint one gold finish atomically |
| `create_listing` | `{item_id,quantity,price}` | Exactly 0.005 NEAR | Escrow a lot; `price` is the total lot price |
| `cancel_listing` | `{listing_id}` | Exactly 1 yoctoNEAR | Seller-only return of escrowed cards |
| `buy_listing` | `{listing_id}` | Exact lot price | Atomic item delivery and seller proceeds credit |
| `withdraw` | `{}` | Exactly 1 yoctoNEAR | Withdraw the caller’s proceeds through a transfer promise |
| `resolve_withdraw` | `{account_id,amount}` | 0 | Private callback; failed receipt restores the claim |

The first 32 stable IDs and order are unchanged. The six Pocket Home IDs are appended in `decor_ids` order: `home_planter_signal`, `home_lamp_moon`, `home_bench_cloud`, `home_pond_memory`, `home_rug_starweave`, `home_sculpture_orbit`. Display names can differ from these IDs. New registrations receive one of each decoration. A player already registered on v0.4.0 receives the set through `claim_starter_decor` once. The contract reports migrated players with a 38-item inventory, preserving the original first 32 balances.

Registration grants 3 Arc Bolts, 100 Longswords, 2 Thunder, 3 Mend, 2 Ward, no gold finish, and one of each other standard card/equipment. Every account registers once. There is no scarce-supply claim or battle minting. Registration and listing storage deposits are nonrefundable; cancelled listings return items, not the storage fee. An account may have at most 20 active lots. Lot prices are capped at 1,000 NEAR. There is no trading commission.

Seller proceeds use a pull-payment model. Buying a lot makes no external transfer. Withdrawal zeros the claim and locks a pending withdrawal before scheduling a transfer; its private callback either clears the lock or restores the claim. New sales that arrive while the withdrawal is pending remain intact. Cancelled or sold lots cannot be consumed twice. Registration, forging, listing, settlement and withdrawal retain game-specific `battle_net` events. Token ownership changes also emit standard events.

The v0.5.0 upgrade kept the v0.4 player map under its original storage prefix and added a separate 38-item map. Existing player records are converted lazily when they first use a mutating method; views show the expanded balances without writing. The existing listing map, listing counter, supply and escrow were carried forward unchanged. Sandbox integration tested upgrade, balances, pending listing cancellation, the one-time legacy claim, metadata, and registration after migration.


## NEP coverage

[NEP-245](https://github.com/near/NEPs/blob/master/neps/nep-0245.md) core covers the 32 semi-fungible chip, equipment and finish IDs. `mt_token` returns a null owner for stackable types. Unknown IDs return null for token and supply, or zero for balance. Total supply includes escrow. The contract account reports escrow and cannot register as a player.

- Read ownership and supply with `mt_balance_of`, `mt_batch_balance_of`, `mt_token`, `mt_supply` and `mt_batch_supply`.
- Send with `mt_transfer` and `mt_batch_transfer`. Supply `receiver_id` and a `token_id`/`amount` pair for single transfers or `token_ids`/`amounts` arrays for batch transfers. An optional `memo` is recorded in the event. Attach one yoctoNEAR. Both accounts must have registered. Batch writes accept up to 32 entries. The wire type is U128 and each player’s balance is bounded by U64.
- `mt_transfer_call` and `mt_batch_transfer_call` additionally accept a `msg` for the receiver. The private resolver returns quantities used. Failed or malformed receiver results request a full refund, capped by the recipient’s remaining balances. Successful receivers return a same-length array of unused quantities.
- [NEP-297](https://github.com/near/NEPs/blob/master/neps/nep-0297.md) envelopes carry `mt_mint`, `mt_burn` and `mt_transfer` events. Moving into and out of escrow emits transfers. Forging burns exactly 100 Longswords and mints one Gold Longsword in the same receipt.

The contract implements the NEP-245 metadata extension for contract metadata, base/token metadata and `mt_token`; decoration metadata includes artwork SHA-256 hashes, rarity and placement size. Decoration media values currently use project-relative `assets/home/decor/cards/*.png` paths. They resolve inside the game build but need a public absolute or content-addressed host before external wallet/marketplace consumers can resolve them independently. The catalog's proposed supply figures are not onchain caps. Approval management and enumeration are not implemented. The game uses direct ownership and internal escrow. Registration is game-specific and prepays the player record. The contract has no NEP-145 storage interface. The game uses native NEAR for settlement. Its stackable items use NEP-245 in place of single-currency NEP-141 or individually unique NEP-171 assets and their extensions. Intents and third-party market integrations have not been validated.
