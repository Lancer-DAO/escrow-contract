use anchor_lang::{prelude::Pubkey, solana_program::pubkey};


pub const MAX_NO_OF_SUBMITTERS: usize = 5;
pub const MAX_NO_OF_SUBMITTERS_WITH_REFERRAL: usize = 10;
pub const MIN_NO_OF_SUBMITTERS: usize = 1;
pub const MONO_DATA: &str = "mono";
pub const REFERRER: &str = "referrer";
pub const FEE: u64 = 5;
pub const COMPLETER_FEE: u64 = 95;
//95% out of 110%
pub const LANCER_FEE: u64 = 10;
// 1% out of 110% or 10% out of lancer_fee
pub const REFERRAL_FEE: u64 = 10;
// 1% out of 110% or 10% out of lancer_fee

#[cfg(feature = "mainnet")]
pub static LANCER_ADMIN: Pubkey = pubkey!("WbmLPptTGZTFK5ZSks7oaa4Qx69qS3jFXMrAsbWz1or");
#[cfg(feature = "localnet")]
pub static LANCER_ADMIN: Pubkey = pubkey!("admbKYEXAPNHZbzNADk7arzf8ZbDiZ9u4qzNS3XwRXx");

pub const PERCENT: u64 = 100;
pub const LANCER_DAO: &str = "LANCER_DAO";

#[cfg(feature = "mainnet")]
pub const BUDDY_LINK_PROGRAM_ID: Pubkey = pubkey!("BUDDYtQp7Di1xfojiCSVDksiYLQx511DPdj2nbtG9Yu5"); //mainnet
#[cfg(feature = "localnet")]
pub const BUDDY_LINK_PROGRAM_ID: Pubkey = pubkey!("BUDDYtQp7Di1xfojiCSVDksiYLQx511DPdj2nbtG9Yu5"); //devnet