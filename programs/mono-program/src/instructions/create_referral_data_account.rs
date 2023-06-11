use anchor_lang::prelude::*;

use crate::{constants::{MONO_DATA, REFERRER}, state::{FeatureDataAccount, ReferralDataAccount}, errors::MonoError};


#[derive(Accounts)]
pub struct CreateReferralDataAccount<'info>
{
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [
            MONO_DATA.as_bytes(),
            feature_data_account.unix_timestamp.as_ref(),
            creator.key.as_ref(),
        ],
        bump,
        constraint = feature_data_account.creator == creator.key() @ MonoError::NotTheCreator,
    )]
    pub feature_data_account: Account<'info, FeatureDataAccount>,

    #[account(
        init, 
        payer = creator,
        seeds = [
            REFERRER.as_bytes(),
            feature_data_account.key().as_ref(),
            creator.key.as_ref(),
        ],
        bump,
        space = ReferralDataAccount::space(),
    )]
    pub referral_data_account: Account<'info, ReferralDataAccount>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateReferralDataAccount>) -> Result<()>
{
    let referral_data_account = &mut ctx.accounts.referral_data_account;
    referral_data_account.referral_data_account_bump = *ctx.bumps.get("referral_data_account").unwrap();
    Ok(())
}