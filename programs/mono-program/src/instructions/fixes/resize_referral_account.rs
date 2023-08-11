use anchor_lang::prelude::*;

use crate::constants::{LANCER_ADMIN};
use crate::errors::{MonoError};
use crate::state::{ReferralDataAccount, ReferralDataAccountV2};


#[derive(Accounts)]
pub struct ResizeReferralAccount<'info> {
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,

    #[account(mut, address = LANCER_ADMIN @ MonoError::InvalidAdmin)]
    pub lancer_admin: Signer<'info>,

    #[account(
    mut,
    realloc = ReferralDataAccountV2::space(),
    realloc::payer = lancer_admin,
    realloc::zero = false,
    )]
    pub referral_data_account: Account<'info, ReferralDataAccount>,
}

pub fn handler(_ctx: Context<ResizeReferralAccount>) -> Result<()>
{
    Ok(())
}