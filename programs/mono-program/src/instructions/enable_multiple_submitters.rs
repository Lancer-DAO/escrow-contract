use anchor_lang::prelude::*;

use crate::{constants::MONO_DATA, state::FeatureDataAccount, errors::MonoError};

#[derive(Accounts)]
pub struct EnableMultipleSubmitters<'info>
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
        bump = feature_data_account.funds_data_account_bump,
        constraint = feature_data_account.creator == creator.key() @ MonoError::NotTheCreator,
    )]
    pub feature_data_account: Account<'info, FeatureDataAccount>,

}


pub fn handler(ctx: Context<EnableMultipleSubmitters>, ) -> Result<()>
{
    let feature_data_account = &mut ctx.accounts.feature_data_account;
    feature_data_account.is_multiple_submitters = true;
    Ok(())
}