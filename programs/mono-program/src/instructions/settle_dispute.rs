use anchor_lang::prelude::*;
use anchor_spl::token::{TokenAccount, Token};

use crate::{constants::{MONO_DATA, DISPUTE}, state::{FeatureDataAccount, Dispute}, errors::MonoError};

#[derive(Accounts)]
pub struct SettleDispute<'info>
{

    #[account(
        mut,
        constraint = Dispute::is_valid_dispute_key(dispute_admin.key()) @ MonoError::InvalidDisputePubkey
    )]
    pub dispute_admin: Signer<'info>,

    #[account(mut)]
    pub creator: SystemAccount<'info>,

    #[account(
        mut, 
        seeds = [
            DISPUTE.as_bytes(),
            dispute_account.unix_timestamp.as_bytes(),
            creator.key.as_ref(),
            dispute_account.mint.key().as_ref(),        
        ],
        bump = dispute_account.dispute_account_bump,
    )]
    pub dispute_account: Account<'info, Dispute>,

    #[account(
        mut,
        seeds = [
            MONO_DATA.as_bytes(),
            dispute_account.unix_timestamp.as_ref(),
            creator.key.as_ref(),
            dispute_account.mint.key().as_ref(),        
        ],
        bump = dispute_account.funds_token_account_bump,
        token::mint = dispute_account.mint,
        token::authority = program_authority,
        constraint = feature_token_account.mint == dispute_account.mint @ MonoError::InvalidMint
    )]
    pub feature_token_account: Account<'info, TokenAccount>,

    ///CHECK: PDA Authority
    #[account(
        seeds = [
            MONO_DATA.as_bytes(),
        ],
        bump = dispute_account.program_authority_bump,//TODO add validation in all bumps
    )]
    pub program_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,

}

pub fn handler(ctx: Context<SettleDispute>, ) -> Result<()>
{

    let dispute_account = &mut ctx.accounts.dispute_account;

    Ok(())
}