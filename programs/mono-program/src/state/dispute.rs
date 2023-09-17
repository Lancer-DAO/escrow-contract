use anchor_lang::prelude::*;

use crate::constants::{DISPUTE_PUBKEY_1, LANCER_ADMIN, DISPUTE_PUBKEY_2, DISPUTE_PUBKEY_3};

#[account]
pub struct Dispute
{
    pub client: Pubkey, // 32
    pub submitter: Pubkey, // 32
    pub unix_timestamp: String, // 4 + unix_timestamp.len()
    pub mint: Pubkey, //32
    pub amount: u64, // 8
}

impl Dispute
{
    pub fn space(unix_timestamp: &String) -> usize
    {
        8 +// Discriminator
            32 + // client
            32 + // submitter
            4 + unix_timestamp.len() + // unix_timestamp
            32 + //mint
            8 +// amount
            50 //padding
    }
    
    pub fn is_valid_dispute_key(address: Pubkey) -> bool
    {
        address == DISPUTE_PUBKEY_1 ||
        address == DISPUTE_PUBKEY_2 ||
        address == DISPUTE_PUBKEY_3 ||
        address == LANCER_ADMIN
    }
}
