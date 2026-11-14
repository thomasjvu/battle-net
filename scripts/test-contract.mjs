// Local sandbox only. Never uses a real network or user credentials.
import {Worker,KeyPair} from 'near-workspaces';
import {Sandbox,DEFAULT_ACCOUNT_ID,DEFAULT_PRIVATE_KEY} from 'near-sandbox';
import assert from 'node:assert/strict';
const sandbox=await Sandbox.start({version:'2.14.0'});
const keyMap=new Map();const keyStore={setKey:async(n,a,k)=>keyMap.set(n+':'+a,k),getKey:async(n,a)=>keyMap.get(n+':'+a)??null,removeKey:async(n,a)=>keyMap.delete(n+':'+a),clear:async()=>keyMap.clear(),getNetworks:async()=>['custom'],getAccounts:async n=>[...keyMap.keys()].filter(k=>k.startsWith(n+':')).map(k=>k.slice(n.length+1))};
let worker;
try{worker=await Worker.init({network:'custom',rootAccountId:DEFAULT_ACCOUNT_ID,rpcAddr:sandbox.rpcUrl,keyStore});await worker.rootAccount.setKey(KeyPair.fromString(DEFAULT_PRIVATE_KEY));}catch(e){await sandbox.tearDown();throw e;}
try{
 const root=worker.rootAccount;
 const game=await root.createSubAccount('battle-net');
 const alice=await root.createSubAccount('alice');
 const bob=await root.createSubAccount('bob');
 await game.deploy('contract/artifacts/battle_net_economy.wasm');
 await game.call(game,'new',{});
 const config=await game.view('get_config',{});
 for(const user of [alice,bob])await user.call(game,'register',{}, {attachedDeposit:BigInt(config.registration_deposit)});
 const before=await game.view('get_player',{account_id:alice.accountId});
 assert.equal(before.items[1],100);assert.equal(before.items[6],1);
 const id=await alice.call(game,'create_listing',{item_id:'longsword',quantity:50,price:'100000000000000000000000'},{attachedDeposit:BigInt(config.listing_deposit)});
 assert.equal((await game.view('get_player',{account_id:alice.accountId})).items[1],50);
 await bob.call(game,'buy_listing',{listing_id:String(id)},{attachedDeposit:100000000000000000000000n});
 assert.equal((await game.view('get_player',{account_id:bob.accountId})).items[1],150);
 assert.equal((await game.view('get_player',{account_id:alice.accountId})).proceeds,'100000000000000000000000');
 assert.equal(await game.view('get_listing',{listing_id:String(id)}),null);
 await alice.call(game,'withdraw',{}, {attachedDeposit:1n,gas:100000000000000n});
 const paid=await game.view('get_player',{account_id:alice.accountId});assert.equal(paid.proceeds,'0');assert.equal(paid.withdrawing,false);
 await bob.call(game,'forge',{}, {attachedDeposit:1n});
 const forged=await game.view('get_player',{account_id:bob.accountId});assert.equal(forged.items[1],50);assert.equal(forged.items[5],1);
 await bob.call(game,'transfer',{receiver_id:alice.accountId,item_id:'gold',quantity:1},{attachedDeposit:1n});
 assert.equal((await game.view('get_player',{account_id:alice.accountId})).items[5],1);
 const cancelled=await alice.call(game,'create_listing',{item_id:'gold',quantity:1,price:'1'},{attachedDeposit:BigInt(config.listing_deposit)});
 await alice.call(game,'cancel_listing',{listing_id:String(cancelled)},{attachedDeposit:1n});
 assert.equal((await game.view('get_player',{account_id:alice.accountId})).items[5],1);
 await assert.rejects(bob.call(game,'resolve_withdraw',{account_id:alice.accountId,amount:'999'}));
 await assert.rejects(alice.call(game,'register',{}, {attachedDeposit:BigInt(config.registration_deposit)}));
 console.log('NEAR sandbox passed: WASM deployment, initialization, registration, escrow, purchase, withdrawal + callback, atomic forge, transfer, cancellation, private callback protection, duplicate registration.');
}finally{await worker.tearDown();await sandbox.tearDown();}
