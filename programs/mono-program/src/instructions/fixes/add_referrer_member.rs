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

    //todo put this to not v2 when migration is done
    #[account(mut)]
    pub referral_data_account: Account<'info, ReferralDataAccount>,
}

pub fn handler<'info>(ctx: Context<'_, '_, '_, 'info, AddReferrerMember<'info>>, referrer_members: Vec<Pubkey>) -> Result<()> {
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