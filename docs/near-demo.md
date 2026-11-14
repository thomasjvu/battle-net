# Battle Net hackathon demo

**Track** · Games With Real Economies. The trading loop lets players purchase chips for a 30-chip combat folder or turn 100 Longswords into a tradable Gold Longsword.

## Record the local demo

1. Run `npm ci`, `npm run build` and `npm run dev` from the repository root. Open the local game and show the Chip Folder and a battle.
2. Run `npm run build:contract` and `npm run test:integration`. The integration script boots a local chain and uses two disposable accounts. It runs the game’s browser economy adapter through the sandbox with a fixture wallet signer.
3. Show the path in the sandbox script. Alice lists 50 Longswords for 0.1 NEAR. Bob buys them and goes from 100 to 150. Alice withdraws 0.1 NEAR. Bob burns 100 Longswords, receives one gold finish, and sends it to Alice. Both wallets can still form legal 30-chip folders. Show the terminal success line and the corresponding game inventory and folder screens. The local game screens use the offline collection while the terminal demonstrates wallet settlement.
4. The contract is deployed at `battlenet.testnet`, and the Trading Hall is configured for it. Connect two testnet wallets, register, select the quantity and total price, confirm the buy, withdraw, forge, then use **Send items**. Select **Travel with these cards** to review the folder.

## Submission evidence and open items

- The official rules allow a local-only prototype with a reproducible public repository and a video in a public X post. Tag @NEARProtocol and #NEARHackathon. The published deadline is November 14, 2026 at 6:59 p.m. New York time. The form requests the public repository link, public demo post and the team's mainnet payout address. The payout address is separate from the testnet contract. See [official hackathon rules](https://nearhackathon.com/HACKATHON.md).
- Code from the October 19 announcement through the deadline counts. For an existing project, document the baseline and link the submission diff using a dedicated branch or the specified tags. Verify repository visibility and add a team-approved license before submission.
- Local evidence includes WASM and ABI artifacts, Rust contract tests, browser adapter tests against the local chain, and JavaScript game tests. See [contract API and tests](near-contract.md).
- Remaining live checks are a two-wallet browser walkthrough with the wallet extension or popup and recording the demo video. Demo recording, publication and submission are separate team steps.
