use anchor_lang::prelude::*;
use anchor_spl::token::{TokenAccount, Token, self};

use crate::{constants::{MONO_DATA, DISPUTE}, state::{FeatureDataAccount, Dispute}, errors::MonoError};

#[derive(Accounts)]
pub struct CreateDispute<'info>
{

    #[account(
        mut,
        constraint = Dispute::is_valid_dispute_key(dispute_admin.key()) //
    )]
    pub dispute_admin: Signer<'info>,

    #[account(mut)]
    pub creator: SystemAccount<'info>,

    #[account(
        init, 
        payer = dispute_admin,
        seeds = [
            DISPUTE.as_bytes(),
            feature_data_account.unix_timestamp.as_bytes(),
            creator.key.as_ref(),
            feature_data_account.funds_mint.key().as_ref(),        
        ],
        bump,
        space = Dispute::space(&feature_data_account.unix_timestamp),
    )]
    pub dispute_account: Account<'info, Dispute>,

    #[account(
        mut,
        close = creator,
        seeds = [
            MONO_DATA.as_bytes(),
            feature_data_account.unix_timestamp.as_ref(),
            creator.key.as_ref(),
        ],
        bump = feature_data_account.funds_data_account_bump,
        constraint = feature_data_account.creator == creator.key() @ MonoError::NotTheCreator,
        constraint = (feature_data_account.funder_cancel == true &&
                      feature_data_account.payout_cancel == true) ||
                     (feature_data_account.funder_cancel == true &&
                      feature_data_account.request_submitted == false)
         @ MonoError::CannotCancelFeature,
    )]
    pub feature_data_account: Account<'info, FeatureDataAccount>,

    #[account(
        mut,
        seeds = [
            MONO_DATA.as_bytes(),
            feature_data_account.unix_timestamp.as_ref(),
            creator.key.as_ref(),
            feature_data_account.funds_mint.key().as_ref(),        
        ],
        bump = feature_data_account.funds_token_account_bump,
        token::mint = feature_data_account.funds_mint,
        token::authority = program_authority,
        constraint = feature_token_account.mint == feature_data_account.funds_mint @ MonoError::InvalidMint
    )]
    pub feature_token_account: Account<'info, TokenAccount>,

    ///CHECK: PDA Authority
    #[account(
        seeds = [
            MONO_DATA.as_bytes(),
        ],
        bump = feature_data_account.program_authority_bump
    )]
    pub program_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,

}

pub fn handler(ctx: Context<CreateDispute>, ) -> Result<()>
{

    let dispute_account = &mut ctx.accounts.dispute_account;
    dispute_account.unix_timestamp = String::from(&ctx.accounts.feature_data_account.unix_timestamp);// (unix_timestamp);

    dispute_account.submitter = ctx.accounts.feature_data_account.current_submitter;
    dispute_account.client = ctx.accounts.creator.key();
    dispute_account.mint = ctx.accounts.feature_data_account.funds_mint;
    dispute_account.amount = ctx.accounts.feature_data_account.amount;

    Ok(())
}