use anchor_lang::prelude::*;

use crate::constants::{MAX_NO_OF_SUBMITTERS, MAX_NO_OF_SUBMITTERS_WITH_REFERRAL};

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

#[account]
pub struct ReferralDataAccountV2
{
    pub referral_data_account_bump: u8,// 1

    // 32 * 5 * 2 = 320
    // ATA / member x 5
    pub approved_referrers: [Pubkey; MAX_NO_OF_SUBMITTERS_WITH_REFERRAL],

    pub no_of_submitters: u8, // 1

    //32
    pub creator_referrer: Pubkey,
    pub creator_member: Pubkey, //32
}

impl ReferralDataAccountV2
{
    pub fn space() -> usize
    {
        8 + // Discriminator
            1 + // referral_data_account_bump
            (32 * MAX_NO_OF_SUBMITTERS_WITH_REFERRAL) + // approved_referrers
            1 +// no of submitters
            32 + // creator referer
            32 + // creator member
            50// padding
    }
}