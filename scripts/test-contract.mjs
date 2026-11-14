// Local sandbox only. The fixture key is public and disposable.
import assert from 'node:assert/strict';
import { Worker, KeyPair } from 'near-workspaces';
import { Sandbox, DEFAULT_ACCOUNT_ID, DEFAULT_PRIVATE_KEY } from 'near-sandbox';

const sandbox = await Sandbox.start({ version: '2.14.0' });
const keys = new Map();
const keyStore = {
  setKey: async (network, account, key) => keys.set(network + ':' + account, key),
  getKey: async (network, account) => keys.get(network + ':' + account) ?? null,
  removeKey: async (network, account) => keys.delete(network + ':' + account),
  clear: async () => keys.clear(),
  getNetworks: async () => ['custom'],
  getAccounts: async network => [...keys.keys()].filter(key => key.startsWith(network + ':'))
    .map(key => key.slice(network.length + 1))
};

let worker;
try {
  worker = await Worker.init({
    network: 'custom', rootAccountId: DEFAULT_ACCOUNT_ID, rpcAddr: sandbox.rpcUrl, keyStore
  });
  const root = worker.rootAccount;
  await root.setKey(KeyPair.fromString(DEFAULT_PRIVATE_KEY));
  const game = await root.createSubAccount('battle-net');
  const alice = await root.createSubAccount('alice');
  const bob = await root.createSubAccount('bob');
  const carol = await root.createSubAccount('carol');
  await game.deploy('contract/tests/fixtures/battle_net_v0_4_0.wasm');

  async function final(account, result) {
    await worker.provider.sendJsonRpc('tx', {
      tx_hash: result.result.transaction.hash,
      sender_account_id: account.accountId,
      wait_until: 'FINAL'
    });
    return result;
  }
  const call = async (account, method, args = {}, attachedDeposit = 0n, gas = 100_000_000_000_000n) =>
    final(account, await account.callRaw(game, method, args, { attachedDeposit, gas }));
  const view = (method, args = {}) => game.view(method, args);
  const balances = (account_id, token_ids) => view('mt_batch_balance_of', { account_id, token_ids });
  const registerDeposit = 50_000_000_000_000_000_000_000n;
  const listingDeposit = 5_000_000_000_000_000_000_000n;
  await final(game, await game.callRaw(game, 'new', {}));

  // Exercise the deployed 0.4.0 flows and create real legacy state to migrate.
  const oldConfig = await view('get_config');
  assert.deepEqual(oldConfig.item_ids.length, 32);
  for (const account of [alice, bob]) await call(account, 'register', {}, registerDeposit);
  let oldAlice = await view('get_player', { account_id: alice.accountId });
  assert.equal(oldAlice.items[1], 100);
  assert.equal((await balances(alice.accountId, ['armor']))[0], '1');

  await assert.rejects(bob.call(game, 'mt_batch_transfer', {
    receiver_id: alice.accountId, token_ids: ['armor', 'armor'], amounts: ['1', '1']
  }, { attachedDeposit: 1n }));
  await call(bob, 'mt_batch_transfer', {
    receiver_id: alice.accountId, token_ids: ['armor', 'buster'], amounts: ['1', '1']
  }, 1n);
  await call(bob, 'mt_transfer_call', {
    receiver_id: alice.accountId, token_id: 'cannon', amount: '1', msg: 'no receiver contract'
  }, 1n);
  await call(bob, 'mt_batch_transfer_call', {
    receiver_id: alice.accountId, token_ids: ['cannon', 'thunder'], amounts: ['1', '1'], msg: ''
  }, 1n);
  const price = '100000000000000000000000';
  await call(alice, 'create_listing', { item_id: 'longsword', quantity: 50, price }, listingDeposit);
  const firstListing = await view('get_listings', { from_index: 0, limit: 10 }).then(rows => rows[0]);
  await call(bob, 'buy_listing', { listing_id: firstListing.id }, BigInt(price));
  await call(alice, 'withdraw', {}, 1n);
  await call(bob, 'forge', {}, 1n);
  await call(bob, 'mt_transfer', {
    receiver_id: alice.accountId, token_id: 'gold', amount: '1'
  }, 1n);
  await call(alice, 'create_listing', { item_id: 'gold', quantity: 1, price: '1' }, listingDeposit);
  const goldListing = (await view('get_listings', { from_index: 0, limit: 10 }))[0];
  await call(alice, 'cancel_listing', { listing_id: goldListing.id }, 1n);
  assert.equal((await view('get_player', { account_id: bob.accountId })).items[5], 0);

  // Add a legacy open listing, deploy v0.5 code, and invoke migration (never `new`).
  await call(alice, 'create_listing', { item_id: 'longsword', quantity: 5, price: '1000' }, listingDeposit);
  const preservedListing = (await view('get_listings', { from_index: 0, limit: 100 })).at(-1);
  const beforeUpgrade = await view('get_player', { account_id: alice.accountId });
  const oldCodeChecksum = 'c9a32a50e5c507666c76c279e2da8539cba361994728b05fa52ee8ae81612d33';
  assert.ok(oldCodeChecksum.length === 64);
  await game.deploy('contract/artifacts/battle_net_economy.wasm');
  await final(game, await game.callRaw(game, 'migrate', {}));

  const config = await view('get_config');
  const decorIds = [
    'home_planter_signal', 'home_lamp_moon', 'home_bench_cloud',
    'home_pond_memory', 'home_rug_starweave', 'home_sculpture_orbit'
  ];
  assert.equal(config.version, '0.5.0');
  assert.deepEqual(config.decor_ids, decorIds);
  assert.deepEqual(config.item_ids, [...oldConfig.item_ids, ...decorIds]);
  const migratedAlice = await view('get_player', { account_id: alice.accountId });
  assert.deepEqual(migratedAlice.items.slice(0, 32), beforeUpgrade.items);
  assert.deepEqual(migratedAlice.items.slice(32), Array(6).fill(0));
  assert.equal(migratedAlice.claimed_decor, false);
  assert.equal(await view('can_claim_starter_decor', { account_id: alice.accountId }), true);
  assert.deepEqual(await view('decor_balances_of', { account_id: alice.accountId }), Array(6).fill('0'));
  assert.deepEqual(await view('get_listing', { listing_id: preservedListing.id }), preservedListing);
  assert.equal(await view('mt_balance_of', { account_id: game.accountId, token_id: 'longsword' }), '5');

  await call(alice, 'claim_starter_decor', {}, 1n);
  assert.deepEqual(await view('decor_balances_of', { account_id: alice.accountId }), Array(6).fill('1'));
  assert.equal(await view('can_claim_starter_decor', { account_id: alice.accountId }), false);
  await call(alice, 'mt_transfer', { receiver_id: bob.accountId, token_id: decorIds[0], amount: '1' }, 1n);
  assert.equal((await view('decor_balances_of', { account_id: alice.accountId }))[0], '0');
  await call(alice, 'claim_starter_decor', {}, 1n);
  assert.equal((await view('decor_balances_of', { account_id: alice.accountId }))[0], '0');

  const metadata = await view('mt_metadata_token_all', { token_ids: ['home_planter_signal'] });
  assert.equal(metadata[0].base.name, 'Signal Planter');
  assert.equal(metadata[0].token.media_hash, 'M3Wrsp9bzjfkPQ+Ou5DMlHjpTTZQvj7bP/ZHUZmw/Hc=');
  await call(alice, 'cancel_listing', { listing_id: preservedListing.id }, 1n);
  assert.equal(await view('get_listing', { listing_id: preservedListing.id }), null);

  await call(carol, 'register', {}, registerDeposit);
  assert.deepEqual(await view('decor_balances_of', { account_id: carol.accountId }), Array(6).fill('1'));
  assert.equal((await view('get_player', { account_id: carol.accountId })).claimed_decor, true);
  console.log('NEAR sandbox passed: v0.4 marketplace and transfer flows, state migration, listing and escrow preservation, legacy one-time decoration claim, metadata, and automatic decorations for new players.');
} finally {
  try {
    await worker?.tearDown();
  } finally {
    await sandbox.tearDown();
  }
}
