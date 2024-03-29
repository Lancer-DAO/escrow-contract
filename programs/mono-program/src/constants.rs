use anchor_lang::{prelude::Pubkey, solana_program::pubkey};


pub const MAX_NO_OF_SUBMITTERS: usize = 5;
pub const MIN_NO_OF_SUBMITTERS: usize = 1;
pub const MONO_DATA: &str = "mono";
pub const REFERRER: &str = "referrer";
pub const FEE: u64 = 5;
pub const COMPLETER_FEE: u64 = 95;//95% out of 110%
pub const LANCER_FEE: u64 = 10;
// 1% out of 110% or 10% out of lancer_fee
pub const REFERRAL_FEE: u64 = 10;
// 1% out of 110% or 10% out of lancer_fee
pub static LANCER_ADMIN: Pubkey = pubkey!("admbKYEXAPNHZbzNADk7arzf8ZbDiZ9u4qzNS3XwRXx");
pub const PERCENT: u64 = 100;
pub const LANCER_DAO: &str = "LANCER_DAO";
pub const BUDDY_LINK_PROGRAM_ID: Pubkey = pubkey!("9zE4EQ5tJbEeMYwtS2w8KrSHTtTW4UPqwfbBSEkUrNCA"); //devnet