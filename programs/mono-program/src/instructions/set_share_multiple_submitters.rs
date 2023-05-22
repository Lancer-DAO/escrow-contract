use anchor_lang::prelude::*;

use crate::{constants::{MONO_DATA, PERCENT}, state::FeatureDataAccount, errors::MonoError};

#[derive(Accounts)]
pub struct SetShareMultipleSubmitters<'info>
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
        // constraint = feature_data_account.request_submitted == true @ MonoError::NoActiveRequest,
    )]
    pub feature_data_account: Account<'info, FeatureDataAccount>,

}

pub fn handler(ctx: Context<SetShareMultipleSubmitters>, submitter: Pubkey, submitter_share: f32) -> Result<()>
{
    require!(submitter_share <= PERCENT as f32, MonoError::MaxShareExceeded);
    let feature_data_account = &mut ctx.accounts.feature_data_account;

    let mut is_approved_submitter = false;
    for (index, key) in &mut feature_data_account.approved_submitters.into_iter().enumerate()
    {
        if key == submitter
        {
            is_approved_submitter = true;
            feature_data_account.approved_submitters_shares[index] = submitter_share;
        }
    }
    require!(is_approved_submitter, MonoError::NotApprovedSubmitter);
    Ok(())
}