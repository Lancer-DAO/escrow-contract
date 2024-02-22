use anchor_lang::prelude::*;

use crate::{
    constants::{MONO_DATA, MAX_NO_OF_SUBMITTERS, REFERRER},
    state::{FeatureDataAccount, ReferralDataAccount},
    errors::MonoError,
};
use crate::utils::validate_referrer;

#[derive(Accounts)]
pub struct AddApprovedSubmittersV1<'info>
{
    #[account(mut)]
    pub creator: Signer<'info>,

    /// CHECK: Is either default (no referrer) or referrer pda
    #[account()]
    pub referrer: UncheckedAccount<'info>,

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

    /*
    Remaining accounts are for buddylink validation
     */
}

pub fn handler<'info>(ctx: Context<'_, '_, '_, 'info, AddApprovedSubmittersV1<'info>>) -> Result<()>
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

    //Validate referrer (if this fails then the referrer for the submitter is invalid)
    let mut referrer = ctx.accounts.referrer.key();
    let mut referrer_member = Pubkey::default();

    //Skip if default pubkey (means no referrer)
    if referrer != Pubkey::default() {
        match validate_referrer(&ctx.accounts.creator, &ctx.accounts.submitter, &ctx.remaining_accounts) {
            Some(parsed_pubkeys) => {
                referrer = parsed_pubkeys.0;
                referrer_member = parsed_pubkeys.1;
            }
            _ => return Err(error!(MonoError::InvalidReferral)),
        }
    };

    let submitter_index: usize = feature_data_account.no_of_submitters as usize;
    require!(submitter_index < MAX_NO_OF_SUBMITTERS, MonoError::MaxApprovedSubmitters);

    feature_data_account.approved_submitters[submitter_index] = ctx.accounts.submitter.key();
    referral_data_account.approved_referrers[submitter_index] = referrer;
    referral_data_account.approved_referrers[submitter_index + 1] = referrer_member;

    feature_data_account.no_of_submitters += 1;
    referral_data_account.no_of_submitters += 1;

    Ok(())
}