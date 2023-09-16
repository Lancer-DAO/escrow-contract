use std::ops::{Mul, Div, Sub};

use anchor_lang::prelude::*;
use anchor_spl::{token::{TokenAccount, Token, self, Transfer, CloseAccount}};

use crate::{constants::{REFERRER, MONO_DATA, PERCENT, LANCER_DAO, LANCER_ADMIN, LANCER_FEE}, state::FeatureDataAccount, errors::MonoError};
use crate::constants::REFERRAL_FEE;
use crate::state::ReferralDataAccount;
use crate::utils::{transfer_reward_to_referrers};

#[derive(Accounts)]
pub struct ApproveRequestWithReferral<'info>
{
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(mut)]
    pub submitter: SystemAccount<'info>,

    #[account(
    mut,
    token::mint = feature_data_account.funds_mint,
    token::authority = submitter,
    )]
    pub payout_account: Box<Account<'info, TokenAccount>>,

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
    #[account(mut,
    seeds = [
    MONO_DATA.as_bytes(),
    ],
    bump = feature_data_account.program_authority_bump
    )]
    pub program_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,

    #[account(
    seeds = [
    REFERRER.as_bytes(),
    feature_data_account.key().as_ref(),
    creator.key.as_ref(),
    ],
    bump = referral_data_account.referral_data_account_bump,
    )]
    pub referral_data_account: Account<'info, ReferralDataAccount>,

    /*
    Remaining accounts will be for BuddyLink integration
     */
}

impl<'info> ApproveRequestWithReferral<'info> {
    fn transfer_bounty_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info().clone(),
            Transfer {
                from: self.feature_token_account.to_account_info(),
                to: self.payout_account.to_account_info(),
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

pub fn handler<'info>(ctx: Context<'_, '_, '_, 'info, ApproveRequestWithReferral<'info>>) -> Result<()>
{
    let transfer_seeds = &[
        MONO_DATA.as_bytes(),
        &[ctx.accounts.feature_data_account.program_authority_bump]
    ];
    let transfer_signer = [&transfer_seeds[..]];
    let bounty_amount = ctx.accounts.feature_data_account.amount;

    // pay lancer fee if admin did not create the bounty
    if ctx.accounts.feature_data_account.creator.key() != LANCER_ADMIN
    {
        // lancer fee is 10% of total fees(5 from both creator & freelancer)
        let fees = (bounty_amount as f64)
            .mul(LANCER_FEE as f64)
            .div(PERCENT as f64) as u64;

        let mut lancer_fee = fees;

        //transfer referral fee
        let referral_key = ctx.accounts.referral_data_account.approved_referrers[0];

        if referral_key != Pubkey::default() {
            // referral fee is 10% of lancer current fees
            let referral_fee = fees
                .mul(REFERRAL_FEE)
                .div(PERCENT);

            lancer_fee = lancer_fee.sub(referral_fee);

            if !transfer_reward_to_referrers(
                &[referral_key, ctx.accounts.referral_data_account.approved_referrers[1]],
                &ctx.accounts.feature_token_account.mint,
                referral_fee,
                vec![10_000],
                &ctx.remaining_accounts,
                &ctx.accounts.token_program.to_account_info(),
                &ctx.accounts.feature_token_account.to_account_info(),
                &ctx.accounts.program_authority.to_account_info(),
                &transfer_signer,
                2, //First one is bl program, second is mint
                0, //No payout in remaining accounts
                ctx.accounts.referral_data_account.creator_referrer != Pubkey::default(),
            ) {
                return Err(error!(MonoError::InvalidReferral));
            }
        }

        //transfer creator referral fee
        if ctx.accounts.referral_data_account.creator_referrer != Pubkey::default() {
            // referral fee is 10% of lancer current fees
            let referral_fee = fees
                .mul(REFERRAL_FEE)
                .div(PERCENT);

            lancer_fee = lancer_fee.sub(referral_fee);

            let starting_index = if referral_key != Pubkey::default() {
                2
            } else {
                0
            };

            //To get the last token account
            if !transfer_reward_to_referrers(
                &[ctx.accounts.referral_data_account.creator_referrer, ctx.accounts.referral_data_account.creator_member],
                &ctx.accounts.feature_token_account.mint,
                referral_fee,
                vec![10_000],
                &ctx.remaining_accounts,
                &ctx.accounts.token_program.to_account_info(),
                &ctx.accounts.feature_token_account.to_account_info(),
                &ctx.accounts.program_authority.to_account_info(),
                &transfer_signer,
                2 + starting_index, //bl, mint, referrer, referrer member
                0, //No payout in remaining accounts
                false,
            ) {
                return Err(error!(MonoError::InvalidReferral));
            }
        }

        // transfer lancer fee
        token::transfer(
            ctx.accounts.transfer_bounty_fee_context().with_signer(&transfer_signer),
            lancer_fee,
        )?;

        ctx.accounts.feature_token_account.reload()?;
    }

    token::transfer(
        ctx.accounts.transfer_bounty_context().with_signer(&transfer_signer),
        ctx.accounts.feature_token_account.amount,
    )?;

    // Close token account owned by program that stored funds
    token::close_account(
        ctx.accounts.close_context().with_signer(&transfer_signer)
    )
}