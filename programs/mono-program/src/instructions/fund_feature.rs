use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount, Token, self};

use crate::{constants::{MONO_DATA, PERCENT, FEE, LANCER_ADMIN}, state::FeatureDataAccount, errors::MonoError};

#[derive(Accounts)]
pub struct FundFeature<'info>
{
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        token::mint = feature_data_account.funds_mint,
        token::authority = creator,
        constraint = creator_token_account.mint == feature_data_account.funds_mint
    )]
    pub creator_token_account: Account<'info, TokenAccount>,

    #[account()]
    pub funds_mint: Account<'info, Mint>,

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
            MONO_DATA.as_bytes(),
            feature_data_account.unix_timestamp.as_ref(),
            creator.key.as_ref(),
            funds_mint.key().as_ref(),        
        ],
        bump = feature_data_account.funds_token_account_bump,
        token::mint = funds_mint,
        token::authority = program_authority,
        constraint = feature_token_account.mint == feature_data_account.funds_mint @ MonoError::InvalidMint
    )]
    pub feature_token_account: Account<'info, TokenAccount>,

    ///CHECK: PDA Authority
    #[account(
        seeds = [
            MONO_DATA.as_bytes(),
        ],
        bump
    )]
    pub program_authority: SystemAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,

}

pub fn handler(ctx: Context<FundFeature>, amount: u64) -> Result<()>
{
    let feature_data_account = &mut ctx.accounts.feature_data_account;

    fund(
        feature_data_account, 
        &ctx.accounts.creator_token_account, 
        &ctx.accounts.feature_token_account,
        &ctx.accounts.creator.to_account_info(),
        &ctx.accounts.token_program.to_account_info(),
        amount
    )
}

pub fn fund<'a>(
    feature_data_account: &mut FeatureDataAccount,
    creator_token_account: &Account<'a, TokenAccount>,
    feature_token_account: &Account<'a, TokenAccount>,
    creator: &AccountInfo<'a>,
    token_program: &AccountInfo<'a>,
    amount: u64,
) -> Result<()>
{
    feature_data_account.amount = feature_data_account.amount
        .checked_add(amount)
        .unwrap();

    // check that account can pay amount + 5%
    let lancer_fee = (amount)
        .checked_mul(FEE as u64)
        .unwrap()
        .checked_div(PERCENT)
        .unwrap();
    let min_token_balance;

    if feature_data_account.creator == LANCER_ADMIN {
        min_token_balance = amount
    } else{
        min_token_balance = amount
            .checked_add(lancer_fee)
            .unwrap();
    }

    require!(
        creator_token_account.amount >= 
        min_token_balance,
        MonoError::CannotPayFee,
    );

    let cpi_accounts = token::Transfer{
            from: creator_token_account.to_account_info(),
            to: feature_token_account.to_account_info(),
            authority: creator.to_account_info(),
    };

    token::transfer(
        CpiContext::new(token_program.to_account_info(), cpi_accounts), 
        min_token_balance
    )

}