use near_sdk::collections::{LookupMap, UnorderedMap};
use near_sdk::json_types::{U128, U64};
use near_sdk::{env, near, require, AccountId, Gas, NearToken, PanicOnDefault, Promise};

const IDS: [&str; 32] = [
    "cannon",
    "longsword",
    "thunder",
    "recover",
    "barrier",
    "gold",
    "buster",
    "armor",
    "shotgun",
    "firewall",
    "icewave",
    "areagrab",
    "charge",
    "vampire",
    "prism",
    "repair",
    "gust",
    "stonewall",
    "poison",
    "bloom",
    "meteor",
    "tidal",
    "chainlight",
    "cleave",
    "dash",
    "echo",
    "draw",
    "focus",
    "thorns",
    "revive",
    "slow",
    "storm",
];
const REGISTER: u128 = 50_000_000_000_000_000_000_000;
const LISTING_STORAGE: u128 = 5_000_000_000_000_000_000_000;
const MAX_PRICE: u128 = 1_000_000_000_000_000_000_000_000_000;

#[near(serializers=[borsh, json])]
#[derive(Clone)]
pub struct Player {
    pub items: [u64; 32],
    pub proceeds: U128,
    pub active_listings: u32,
    pub withdrawing: bool,
}
#[near(serializers=[borsh, json])]
#[derive(Clone)]
pub struct Listing {
    pub id: U64,
    pub seller: AccountId,
    pub item_id: String,
    pub quantity: u64,
    pub price: U128,
}
#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    players: LookupMap<AccountId, Player>,
    listings: UnorderedMap<u64, Listing>,
    next_id: u64,
}

fn item(id: &str) -> usize {
    IDS.iter().position(|s| *s == id).expect("Unknown item")
}
fn one_yocto() {
    require!(
        env::attached_deposit().as_yoctonear() == 1,
        "Attach exactly one yoctoNEAR"
    );
}
fn event(kind: &str, data: near_sdk::serde_json::Value) {
    env::log_str(&format!(
        "EVENT_JSON:{}",
        near_sdk::serde_json::json!({"standard":"battle_net","version":"1.0.0","event":kind,"data":[data]})
    ));
}

#[near]
impl Contract {
    #[init]
    pub fn new() -> Self {
        Self {
            players: LookupMap::new(b"p"),
            listings: UnorderedMap::new(b"l"),
            next_id: 0,
        }
    }

    pub fn get_config(&self) -> near_sdk::serde_json::Value {
        near_sdk::serde_json::json!({"version":"0.3.0","registration_deposit":REGISTER.to_string(),"listing_deposit":LISTING_STORAGE.to_string(),"item_ids":IDS,"forge_cost":100,"max_active_listings":20,"battle_rewards":"offline_only","standard":"battle_net_custom_multi_token"})
    }
    pub fn get_player(&self, account_id: AccountId) -> Option<Player> {
        self.players.get(&account_id)
    }
    pub fn get_listings(&self, from_index: Option<u64>, limit: Option<u64>) -> Vec<Listing> {
        self.listings
            .values_as_vector()
            .iter()
            .skip(from_index.unwrap_or(0) as usize)
            .take(limit.unwrap_or(30).min(100) as usize)
            .collect()
    }
    pub fn get_listing(&self, listing_id: U64) -> Option<Listing> {
        self.listings.get(&listing_id.0)
    }
    pub fn balance_of(&self, account_id: AccountId, item_id: String) -> U64 {
        let i = item(&item_id);
        U64(self
            .players
            .get(&account_id)
            .map(|p| p.items[i])
            .unwrap_or(0))
    }

