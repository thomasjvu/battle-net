use super::*;
use near_sdk::serde_json::{json, Value};

type Approval = (AccountId, u64);
const MAX_BATCH: usize = 32;
const RESOLVE_GAS: Gas = Gas::from_tgas(30);

#[near(serializers = [json])]
#[derive(Clone)]
pub struct Token {
    token_id: String,
    token_metadata: Option<MTTokenMetadata>,
    base_metadata_id: String,
    owner_id: Option<AccountId>,
}

#[near(serializers = [json])]
#[derive(Clone)]
pub struct MTContractMetadata {
    spec: String,
    name: String,
}

#[near(serializers = [json])]
#[derive(Clone)]
pub struct MTBaseTokenMetadata {
    name: String,
    id: String,
    symbol: Option<String>,
    icon: Option<String>,
    decimals: Option<String>,
    base_uri: Option<String>,
    reference: Option<String>,
    copies: Option<u64>,
    reference_hash: Option<String>,
}

#[near(serializers = [json])]
#[derive(Clone)]
pub struct MTTokenMetadata {
    title: Option<String>,
    description: Option<String>,
    media: Option<String>,
    media_hash: Option<String>,
    issued_at: Option<String>,
    expires_at: Option<String>,
    starts_at: Option<String>,
    updated_at: Option<String>,
    extra: Option<String>,
    reference: Option<String>,
    reference_hash: Option<String>,
}

#[near(serializers = [json])]
pub struct MTTokenMetadataAll {
    pub base: MTBaseTokenMetadata,
    pub token: MTTokenMetadata,
}

struct DecorRecord {
    id: &'static str,
    name: &'static str,
    description: &'static str,
    media: &'static str,
    media_hash: &'static str,
    rarity: &'static str,
    grid_size: &'static str,
}

const DECOR: [DecorRecord; 6] = [
    DecorRecord {
        id: "home_planter_signal",
        name: "Signal Planter",
        description: "A hand-thrown clay pot with a bright little bloom. A favorite meeting place for tiny garden sprites.",
        media: "assets/home/decor/cards/signal-planter.png",
        media_hash: "M3Wrsp9bzjfkPQ+Ou5DMlHjpTTZQvj7bP/ZHUZmw/Hc=",
        rarity: "common",
        grid_size: "1 × 1",
    },
    DecorRecord {
        id: "home_lamp_moon",
        name: "Paper Moon Lamp",
        description: "A warm paper lantern, painted by hand with a tiny crescent moon. Its glow makes every late-night duel feel softer.",
        media: "assets/home/decor/cards/paper-moon-lamp.png",
        media_hash: "BhC6aFLtRioV1BqIwWFSH2EjPZNTy3XTeDxGRR/33N0=",
        rarity: "common",
        grid_size: "1 × 1",
    },
    DecorRecord {
        id: "home_bench_cloud",
        name: "Cloud Bench",
        description: "A smooth little bench with a cloud-soft cushion. Plenty of room to watch your cards shuffle.",
        media: "assets/home/decor/cards/cloud-bench.png",
        media_hash: "AyxGfABBZW8/r2ffJNjWsGIzUpKcfCFOHpgEsycJMkk=",
        rarity: "uncommon",
        grid_size: "2 × 1",
    },
    DecorRecord {
        id: "home_pond_memory",
        name: "Memory Pond",
        description: "A little bowl of clear water with a koi who never forgets a friendly face.",
        media: "assets/home/decor/cards/memory-pond.png",
        media_hash: "MhPM3NhvgEL55x/YzqmN4yZfhUGLacC2L0DKxBKupVA=",
        rarity: "rare",
        grid_size: "2 × 2",
    },
    DecorRecord {
        id: "home_rug_starweave",
        name: "Starweave Rug",
        description: "Soft woven cloth stitched with a star and a little path home. A familiar place to land after a long match.",
        media: "assets/home/decor/cards/starweave-rug.png",
        media_hash: "GteXSm9Wo2Agbq9PZJFlaU7hFjErW8pUrAPeqFAt+rY=",
        rarity: "uncommon",
        grid_size: "2 × 2",
    },
    DecorRecord {
        id: "home_sculpture_orbit",
        name: "Orbit Sculpture",
        description: "A hand-carved wooden bead hangs inside a brass ring, a tiny keepsake for the little worlds we carry.",
        media: "assets/home/decor/cards/orbit-sculpture.png",
        media_hash: "cwENkUQzKSNX8aNduSFeaygLxFgZ+prW0OviJrsG9cU=",
        rarity: "epic",
        grid_size: "1 × 1",
    },
];

