use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

use crate::{constants::MONO_DATA, state::FeatureDataAccount, errors::MonoError};


#[derive(Accounts)]
pub struct RejectInvoice<'info>
{
    #[account(
        mut,
        constraint = invoice_acceptor.key() == feature_data_account.payout_account @ MonoError::NotApprovedSubmitter,
    )]
    pub invoice_acceptor: Signer<'info>,

    #[account()]
    pub creator: SystemAccount<'info>,

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
    )]
    pub feature_data_account: Account<'info, FeatureDataAccount>,


    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(        
    ctx: Context<RejectInvoice>,
)  -> Result<()> {
    let feature_data_account = &mut ctx.accounts.feature_data_account;

    // sets invoice acceptor to nil
    feature_data_account.payout_account = Pubkey::default();

    Ok(())
}