use anchor_lang::prelude::*;

use crate::constants::{LANCER_ADMIN};
use crate::errors::{MonoError};
use crate::state::{ReferralDataAccount};


#[derive(Accounts)]
pub struct AddReferrerMember<'info> {
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,

    #[account(mut, address = LANCER_ADMIN @ MonoError::InvalidAdmin)]
    pub lancer_admin: Signer<'info>,

    #[account(mut)]
    pub referral_data_account: Account<'info, ReferralDataAccount>,
}

#[allow(dead_code)]
pub fn handler<'info>(ctx: Context<'_, '_, '_, 'info, AddReferrerMember<'info>>, _referrer_members: Vec<Pubkey>) -> Result<()> {
    let referral_data_account = &mut ctx.accounts.referral_data_account;

    referral_data_account.approved_referrers = [
        Pubkey::default(),
        Pubkey::default(),
        Pubkey::default(),
        Pubkey::default(),
        Pubkey::default(),
        Pubkey::default(),
        Pubkey::default(),
        Pubkey::default(),
        Pubkey::default(),
        Pubkey::default()
    ];

    Ok(())
}