fn decor_record(token_id: &str) -> Option<&'static DecorRecord> {
    DECOR.iter().find(|record| record.id == token_id)
}

fn token_metadata(token_id: &str) -> MTTokenMetadata {
    let record = decor_record(token_id);
    MTTokenMetadata {
        title: Some(record.map_or(token_id, |entry| entry.name).to_string()),
        description: record.map(|entry| entry.description.to_string()),
        media: record.map(|entry| entry.media.to_string()),
        media_hash: record.map(|entry| entry.media_hash.to_string()),
        issued_at: None,
        expires_at: None,
        starts_at: None,
        updated_at: None,
        extra: record.map(|entry| {
            json!({
                "rarity": entry.rarity,
                "grid_size": entry.grid_size,
                "category": "home_decor",
                "placeable": true,
                "collection": "Pocket Home",
                "series": "01"
            })
            .to_string()
        }),
        reference: None,
        reference_hash: None,
    }
}

fn base_metadata(token_id: &str) -> MTBaseTokenMetadata {
    let record = decor_record(token_id);
    MTBaseTokenMetadata {
        name: record.map_or(token_id, |entry| entry.name).to_string(),
        id: token_id.to_string(),
        symbol: Some(if record.is_some() { "POCKET" } else { "BATTLE" }.into()),
        icon: None,
        decimals: None,
        base_uri: None,
        reference: None,
        copies: None,
        reference_hash: None,
    }
}

fn require_token(token_id: &str) {
    require!(IDS.contains(&token_id), "Unknown token ID");
}

pub(crate) fn mt_event(kind: &str, data: Value) {
    env::log_str(&format!(
        "EVENT_JSON:{}",
        json!({"standard":"nep245","version":"1.0.0","event":kind,"data":[data]})
    ));
}

pub(crate) fn transfer_event(
    from: &AccountId,
    to: &AccountId,
    ids: &[String],
    amounts: &[U128],
    memo: Option<String>,
) {
    let mut data = json!({
        "old_owner_id": from, "new_owner_id": to, "token_ids": ids, "amounts": amounts
    });
    if let Some(memo) = memo {
        data["memo"] = json!(memo);
    }
    mt_event("mt_transfer", data);
}

impl Contract {
    fn move_batch(
        &mut self,
        sender: &AccountId,
        receiver: &AccountId,
        ids: &[String],
        amounts: &[U128],
        memo: Option<String>,
    ) {
        one_yocto();
        require!(
            !ids.is_empty() && ids.len() <= MAX_BATCH && ids.len() == amounts.len(),
            "Expected matching arrays of 1 to 32 items"
        );
        require!(sender != receiver, "Cannot transfer to yourself");
        let mut from = self.load_player(sender).expect("Register first");
        let mut to = self.load_player(receiver).expect("Recipient must register");
        for (id, amount) in ids.iter().zip(amounts) {
            let i = item(id);
            let quantity = u64::try_from(amount.0).expect("Amount exceeds item balance range");
            require!(
                quantity > 0 && from.items[i] >= quantity,
                "Invalid amount or insufficient items"
            );
            from.items[i] -= quantity;
            to.items[i] = to.items[i].checked_add(quantity).expect("Balance overflow");
        }
        self.players.insert(sender, &from);
        self.players.insert(receiver, &to);
        transfer_event(sender, receiver, ids, amounts, memo);
    }

