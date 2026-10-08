use anchor_lang::prelude::*;
use anchor_spl::{token::{Mint, TokenAccount, Token, CloseAccount, self}, associated_token::AssociatedToken};

use crate::{constants::MONO_DATA, state::FeatureDataAccount, errors::MonoError};

use super::fund_feature::fund;


#[derive(Accounts)]
pub struct AcceptInvoice<'info>
{
    #[account(
        mut,
        constraint = new_creator.key() == feature_data_account.payout_account @ MonoError::NotTheCreator,
    )]
    pub new_creator: Signer<'info>,

    #[account(
        mut,
        token::mint = feature_data_account.funds_mint,
        token::authority = new_creator,
        constraint = new_creator_token_account.mint == feature_data_account.funds_mint @ MonoError::InvalidMint,
        constraint = new_creator_token_account.amount >= feature_data_account.amount @ MonoError::InsufficientFunds,
    )]
    pub new_creator_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        constraint = funds_mint.key() == feature_data_account.funds_mint @ MonoError::InvalidMint,
    )]
    pub funds_mint: Account<'info, Mint>,

    #[account(
        init, 
        payer = new_creator, 
        seeds = [
            MONO_DATA.as_bytes(),
            feature_data_account.unix_timestamp.as_ref(),
            new_creator.key.as_ref(),
        ],
        bump,
        space = FeatureDataAccount::space(&feature_data_account.unix_timestamp),
    )]
    pub new_feature_data_account: Box<Account<'info, FeatureDataAccount>>,

    #[account(
        init, 
        payer = new_creator,
        seeds = [
            MONO_DATA.as_bytes(),
            feature_data_account.unix_timestamp.as_bytes(),
            new_creator.key.as_ref(),
            funds_mint.key().as_ref(),        
        ],
        bump,
        token::mint = funds_mint,
        token::authority = program_authority,
    )]
    pub new_feature_token_account: Box<Account<'info, TokenAccount>>,

    ///CHECK: PDA Authority
    #[account(
        seeds = [
            MONO_DATA.as_bytes(),
        ],
        bump = feature_data_account.program_authority_bump,
    )]
    pub program_authority: UncheckedAccount<'info>,

    // Data that will be getting replaced
    #[account(mut)]
    pub creator: SystemAccount<'info>,

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
        // constraint = (feature_data_account.funder_cancel == true &&
        //               feature_data_account.payout_cancel == true) ||
        //              (feature_data_account.funder_cancel == true &&
        //               feature_data_account.request_submitted == false)
        //  @ MonoError::CannotCancelFeature,
    )]
    pub feature_data_account: Box<Account<'info, FeatureDataAccount>>,

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
    pub feature_token_account: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    pub associated_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> AcceptInvoice<'info> {
    fn close_context(&self) -> CpiContext<'_, '_, '_, 'info, CloseAccount<'info>> {
        CpiContext::new(
            self.token_program.to_account_info().clone(),
          CloseAccount {
            account: self.feature_token_account.to_account_info(),
            destination: self.creator.to_account_info(),
            authority: self.program_authority.to_account_info(),
        })
    }

}

pub fn handler(        
    ctx: Context<AcceptInvoice>,
)  -> Result<()> {
    // Create new Bounty
    let new_feature_data_account = &mut ctx.accounts.new_feature_data_account;
    let old_feature_data_account = &mut ctx.accounts.feature_data_account;
    new_feature_data_account.unix_timestamp = old_feature_data_account.unix_timestamp.to_string();
    new_feature_data_account.no_of_submitters = 0;
    new_feature_data_account.amount = 0;
    new_feature_data_account.request_submitted = false;
    new_feature_data_account.funder_cancel = false;
    new_feature_data_account.payout_cancel = false;
    new_feature_data_account.funds_token_account = ctx.accounts.new_feature_token_account.key();
    new_feature_data_account.current_submitter = Pubkey::default();
    new_feature_data_account.creator = ctx.accounts.new_creator.key();
    new_feature_data_account.funds_mint = ctx.accounts.funds_mint.key();
    new_feature_data_account.payout_account = Pubkey::default();
    new_feature_data_account.is_multiple_submitters = false;
    new_feature_data_account.funds_data_account_bump = *ctx.bumps.get("new_feature_data_account").unwrap();
    new_feature_data_account.funds_token_account_bump = *ctx.bumps.get("new_feature_token_account").unwrap();
    new_feature_data_account.program_authority_bump = old_feature_data_account.program_authority_bump;

    // Fund New Bounty
    fund(
        new_feature_data_account, 
        &ctx.accounts.new_creator_token_account, 
        &ctx.accounts.new_feature_token_account, 
        &ctx.accounts.new_creator.to_account_info(), 
        &ctx.accounts.token_program.to_account_info(), 
        old_feature_data_account.amount
    )?;
    // let cpi_accounts = token::Transfer{
    //     from: ctx.accounts.new_creator_token_account.to_account_info(),
    //     to: ctx.accounts.new_feature_token_account.to_account_info(),
    //     authority: ctx.new_accounts.creator.to_account_info(),
    // };

    // token::transfer(
    //     CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts), 
    //     old_feature_data_account.amount
    // )?;

    // Close Old Bounty
    // Close token account owned by program that stored funds
    let seeds = &[
        MONO_DATA.as_bytes(),
        &[ctx.accounts.feature_data_account.program_authority_bump]
    ];
    let signer = [&seeds[..]];

    token::close_account(
        ctx.accounts.close_context().with_signer(&signer)
    )

    // Ok(())
}