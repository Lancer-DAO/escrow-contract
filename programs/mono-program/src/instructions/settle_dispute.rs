use std::ops::{Sub, Mul, Div};

use anchor_lang::prelude::*;
use anchor_spl::token::{TokenAccount, Token, self};

use crate::{constants::{MONO_DATA, DISPUTE, LANCER_DAO, LANCER_ADMIN, PERCENT, COMPLETER_FEE}, state::Dispute, errors::MonoError, };

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
        token::mint = dispute_account.mint,
        token::authority = dispute_account.creator,
        constraint = dispute_account.creator == creator.key() @ MonoError::NotTheCreator,
    )]
    pub creator_token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub submitter: SystemAccount<'info>,

    #[account(
        mut,
        token::mint = dispute_account.mint,
        token::authority = submitter,
    )]
    pub submitter_token_account: Box<Account<'info, TokenAccount>>,

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

    #[account(
        mut,
        close = dispute_admin,
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

pub fn handler(ctx: Context<SettleDispute>, sub_amount: u64) -> Result<()>
{
    let mut submitter_amount = sub_amount;
    require!(
        ctx.accounts.feature_token_account.amount >= 
        submitter_amount,
        MonoError::InsufficientFunds,
    );

    let mut collect_fees = false;

    let dispute_account = &ctx.accounts.dispute_account;

    let mut creator_amount = ctx.accounts.dispute_account.amount.sub(submitter_amount);

    // Pay submitter only if Admin  thinks they completed a milestone collect fees
    if submitter_amount != 0
    {
        collect_fees = true;
    }

    if ctx.accounts.dispute_account.creator != LANCER_ADMIN && collect_fees
    {
        submitter_amount = (submitter_amount)
            .mul(COMPLETER_FEE)
            .div(PERCENT) as u64;

        creator_amount = (creator_amount)
            .mul(COMPLETER_FEE)
            .div(PERCENT) as u64;
    }
    else if ctx.accounts.dispute_account.creator == LANCER_ADMIN && collect_fees
    {
        creator_amount = creator_amount;
    }
    else // creator is refunded everything and lancer collects no fees when submitter is not paid
    {
        creator_amount = ctx.accounts.feature_token_account.amount;    
    }

    // Pay Submitter
    partial_pay_dispute(
        dispute_account,
        &mut ctx.accounts.feature_token_account,
        &ctx.accounts.submitter_token_account.to_account_info(),
        &ctx.accounts.program_authority.to_account_info(),
        &ctx.accounts.token_program.to_account_info(),
        submitter_amount
    )?;

    // Pay Client/Creator the remaining funds
    partial_pay_dispute(
        dispute_account, 
        &mut ctx.accounts.feature_token_account, 
        &ctx.accounts.creator_token_account.to_account_info(), 
        &ctx.accounts.program_authority.to_account_info(), 
        &ctx.accounts.token_program.to_account_info(), 
        creator_amount,
    )?;

    let seeds = &[
        MONO_DATA.as_bytes(),
        &[ctx.accounts.dispute_account.program_authority_bump]
    ];
    let signer = [&seeds[..]];

    if collect_fees // collect fees even if submitter gets a tiny amount
    {
        let cpi_accounts = token::Transfer{
            from: ctx.accounts.feature_token_account.to_account_info(),
            to: ctx.accounts.lancer_dao_token_account.to_account_info(),
            authority: ctx.accounts.program_authority.to_account_info(),
        };
    
        // pay the remaining funds to lancer
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(), 
                cpi_accounts,
                &signer,
            ), 
            ctx.accounts.feature_token_account.amount,
        )?;

        ctx.accounts.feature_token_account.reload()?;
    }

    let close_dispute_cpi_accounts = token::CloseAccount{
        account: ctx.accounts.feature_token_account.to_account_info(),
        destination: ctx.accounts.creator.to_account_info(),
        authority: ctx.accounts.program_authority.to_account_info(),
    };

    token::close_account(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(), 
            close_dispute_cpi_accounts, 
            &signer
        )
    )

}

pub fn partial_pay_dispute<'a>(
    dispute_account: &Dispute,
    feature_token_account: &mut Account<'a, TokenAccount>,
    token_account: &AccountInfo<'a>,
    program_authority: &AccountInfo<'a>,
    token_program: &AccountInfo<'a>,
    amount: u64,
) -> Result<()>
{

    let transfer_seeds = &[
        MONO_DATA.as_bytes(),
        &[dispute_account.program_authority_bump]
    ];
    let transfer_signer = [&transfer_seeds[..]];

    let cpi_accounts = token::Transfer{
        from: feature_token_account.to_account_info(),
        to: token_account.to_account_info(),
        authority: program_authority.to_account_info(),
    };


    // pay the completer remaining funds(0.95%)
    token::transfer(
        CpiContext::new_with_signer(
            token_program.to_account_info(), 
            cpi_accounts,
            &transfer_signer,
        ), 
        amount,
    )?;
msg!("Transferred {}", amount);
    feature_token_account.reload()?;

    Ok(())

}

// pub fn 