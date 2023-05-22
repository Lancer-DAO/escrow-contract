use anchor_lang::prelude::*;

use crate::{constants::MONO_DATA, state::FeatureDataAccount, errors::MonoError};

#[derive(Accounts)]
pub struct SubmitRequestMultiple<'info>
{
    #[account(mut)]
    pub creator: SystemAccount<'info>,

    #[account()]
    pub submitter: Signer<'info>,

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


pub fn handler(ctx: Context<SubmitRequestMultiple>, ) -> Result<()>
{
    let feature_data_account = &mut ctx.accounts.feature_data_account;
    require!(feature_data_account.is_multiple_submitters, MonoError::ExpectedMultipleSubmitters);
    let mut is_approved_submitter = false;

    // require!(!feature_data_account.request_submitted, MonoError::PendingRequestAlreadySubmitted);

    for submitter in feature_data_account.approved_submitters
    {
        if submitter.key() == ctx.accounts.submitter.key() ||
           ctx.accounts.submitter.key() == ctx.accounts.creator.key()
        {
            feature_data_account.request_submitted = true;
            is_approved_submitter = true;
            break;
        }
    }

    require!(is_approved_submitter, MonoError::NotApprovedSubmitter);

    msg!("{} submitted a request", ctx.accounts.submitter.key());
    Ok(())
}