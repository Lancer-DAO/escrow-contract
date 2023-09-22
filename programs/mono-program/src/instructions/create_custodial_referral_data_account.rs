use anchor_lang::prelude::*;

use crate::{constants::{MONO_DATA, REFERRER}, state::{FeatureDataAccount, ReferralDataAccount}, errors::MonoError};
use crate::utils::validate_referrer;


#[derive(Accounts)]
pub struct CreateCustodialReferralDataAccount<'info>
{
    #[account(mut)]
    pub custodial_fee_payer: Signer<'info>,

    /// Check: Web3 auth can't allow 2 signers
    #[account()]
    pub creator: SystemAccount<'info>,

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
        init,
        payer = custodial_fee_payer, 
        seeds = [
            REFERRER.as_bytes(),
            feature_data_account.key().as_ref(),
            creator.key.as_ref(),
        ],
        bump,
        space = ReferralDataAccount::space(),
    )]
    pub referral_data_account: Account<'info, ReferralDataAccount>,

    /// CHECK: Is either default (no referrer) or referrer pda
    #[account()]
    pub referrer: UncheckedAccount<'info>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

pub fn handler<'info>(ctx: Context<'_, '_, '_, 'info, CreateCustodialReferralDataAccount<'info>>) -> Result<()>
{
    let referral_data_account = &mut ctx.accounts.referral_data_account;
    referral_data_account.referral_data_account_bump = *ctx.bumps.get("referral_data_account").unwrap();

    //Validate referrer (if this fails then the referrer for the submitter is invalid)
    //Skip if default pubkey (means no referrer)
    if ctx.accounts.referrer.key() != Pubkey::default() {
        match validate_referrer(&ctx.accounts.creator, &ctx.accounts.creator, &ctx.remaining_accounts) {
            Some(parsed_pubkeys) => {
                referral_data_account.creator_referrer = parsed_pubkeys.0;
                referral_data_account.creator_member = parsed_pubkeys.1;
            }
            _ => return Err(error!(MonoError::InvalidReferral)),
        }
    };

    Ok(())
}