    fn transfer_and_call(
        &mut self,
        receiver: AccountId,
        ids: Vec<String>,
        amounts: Vec<U128>,
        memo: Option<String>,
        msg: String,
    ) -> Promise {
        let sender = env::predecessor_account_id();
        self.move_batch(&sender, &receiver, &ids, &amounts, memo);
        let previous_owner_ids = vec![&sender; ids.len()];
        let receiver_args = json!({
            "sender_id": sender, "previous_owner_ids": previous_owner_ids,
            "token_ids": ids, "amounts": amounts, "msg": msg
        });
        let resolver_args = json!({
            "sender_id": sender, "receiver_id": receiver, "token_ids": ids, "amounts": amounts
        });
        // Reserve gas for scheduling and resolving even if the receiver exhausts its share.
        let reserved = RESOLVE_GAS.saturating_add(Gas::from_tgas(20));
        let gas = env::prepaid_gas()
            .saturating_sub(env::used_gas())
            .saturating_sub(reserved);
        require!(
            gas >= Gas::from_tgas(10),
            "Attach more gas to call a receiver"
        );
        Promise::new(receiver)
            .function_call(
                "mt_on_transfer",
                receiver_args.to_string().into_bytes(),
                NearToken::from_yoctonear(0),
                gas,
            )
            .then(Promise::new(env::current_account_id()).function_call(
                "mt_resolve_transfer",
                resolver_args.to_string().into_bytes(),
                NearToken::from_yoctonear(0),
                RESOLVE_GAS,
            ))
    }
}

#[near]
impl Contract {
    pub fn mt_metadata_contract(&self) -> MTContractMetadata {
        MTContractMetadata {
            spec: "mt-1.0.0".into(),
            name: "Battle Net: Pocket Home".into(),
        }
    }

    pub fn mt_metadata_token_all(&self, token_ids: Vec<String>) -> Vec<MTTokenMetadataAll> {
        token_ids
            .iter()
            .map(|token_id| {
                require_token(token_id);
                MTTokenMetadataAll {
                    base: base_metadata(token_id),
                    token: token_metadata(token_id),
                }
            })
            .collect()
    }

    pub fn mt_metadata_token_by_token_id(
        &self,
        token_ids: Vec<String>,
    ) -> Vec<MTTokenMetadata> {
        token_ids
            .iter()
            .map(|token_id| {
                require_token(token_id);
                token_metadata(token_id)
            })
            .collect()
    }

    pub fn mt_metadata_base_by_token_id(
        &self,
        token_ids: Vec<String>,
    ) -> Vec<MTBaseTokenMetadata> {
        token_ids
            .iter()
            .map(|token_id| {
                require_token(token_id);
                base_metadata(token_id)
            })
            .collect()
    }

    pub fn mt_metadata_base_by_metadata_id(
        &self,
        base_metadata_ids: Vec<String>,
    ) -> Vec<MTBaseTokenMetadata> {
        self.mt_metadata_base_by_token_id(base_metadata_ids)
    }

    pub fn mt_token(&self, token_ids: Vec<String>) -> Vec<Option<Token>> {
        token_ids
            .into_iter()
            .map(|token_id| {
                IDS.contains(&token_id.as_str()).then_some(Token {
                    token_metadata: Some(token_metadata(&token_id)),
                    base_metadata_id: token_id.clone(),
                    token_id,
                    owner_id: None,
                })
            })
            .collect()
    }

    pub fn mt_balance_of(&self, account_id: AccountId, token_id: String) -> U128 {
        self.mt_batch_balance_of(account_id, vec![token_id])[0]
    }

    /// Pocket Home balances in the `decor_ids` order returned by `get_config`.
    pub fn decor_balances_of(&self, account_id: AccountId) -> Vec<U64> {
        let player = self.view_player(&account_id);
        (32..38)
            .map(|index| U64(player.as_ref().map_or(0, |p| p.items[index])))
            .collect()
    }

    /// Whether an account is registered and can receive the one-time starter set.
    pub fn can_claim_starter_decor(&self, account_id: AccountId) -> bool {
        self.view_player(&account_id)
            .is_some_and(|player| !player.claimed_decor)
    }

    pub fn mt_batch_balance_of(&self, account_id: AccountId, token_ids: Vec<String>) -> Vec<U128> {
        let balances = if account_id == env::current_account_id() {
            self.escrow.to_vec()
        } else {
            self.view_player(&account_id)
                .map(|p| p.items.into_iter().map(u128::from).collect::<Vec<_>>())
                .unwrap_or_else(|| vec![0; IDS.len()])
        };
        token_ids
            .iter()
            .map(|id| {
                U128(
                    IDS.iter()
                        .position(|known| known == id)
                        .map_or(0, |i| balances[i]),
                )
            })
            .collect()
    }

