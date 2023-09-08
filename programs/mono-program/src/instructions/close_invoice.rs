use anchor_lang::prelude::*;
use anchor_spl::{token::{TokenAccount, Token, CloseAccount, self}, associated_token::AssociatedToken};

use crate::{constants::MONO_DATA, state::FeatureDataAccount, errors::MonoError};

#[derive(Accounts)]
pub struct CloseInvoice<'info>
{
    ///CHECK: PDA Authority
    #[account(
        seeds = [
            MONO_DATA.as_bytes(),
        ],
        bump
    )]
    pub program_authority: UncheckedAccount<'info>,

    // Data that will be getting replaced
    #[account(mut)]
    pub creator: Signer<'info>,

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
    pub associated_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,

}

impl<'info> CloseInvoice<'info> {
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
    ctx: Context<CloseInvoice>,
)  -> Result<()> {
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

}