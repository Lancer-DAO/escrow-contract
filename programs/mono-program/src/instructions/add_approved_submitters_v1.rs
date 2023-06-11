use anchor_lang::prelude::*;

use crate::{
    constants::{MONO_DATA, MAX_NO_OF_SUBMITTERS, REFERRER}, 
    state::{FeatureDataAccount, ReferralDataAccount}, 
    errors::MonoError
};

#[derive(Accounts)]
pub struct AddApprovedSubmittersV1<'info>
{
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(mut)]
    pub referrer: SystemAccount<'info>,

    #[account()]
    pub submitter: SystemAccount<'info>,

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

    #[account(
        mut, 
        seeds = [
            REFERRER.as_bytes(),
            feature_data_account.key().as_ref(),
            creator.key.as_ref(),
        ],
        bump,
    )]
    pub referral_data_account: Account<'info, ReferralDataAccount>,

}

pub fn handler(ctx: Context<AddApprovedSubmittersV1>, ) -> Result<()>
{
    let feature_data_account = &mut ctx.accounts.feature_data_account;
    let referral_data_account = &mut ctx.accounts.referral_data_account;

    // prevent repetition
    for submitter in feature_data_account.approved_submitters.iter()
    {
        require_keys_neq!(
            *submitter, 
            ctx.accounts.submitter.key(),
            MonoError::SubmitterAlreadyPresent
        );
    }

    let submitter_index: usize = feature_data_account.no_of_submitters as usize;
    require!(submitter_index < MAX_NO_OF_SUBMITTERS, MonoError::MaxApprovedSubmitters);

    feature_data_account.approved_submitters[submitter_index] = ctx.accounts.submitter.key();
    referral_data_account.approved_referrers[submitter_index] = ctx.accounts.referrer.key();

    feature_data_account.no_of_submitters += 1;
    referral_data_account.no_of_submitters += 1;

    Ok(())
}