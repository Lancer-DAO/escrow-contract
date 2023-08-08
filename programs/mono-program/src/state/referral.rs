use anchor_lang::prelude::*;

use crate::constants::MAX_NO_OF_SUBMITTERS;

#[account]
pub struct ReferralDataAccount
{
    pub referral_data_account_bump: u8,
    // 1
    pub approved_referrers: [Pubkey; MAX_NO_OF_SUBMITTERS],
    // 32 * 5 = 160
    pub no_of_submitters: u8, // 1
}

impl ReferralDataAccount
{
    pub fn space() -> usize
    {
        8 +// Discriminator
            1 + // referral_data_account_bump
            (32 * MAX_NO_OF_SUBMITTERS) + // approved_referrers
            1 +// no of submitters
            50 //padding
    }
}
