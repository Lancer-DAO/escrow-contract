use anchor_lang::prelude::*;
use anchor_spl::token::{TokenAccount, Token, Transfer, CloseAccount, self};

use crate::{constants::{MONO_DATA, LANCER_ADMIN}, state::FeatureDataAccount, errors::MonoError};

#[derive(Accounts)]
pub struct AdminCloseBounty<'info>
{
    #[account(
        mut,
        address = LANCER_ADMIN @ MonoError::InvalidAdmin,
    )]
    pub lancer_admin: Signer<'info>,

    #[account(mut)]
    pub creator: SystemAccount<'info>,

    #[account(mut)]
    pub creator_token_account: Account<'info, TokenAccount>,

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
        constraint =  feature_data_account.payout_cancel == false && // might be unnecessary
                      feature_data_account.request_submitted == false &&
                      feature_data_account.current_submitter == Pubkey::default()
         @ MonoError::AdminCannotCloseBounty,
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

}

impl<'info> AdminCloseBounty<'info> {
    fn transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info().clone(),
          Transfer {
            from: self.feature_token_account.to_account_info(),
            to: self.creator_token_account.to_account_info(),
            authority: self.program_authority.to_account_info(),
        })
    }

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

pub fn handler(ctx: Context<AdminCloseBounty>, ) -> Result<()>
{
    let seeds = &[
        MONO_DATA.as_bytes(),
        &[ctx.accounts.feature_data_account.program_authority_bump]
    ];
    let signer = [&seeds[..]];

    
    token::transfer(
        ctx.accounts.transfer_context().with_signer(&signer), 
        ctx.accounts.feature_token_account.amount,
    )?;

    // Close token account owned by program that stored funds
    token::close_account(
            ctx.accounts.close_context().with_signer(&signer)
    )

}