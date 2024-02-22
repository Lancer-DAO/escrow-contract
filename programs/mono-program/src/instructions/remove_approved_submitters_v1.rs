use anchor_lang::prelude::*;

use crate::{
    constants::{MONO_DATA, MIN_NO_OF_SUBMITTERS, MAX_NO_OF_SUBMITTERS, REFERRER}, 
    state::{FeatureDataAccount, ReferralDataAccount}, 
    errors::MonoError
};

#[derive(Accounts)]
pub struct RemoveApprovedSubmittersV1<'info>
{
    #[account(mut)]
    pub creator: Signer<'info>,

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
        bump = referral_data_account.referral_data_account_bump,
    )]
    pub referral_data_account: Account<'info, ReferralDataAccount>,

}

pub fn handler(ctx: Context<RemoveApprovedSubmittersV1>, ) -> Result<()>
{
    let feature_data_account = &mut ctx.accounts.feature_data_account;

    require!(
        feature_data_account.no_of_submitters as usize  >= 
        MIN_NO_OF_SUBMITTERS, 
        MonoError::MinApprovedSubmitters
    );
    

    remove_submitter_and_referrer(
        ctx.accounts.submitter.key, 
        &mut ctx.accounts.feature_data_account, 
        &mut ctx.accounts.referral_data_account
    )

}

pub fn remove_submitter_and_referrer(
    submitter: &Pubkey, 
    feature_data_account: &mut FeatureDataAccount,
    referral_data_account: &mut ReferralDataAccount,
) -> Result<()>
{
    let mut submitter_index: usize = 0;
    let mut is_submitter_present: bool = false;


    for approved_submitter in feature_data_account.approved_submitters{
        if approved_submitter == submitter.key(){
            is_submitter_present = true;

            feature_data_account.no_of_submitters -= 1;
            referral_data_account.no_of_submitters -= 1;
        }

        if is_submitter_present && submitter_index + 1 == MAX_NO_OF_SUBMITTERS  {
            feature_data_account.approved_submitters[submitter_index] = Pubkey::default();
            referral_data_account.approved_referrers[submitter_index] = Pubkey::default();
            return Ok(());
        }
        else if is_submitter_present {
            feature_data_account.approved_submitters[submitter_index] = 
            feature_data_account.approved_submitters[submitter_index + 1];

            referral_data_account.approved_referrers[submitter_index] = 
            referral_data_account.approved_referrers[submitter_index + 1]
        }

        submitter_index += 1;
    }    

    Ok(())

}