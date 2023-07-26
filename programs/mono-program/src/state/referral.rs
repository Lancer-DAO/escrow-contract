use anchor_lang::prelude::*;

use crate::constants::{MAX_NO_OF_SUBMITTERS_WITH_REFFERAL};

#[account]
pub struct ReferralDataAccount
{
    pub referral_data_account_bump: u8,// 1

    // 32 * 5 * 2 = 320
    // ATA / member x 5
    pub approved_referrers: [Pubkey; MAX_NO_OF_SUBMITTERS_WITH_REFFERAL],

    pub no_of_submitters: u8, // 1

    //32
    pub creator_referer: Pubkey,
    pub creator_member: Pubkey, //32
}

impl ReferralDataAccount
{
    pub fn space() -> usize
    {
        8 + // Discriminator
            1 + // referral_data_account_bump
            (32 * MAX_NO_OF_SUBMITTERS_WITH_REFFERAL) + // approved_referrers
            1 +// no of submitters
            32 + // creator referer
            32 + // creator member
            18// padding
    }
}