    pub fn mt_supply(&self, token_id: String) -> Option<U128> {
        IDS.iter()
            .position(|known| *known == token_id)
            .map(|i| U128(self.supply[i]))
    }

    pub fn mt_batch_supply(&self, token_ids: Vec<String>) -> Vec<Option<U128>> {
        token_ids.into_iter().map(|id| self.mt_supply(id)).collect()
    }

    #[payable]
    pub fn mt_transfer(
        &mut self,
        receiver_id: AccountId,
        token_id: String,
        amount: U128,
        approval: Option<Approval>,
        memo: Option<String>,
    ) {
        require!(approval.is_none(), "Approvals are unsupported");
        self.move_batch(
            &env::predecessor_account_id(),
            &receiver_id,
            &[token_id],
            &[amount],
            memo,
        );
    }

    #[payable]
    pub fn mt_batch_transfer(
        &mut self,
        receiver_id: AccountId,
        token_ids: Vec<String>,
        amounts: Vec<U128>,
        approvals: Option<Vec<Option<Approval>>>,
        memo: Option<String>,
    ) {
        validate_approvals(&approvals, token_ids.len());
        self.move_batch(
            &env::predecessor_account_id(),
            &receiver_id,
            &token_ids,
            &amounts,
            memo,
        );
    }

    #[payable]
    pub fn mt_transfer_call(
        &mut self,
        receiver_id: AccountId,
        token_id: String,
        amount: U128,
        approval: Option<Approval>,
        memo: Option<String>,
        msg: String,
    ) -> Promise {
        require!(approval.is_none(), "Approvals are unsupported");
        self.transfer_and_call(receiver_id, vec![token_id], vec![amount], memo, msg)
    }

    #[payable]
    pub fn mt_batch_transfer_call(
        &mut self,
        receiver_id: AccountId,
        token_ids: Vec<String>,
        amounts: Vec<U128>,
        approvals: Option<Vec<Option<Approval>>>,
        memo: Option<String>,
        msg: String,
    ) -> Promise {
        validate_approvals(&approvals, token_ids.len());
        self.transfer_and_call(receiver_id, token_ids, amounts, memo, msg)
    }

    #[private]
    pub fn mt_resolve_transfer(
        &mut self,
        sender_id: AccountId,
        receiver_id: AccountId,
        token_ids: Vec<String>,
        amounts: Vec<U128>,
    ) -> Vec<U128> {
        require!(env::promise_results_count() == 1, "Invalid callback");
        let unused = env::promise_result_checked(0, 4096)
            .ok()
            .and_then(|bytes| near_sdk::serde_json::from_slice::<Vec<U128>>(&bytes).ok())
            .filter(|result| result.len() == amounts.len())
            .unwrap_or_else(|| amounts.clone());
        let mut sender = self.load_player(&sender_id).expect("Sender missing");
        let mut receiver = self.load_player(&receiver_id).expect("Receiver missing");
        let mut refund_ids = Vec::new();
        let mut refunds = Vec::new();
        let used = token_ids
            .iter()
            .zip(amounts)
            .zip(unused)
            .map(|((id, sent), unused)| {
                let i = item(id);
                let refund =
                    sent.0
                        .min(unused.0)
                        .min(u128::from(receiver.items[i]))
                        .min(u128::from(u64::MAX - sender.items[i])) as u64;
                if refund > 0 {
                    receiver.items[i] -= refund;
                    sender.items[i] += refund;
                    refund_ids.push(id.clone());
                    refunds.push(U128(refund.into()));
                }
                U128(sent.0 - u128::from(refund))
            })
            .collect();
        if !refunds.is_empty() {
            self.players.insert(&sender_id, &sender);
            self.players.insert(&receiver_id, &receiver);
            transfer_event(
                &receiver_id,
                &sender_id,
                &refund_ids,
                &refunds,
                Some("refund".into()),
            );
        }
        used
    }
}

fn validate_approvals(approvals: &Option<Vec<Option<Approval>>>, count: usize) {
    if let Some(approvals) = approvals {
        require!(
            approvals.len() == count && approvals.iter().all(Option::is_none),
            "Expected no delegated approvals"
        );
    }
}
