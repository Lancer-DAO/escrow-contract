use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

use crate::{constants::MONO_DATA, state::FeatureDataAccount};


#[derive(Accounts)]
pub struct SendInvoice<'info>
{
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account()]
    pub new_creator: SystemAccount<'info>,

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
    ctx: Context<SendInvoice>,
    amount: u64,
)  -> Result<()> {
    let feature_data_account = &mut ctx.accounts.feature_data_account;
    feature_data_account.amount = amount;

    // stores new creator of bounty
    feature_data_account.payout_account = ctx.accounts.new_creator.key();


    Ok(())
}