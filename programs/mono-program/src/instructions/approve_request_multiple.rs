

use std::{ops::{Add, Mul, Div}};

use anchor_lang::prelude::*;
use anchor_spl::{token::{TokenAccount, Token, self, Transfer, CloseAccount, spl_token}};

use crate::{constants::{MONO_DATA, PERCENT, LANCER_DAO, COMPLETER_FEE, LANCER_ADMIN, LANCER_FEE, }, state::FeatureDataAccount, errors::MonoError};

#[derive(Accounts)]
pub struct ApproveRequestMultiple<'info>
{
    #[account(mut)]
    pub creator: Signer<'info>,

    // #[account(
    //     mut,
    //     token::mint = feature_data_account.funds_mint,
    //     // token::authority = submitter,
    // )]
    // pub submitter1_account: Box<Account<'info, TokenAccount>>,

    // #[account(
    //     mut,
    //     token::mint = lancer_company_tokens,
    //     // token::authority = feature_data_account.creator,
    // )]
    // pub creator_company_tokens_account: Box<Account<'info, TokenAccount>>,


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
        constraint = feature_data_account.request_submitted == true @ MonoError::NoActiveRequest,
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

    #[account(
        mut,
        seeds = [
            MONO_DATA.as_bytes(),
            LANCER_DAO.as_bytes(),
            feature_token_account.mint.key().as_ref(),
        ],
        bump,
        token::mint = feature_token_account.mint,
        token::authority = lancer_token_program_authority,
    )]
    pub lancer_dao_token_account: Box<Account<'info, TokenAccount>>,

    ///CHECK: Controls lancer funds(Token)
    #[account(
        seeds = [
            LANCER_DAO.as_bytes(),
        ],
        bump,
    )]
    pub lancer_token_program_authority: UncheckedAccount<'info>,

    ///CHECK: PDA Authority to move out of PDA
    #[account(
        seeds = [
            MONO_DATA.as_bytes(),
        ],
        bump = feature_data_account.program_authority_bump
    )]
    pub program_authority: UncheckedAccount<'info>,

    // #[account(
    //     mut,
    //     seeds = [
    //         LANCER_ADMIN.as_ref(),
    //         LANCER_COMPLETER_TOKENS.as_bytes()
    //     ],
    //     bump,
    //     mint::decimals = MINT_DECIMALS,
    //     mint::authority = program_mint_authority,
    // )]
    // pub lancer_completer_tokens: Account<'info, Mint>,

    // #[account(
    //     mut,
    //     seeds = [
    //         LANCER_ADMIN.as_ref(),
    //         LANCER_COMPANY_TOKENS.as_bytes()
    //     ],
    //     bump,
    //     mint::decimals = MINT_DECIMALS,
    //     mint::authority = program_mint_authority,
    // )]
    // pub lancer_company_tokens: Account<'info, Mint>,

    ///CHECK: mint authority
    // #[account(
    //     seeds = [
    //         MINT_AUTHORITY.as_bytes()
    //     ],
    //     bump,
    // )]
    // pub program_mint_authority: UncheckedAccount<'info>,


    pub token_program: Program<'info, Token>,
pub system_program: Program<'info, System>,
}

impl<'info> ApproveRequestMultiple<'info> {
    fn transfer_bounty_context(&self, submitter: &AccountInfo<'info>) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info().clone(),
          Transfer {
            from: self.feature_token_account.to_account_info(),
            to: submitter.to_account_info(),
            authority: self.program_authority.to_account_info(),
        })
    }

    fn transfer_bounty_fee_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info().clone(),
          Transfer {
            from: self.feature_token_account.to_account_info(),
            to: self.lancer_dao_token_account.to_account_info(),
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

pub fn handler<'info>(ctx: Context<'_, '_, '_, 'info, ApproveRequestMultiple<'info>>, ) -> Result<()>
{
    let feature_data_account = &ctx.accounts.feature_data_account;
    //TODO - test for this
    require!(feature_data_account.is_multiple_submitters, MonoError::ExpectedMultipleSubmitters);

    let mut max_share: f64 = 0.0;
    for share in feature_data_account.approved_submitters_shares
    {
        max_share = max_share.add(share as f64);
    }

    // TODO - Test for this
    require!(max_share == PERCENT as f64, MonoError::ShareMustBe100);

    let transfer_seeds = &[
        MONO_DATA.as_bytes(),
        &[feature_data_account.program_authority_bump]
    ];
    let transfer_signer = [&transfer_seeds[..]];


    let mut bounty_amount = feature_data_account.amount;

    let submitters_info_iter = &mut ctx.remaining_accounts.iter(); 
    
    // pay lancer fee if admin did not create the bounty
    if feature_data_account.creator.key() != LANCER_ADMIN
    {
        let lancer_fee = (bounty_amount as f64)
        // .mul(current_share as f64)
        .mul(LANCER_FEE as f64)
        // .div(PERCENT as f64)
        .div(PERCENT as f64) as u64;

        token::transfer(
            ctx.accounts.transfer_bounty_fee_context().with_signer(&transfer_signer), 
        lancer_fee
        )?;

        ctx.accounts.feature_token_account.reload()?;
    }

    bounty_amount = ctx.accounts.feature_token_account.amount;
    // pay the completer(s) 95%
    for (index, key) in feature_data_account.approved_submitters.iter().enumerate()
    {
        if key == &Pubkey::default()
        {
            break;
        }

        let token_account_info = next_account_info(submitters_info_iter)?;
        let current_share = feature_data_account.approved_submitters_shares[index];

        let current_submitter_token_account = TokenAccount::try_deserialize(&mut &token_account_info.try_borrow_data()?[..])?;

        require_keys_eq!(
            current_submitter_token_account.mint,
            feature_data_account.funds_mint,
            MonoError::InvalidMint
        );
        require_keys_eq!(
            *token_account_info.owner,
            spl_token::ID,
            MonoError::NotOwnedBySplToken
        );
        require_keys_eq!(
            current_submitter_token_account.owner,
            feature_data_account.approved_submitters[index],
            MonoError::NotApprovedSubmitter
        );

        let current_submitter_fee = (bounty_amount as f64)
            .mul(current_share as f64)
            // .mul(COMPLETER_FEE as f64)
            // .div(PERCENT as f64)
            .div(PERCENT as f64) as u64;

        token::transfer(
            ctx.accounts.transfer_bounty_context(token_account_info).with_signer(&transfer_signer), 
            current_submitter_fee
        )?;
        ctx.accounts.feature_token_account.reload()?;
    }

    // let lancer_fee = 

    // Close token account owned by program that stored funds
    token::close_account(
            ctx.accounts.close_context().with_signer(&transfer_signer)
    )
}