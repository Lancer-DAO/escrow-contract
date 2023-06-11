use anchor_lang::prelude::*;

use crate::constants::MAX_NO_OF_SUBMITTERS;

#[account]
pub struct ReferralDataAccount
{
    // pub creator: Pubkey,// 
    // pub amount: u64,// 8
    // pub request_submitted: bool,// 1
    pub referral_data_account_bump: u8, // 1
    pub current_referrer: Pubkey,// 32
    pub approved_referrers: [Pubkey; MAX_NO_OF_SUBMITTERS],// 32 * 5 = 160    
    pub no_of_submitters: u8, // 1
    // pub approved_submitters_shares: [f32; MAX_NO_OF_SUBMITTERS],// 4 * 5 = 20  
    // pub funds_mint: Pubkey,// 32 
    // pub funds_token_account: Pubkey,// 32 
    // pub payout_account: Pubkey,// 32
    // pub funder_cancel: bool,// 1
    // pub payout_cancel: bool,// 1
    // pub is_multiple_submitters: bool, // 1
    // pub funds_token_account_bump: u8, // 1
    // pub funds_data_account_bump: u8, // 1
    // pub program_authority_bump: u8, // 1
    // pub unix_timestamp: String // 4 + unix_timestamp.len()
}

impl ReferralDataAccount
{ 
    pub fn space() -> usize
    {
        8  +// Discriminator 
        1 + // referral_data_account_bump
        32 +// current_referrer
        1 + // no of submitters
        (32 * MAX_NO_OF_SUBMITTERS) // approved_referrers
    }
}