    /// One-time TESTNET starter inventory; cannot import client saves or mint battle wins.
    #[payable]
    pub fn register(&mut self) {
        require!(
            env::attached_deposit().as_yoctonear() == REGISTER,
            "Attach registration deposit from get_config"
        );
        let who = env::predecessor_account_id();
        require!(self.players.get(&who).is_none(), "Already registered");
        let mut items = [1u64; 32];
        items[0] = 3;
        items[1] = 100;
        items[2] = 2;
        items[3] = 3;
        items[4] = 2;
        items[5] = 0;
        self.players.insert(
            &who,
            &Player {
                items,
                proceeds: U128(0),
                active_listings: 0,
                withdrawing: false,
            },
        );
        event(
            "register",
            near_sdk::serde_json::json!({"account_id":who,"items":items}),
        );
    }
    #[payable]
    pub fn transfer(&mut self, receiver_id: AccountId, item_id: String, quantity: u64) {
        one_yocto();
        require!(quantity > 0 && quantity <= 10000, "Invalid quantity");
        let i = item(&item_id);
        let sender = env::predecessor_account_id();
        require!(sender != receiver_id, "Cannot transfer to yourself");
        let mut a = self.players.get(&sender).expect("Register first");
        let mut b = self
            .players
            .get(&receiver_id)
            .expect("Recipient must register");
        require!(a.items[i] >= quantity, "Insufficient items");
        a.items[i] -= quantity;
        b.items[i] = b.items[i].checked_add(quantity).expect("Overflow");
        self.players.insert(&sender, &a);
        self.players.insert(&receiver_id, &b);
        event(
            "transfer",
            near_sdk::serde_json::json!({"sender_id":sender,"receiver_id":receiver_id,"item_id":item_id,"quantity":quantity}),
        );
    }
    #[payable]
    pub fn forge(&mut self) {
        one_yocto();
        let who = env::predecessor_account_id();
        let mut p = self.players.get(&who).expect("Register first");
        require!(p.items[1] >= 100, "Need 100 Longswords");
        p.items[1] -= 100;
        p.items[5] = p.items[5].checked_add(1).expect("Overflow");
        self.players.insert(&who, &p);
        event(
            "forge",
            near_sdk::serde_json::json!({"account_id":who,"burned":100,"output":"gold","quantity":1}),
        );
    }
    /// price is TOTAL lot price in yoctoNEAR, not per-item price.
    #[payable]
    pub fn create_listing(&mut self, item_id: String, quantity: u64, price: U128) -> U64 {
        require!(
            env::attached_deposit().as_yoctonear() == LISTING_STORAGE,
            "Attach listing storage deposit from get_config"
        );
        require!(quantity > 0 && quantity <= 10000, "Invalid quantity");
        require!(price.0 > 0 && price.0 <= MAX_PRICE, "Invalid price");
        let i = item(&item_id);
        let seller = env::predecessor_account_id();
        let mut p = self.players.get(&seller).expect("Register first");
        require!(p.active_listings < 20, "Maximum 20 active listings");
        require!(p.items[i] >= quantity, "Insufficient items");
        p.items[i] -= quantity;
        p.active_listings += 1;
        let id = self.next_id;
        self.next_id = self.next_id.checked_add(1).expect("Listing overflow");
        let listing = Listing {
            id: U64(id),
            seller: seller.clone(),
            item_id,
            quantity,
            price,
        };
        self.players.insert(&seller, &p);
        self.listings.insert(&id, &listing);
        event("listing", near_sdk::serde_json::to_value(&listing).unwrap());
        U64(id)
    }
    #[payable]
    pub fn cancel_listing(&mut self, listing_id: U64) {
        one_yocto();
        let l = self
            .listings
            .get(&listing_id.0)
            .expect("Listing unavailable");
        let who = env::predecessor_account_id();
        require!(who == l.seller, "Only seller can cancel");
        let i = item(&l.item_id);
        let mut p = self.players.get(&who).expect("Register first");
        p.items[i] = p.items[i].checked_add(l.quantity).expect("Overflow");
        p.active_listings -= 1;
        self.players.insert(&who, &p);
        self.listings.remove(&listing_id.0);
        event(
            "cancel",
            near_sdk::serde_json::json!({"listing_id":listing_id}),
        );
    }
    #[payable]
    pub fn buy_listing(&mut self, listing_id: U64) {
        let l = self
            .listings
            .get(&listing_id.0)
            .expect("Listing unavailable");
        require!(
            env::attached_deposit().as_yoctonear() == l.price.0,
            "Attach exact listing price"
        );
        let who = env::predecessor_account_id();
        require!(who != l.seller, "Cannot buy your own listing");
        let i = item(&l.item_id);
        let mut buyer = self.players.get(&who).expect("Register first");
        let mut seller = self.players.get(&l.seller).expect("Seller not registered");
        buyer.items[i] = buyer.items[i].checked_add(l.quantity).expect("Overflow");
        seller.proceeds = U128(seller.proceeds.0.checked_add(l.price.0).expect("Overflow"));
        seller.active_listings -= 1;
        self.players.insert(&who, &buyer);
        self.players.insert(&l.seller, &seller);
        self.listings.remove(&listing_id.0);
        event(
            "sale",
            near_sdk::serde_json::json!({"listing_id":listing_id,"buyer":who,"seller":l.seller,"price":l.price,"item_id":l.item_id,"quantity":l.quantity}),
        );
    }
    #[payable]
    pub fn withdraw(&mut self) -> Promise {
        one_yocto();
        let who = env::predecessor_account_id();
        let mut p = self.players.get(&who).expect("Register first");
        require!(!p.withdrawing, "Withdrawal pending");
        let amount = p.proceeds;
        require!(amount.0 > 0, "No proceeds");
        p.proceeds = U128(0);
        p.withdrawing = true;
        self.players.insert(&who, &p);
        Promise::new(who.clone())
            .transfer(NearToken::from_yoctonear(amount.0))
            .then(
                Promise::new(env::current_account_id()).function_call(
                    "resolve_withdraw".to_string(),
                    near_sdk::serde_json::to_vec(
                        &near_sdk::serde_json::json!({"account_id":who,"amount":amount}),
                    )
                    .unwrap(),
                    NearToken::from_yoctonear(0),
                    Gas::from_tgas(10),
                ),
            )
    }
    #[private]
    pub fn resolve_withdraw(&mut self, account_id: AccountId, amount: U128) -> bool {
        require!(env::promise_results_count() == 1, "Invalid callback");
        let mut p = self.players.get(&account_id).expect("Missing account");
        require!(p.withdrawing, "No withdrawal pending");
        let success = env::promise_result_checked(0, 0).is_ok();
        if !success {
            p.proceeds = U128(p.proceeds.0.checked_add(amount.0).expect("Overflow"));
        }
        p.withdrawing = false;
        self.players.insert(&account_id, &p);
        event(
            "withdraw",
            near_sdk::serde_json::json!({"account_id":account_id,"amount":amount,"success":success}),
        );
        success
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::{
        test_utils::{accounts, VMContextBuilder},
        testing_env,
    };
    fn context(n: usize, deposit: u128) {
        let mut b = VMContextBuilder::new();
        b.current_account_id(accounts(0))
            .predecessor_account_id(accounts(n))
            .signer_account_id(accounts(n))
            .attached_deposit(NearToken::from_yoctonear(deposit));
        testing_env!(b.build());
    }
    fn setup() -> Contract {
        context(1, 0);
        let mut c = Contract::new();
        context(1, REGISTER);
        c.register();
        context(2, REGISTER);
        c.register();
        c
    }
    #[test]
    fn starter_and_forge() {
        let mut c = setup();
        context(1, 1);
        c.forge();
        let p = c.get_player(accounts(1)).unwrap();
        assert_eq!(p.items[1], 0);
        assert_eq!(p.items[5], 1);
        assert_eq!(c.balance_of(accounts(2), "longsword".into()).0, 100);
    }
    #[test]
    fn escrow_buy_and_proceeds() {
        let mut c = setup();
        context(1, LISTING_STORAGE);
        let id = c.create_listing("longsword".into(), 50, U128(1000));
        assert_eq!(c.balance_of(accounts(1), "longsword".into()).0, 50);
        context(2, 1000);
        c.buy_listing(id);
        assert!(c.get_listing(id).is_none());
        assert_eq!(c.balance_of(accounts(2), "longsword".into()).0, 150);
        let seller = c.get_player(accounts(1)).unwrap();
        assert_eq!(seller.proceeds.0, 1000);
        assert_eq!(seller.active_listings, 0);
    }
    #[test]
    fn cancel_returns_escrow() {
        let mut c = setup();
        context(1, LISTING_STORAGE);
        let id = c.create_listing("longsword".into(), 100, U128(1));
        context(1, 1);
        c.cancel_listing(id);
        assert_eq!(c.balance_of(accounts(1), "longsword".into()).0, 100);
        assert!(c.get_listings(None, None).is_empty());
    }
    #[test]
    fn transfer_conserves() {
        let mut c = setup();
        context(1, 1);
        c.transfer(accounts(2), "longsword".into(), 42);
        assert_eq!(
            c.balance_of(accounts(1), "longsword".into()).0
                + c.balance_of(accounts(2), "longsword".into()).0,
            200
        );
    }
    #[test]
    #[should_panic(expected = "Already registered")]
    fn no_duplicate_starter() {
        let mut c = setup();
        context(1, REGISTER);
        c.register();
    }
    #[test]
    #[should_panic(expected = "Only seller can cancel")]
    fn only_seller_cancel() {
        let mut c = setup();
        context(1, LISTING_STORAGE);
        let id = c.create_listing("longsword".into(), 10, U128(10));
        context(2, 1);
        c.cancel_listing(id);
    }
    #[test]
    #[should_panic(expected = "Attach exact listing price")]
    fn no_underpayment() {
        let mut c = setup();
        context(1, LISTING_STORAGE);
        let id = c.create_listing("longsword".into(), 10, U128(10));
        context(2, 9);
        c.buy_listing(id);
    }
    #[test]
    #[should_panic(expected = "Need 100 Longswords")]
    fn no_double_spend_escrow() {
        let mut c = setup();
        context(1, LISTING_STORAGE);
        c.create_listing("longsword".into(), 100, U128(10));
        context(1, 1);
        c.forge();
    }
    #[test]
    fn withdraw_locks_and_failed_receipt_restores_claim() {
        let mut c = setup();
        let mut p = c.get_player(accounts(1)).unwrap();
        p.proceeds = U128(12345);
        c.players.insert(&accounts(1), &p);
        context(1, 1);
        let _promise = c.withdraw();
        assert_eq!(c.get_player(accounts(1)).unwrap().proceeds.0, 0);
        assert!(c.get_player(accounts(1)).unwrap().withdrawing);
        let mut b = VMContextBuilder::new();
        b.current_account_id(accounts(0))
            .predecessor_account_id(accounts(0))
            .signer_account_id(accounts(1));
        testing_env!(
            b.build(),
            near_sdk::test_vm_config(),
            near_sdk::RuntimeFeesConfig::test(),
            std::collections::HashMap::new(),
            vec![near_sdk::PromiseResult::Failed]
        );
        assert!(!c.resolve_withdraw(accounts(1), U128(12345)));
        let p = c.get_player(accounts(1)).unwrap();
        assert_eq!(p.proceeds.0, 12345);
        assert!(!p.withdrawing);
    }
    #[test]
    fn successful_withdraw_preserves_sales_received_during_pending_receipt() {
        let mut c = setup();
        let mut p = c.get_player(accounts(1)).unwrap();
        p.proceeds = U128(12345);
        c.players.insert(&accounts(1), &p);
        context(1, 1);
        let _promise = c.withdraw();
        let mut p = c.get_player(accounts(1)).unwrap();
        p.proceeds = U128(99);
        c.players.insert(&accounts(1), &p);
        let mut b = VMContextBuilder::new();
        b.current_account_id(accounts(0))
            .predecessor_account_id(accounts(0))
            .signer_account_id(accounts(1));
        testing_env!(
            b.build(),
            near_sdk::test_vm_config(),
            near_sdk::RuntimeFeesConfig::test(),
            std::collections::HashMap::new(),
            vec![near_sdk::PromiseResult::Successful(vec![])]
        );
        assert!(c.resolve_withdraw(accounts(1), U128(12345)));
        let p = c.get_player(accounts(1)).unwrap();
        assert_eq!(p.proceeds.0, 99);
        assert!(!p.withdrawing);
    }
    #[test]
    #[should_panic(expected = "Maximum 20 active listings")]
    fn listing_limit_bounds_storage() {
        let mut c = setup();
        for _ in 0..21 {
            context(1, LISTING_STORAGE);
            c.create_listing("longsword".into(), 1, U128(10));
        }
    }
    #[test]
    #[should_panic(expected = "Listing unavailable")]
    fn sold_listing_cannot_be_purchased_twice() {
        let mut c = setup();
        context(1, LISTING_STORAGE);
        let id = c.create_listing("longsword".into(), 1, U128(10));
        context(2, 10);
        c.buy_listing(id);
        context(2, 10);
        c.buy_listing(id);
    }
    #[test]
    #[should_panic(expected = "Cannot buy your own listing")]
    fn self_purchase_rejected() {
        let mut c = setup();
        context(1, LISTING_STORAGE);
        let id = c.create_listing("longsword".into(), 1, U128(10));
        context(1, 10);
        c.buy_listing(id);
    }
}
