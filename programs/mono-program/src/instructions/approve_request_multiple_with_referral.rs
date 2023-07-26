use std::{ops::{Add, Mul, Div, Sub}};

use anchor_lang::prelude::*;
use anchor_spl::{token::{TokenAccount, Token, self, Transfer, CloseAccount, spl_token}};

use crate::{constants::{MONO_DATA, REFERRER, PERCENT, LANCER_DAO, LANCER_ADMIN, LANCER_FEE}, state::FeatureDataAccount, errors::MonoError};
use crate::constants::REFERRAL_FEE;
use crate::state::ReferralDataAccount;
use crate::utils::transfer_reward_to_referrers;

#[derive(Accounts)]
pub struct ApproveRequestMultipleWithReferral<'info>
{
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

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,

    #[account(
    seeds = [
    REFERRER.as_bytes(),
    feature_data_account.key().as_ref(),
    creator.key.as_ref(),
    ],
    bump = referral_data_account.referral_data_account_bump,
    )]
    pub referral_data_account: Box<Account<'info, ReferralDataAccount>>,

    /*
    Remaining accounts will be for BuddyLink integration
     */
}

impl<'info> ApproveRequestMultipleWithReferral<'info> {
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

pub fn handler<'info>(ctx: Context<'_, '_, '_, 'info, ApproveRequestMultipleWithReferral<'info>>) -> Result<()>
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
        let fees = (bounty_amount as f64)
            .mul(LANCER_FEE as f64)
            .div(PERCENT as f64) as u64;

        let mut lancer_fee = fees;

        //transfer referral fee
        let referral_keys = &ctx.accounts.referral_data_account.approved_referrers;

        if !referral_keys.iter().all(|referral_key| *referral_key == Pubkey::default()) {
            // referral fee is 10% of lancer current fees
            let referral_fee = fees
                .mul(REFERRAL_FEE)
                .div(PERCENT);

            lancer_fee = lancer_fee.sub(referral_fee);

            let expected_number_of_payouts_in_remaining = ctx.accounts.feature_data_account.no_of_submitters as usize;

            let shares_in_bps = feature_data_account.approved_submitters_shares
                .iter()
                .map(|s| s.mul(100.0) as u16)
                .collect::<Vec<u16>>();

            if !transfer_reward_to_referrers(
                referral_keys,
                &ctx.accounts.feature_token_account.mint,
                referral_fee,
                shares_in_bps,
                &ctx.remaining_accounts,
                &ctx.accounts.token_program.to_account_info(),
                &ctx.accounts.feature_token_account.to_account_info(),
                &ctx.accounts.program_authority.to_account_info(),
                &transfer_signer,
                expected_number_of_payouts_in_remaining + 2, //for bl and mint
                expected_number_of_payouts_in_remaining,
            ) {
                return Err(error!(MonoError::InvalidReferral));
            }
        }

        //transfer creator referral fee
        if ctx.accounts.referral_data_account.creator_referer == Pubkey::default() {
            // referral fee is 10% of lancer current fees
            let referral_fee = fees
                .mul(REFERRAL_FEE)
                .div(PERCENT);

            lancer_fee = lancer_fee.sub(referral_fee);

            //To get the last token account
            let starting_index_for_referrer = ctx.remaining_accounts.len() - 2;

            if !transfer_reward_to_referrers(
                &[ctx.accounts.referral_data_account.creator_referer, ctx.accounts.referral_data_account.creator_member],
                &ctx.accounts.feature_token_account.mint,
                referral_fee,
                vec![10_000],
                &ctx.remaining_accounts,
                &ctx.accounts.token_program.to_account_info(),
                &ctx.accounts.feature_token_account.to_account_info(),
                &ctx.accounts.program_authority.to_account_info(),
                &transfer_signer,
                starting_index_for_referrer,
                //doesn't apply here since not payout related
                0,
            ) {
                return Err(error!(MonoError::InvalidReferral));
            }
        }

        token::transfer(
            ctx.accounts.transfer_bounty_fee_context().with_signer(&transfer_signer),
            lancer_fee,
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
            .div(PERCENT as f64) as u64;

        token::transfer(
            ctx.accounts.transfer_bounty_context(token_account_info).with_signer(&transfer_signer),
            current_submitter_fee,
        )?;
        ctx.accounts.feature_token_account.reload()?;
    }

    // Close token account owned by program that stored funds
    token::close_account(
        ctx.accounts.close_context().with_signer(&transfer_signer)
    )
}