use anchor_lang::prelude::*;


mod constants;
mod errors;
mod state;
mod instructions;
mod utils;

use crate::instructions::*;


declare_id!("Lag4h3EZK51MWC5L4VY7XeXmEmpo9TrAsgEhQXryHix");


#[program]
pub mod mono_program {
    use super::*;

    pub fn create_feature_funding_account(
        ctx: Context<CreateFeatureFundingAccount>,
        unix_timestamp: String,
    ) -> Result<()> {
        create_feature_funding_account::handler(ctx, unix_timestamp)
    }

    pub fn create_custodial_feature_funding_account(
        ctx: Context<CreateCustodialFeatureFundingAccount>,
        unix_timestamp: String,
    ) -> Result<()> {
        create_custodial_feature_funding_account::handler(ctx, unix_timestamp)
    }

    pub fn fund_feature(ctx: Context<FundFeature>, amount: u64) -> Result<()>
    {
        fund_feature::handler(ctx, amount)
    }

    pub fn add_approved_submitters(ctx: Context<AddApprovedSubmitters>) -> Result<()>
    {
        add_approved_submitters::handler(ctx)
    }

    pub fn submit_request(ctx: Context<SubmitRequest>) -> Result<()>
    {
        submit_request::handler(ctx)
    }

    pub fn approve_request(ctx: Context<ApproveRequest>) -> Result<()>
    {
        approve_request::handler(ctx)
    }

    pub fn deny_request(ctx: Context<DenyRequest>) -> Result<()>
    {
        deny_request::handler(ctx)
    }

    pub fn vote_to_cancel(ctx: Context<VoteToCancel>, is_cancel: bool) -> Result<()>
    {
        vote_to_cancel::handler(ctx, is_cancel)
    }

    pub fn cancel_feature(ctx: Context<CancelFeature>) -> Result<()>
    {
        cancel_feature::handler(ctx)
    }

    pub fn remove_approved_submitters(ctx: Context<RemoveApprovedSubmitters>) -> Result<()>
    {
        remove_approved_submitters::handler(ctx)
    }

    pub fn create_lancer_token_account(ctx: Context<CreateLancerTokenAccount>) -> Result<()>
    {
        create_lancer_token_account::handler(ctx)
    }

    pub fn withdraw_tokens(ctx: Context<WithdrawTokens>, amount: u64, withdraw_bump: u8) -> Result<()>
    {
        withdraw_tokens::handler(ctx, amount, withdraw_bump)
    }

    pub fn enable_multiple_submitters(ctx: Context<EnableMultipleSubmitters>) -> Result<()>
    {
        enable_multiple_submitters::handler(ctx)
    }

    pub fn submit_request_multiple(ctx: Context<SubmitRequestMultiple>) -> Result<()>
    {
        submit_request_multiple::handler(ctx)
    }

    pub fn set_share_multiple_submitters(ctx: Context<SetShareMultipleSubmitters>, submitter: Pubkey, submitter_share: f32) -> Result<()>
    {
        set_share_multiple_submitters::handler(ctx, submitter, submitter_share)
    }

    pub fn approve_request_multiple<'info>(ctx: Context<'_, '_, '_, 'info, ApproveRequestMultiple<'info>>) -> Result<()>
    {
        approve_request_multiple::handler(ctx)
    }

    pub fn approve_request_partial<'info>(ctx: Context<ApproveRequestPartial>, amount: u64) -> Result<()>
    {
        approve_request_partial::handler(ctx, amount)
    }

    // new functions to support update
    pub fn create_referral_data_account(ctx: Context<CreateReferralDataAccount>) -> Result<()>
    {
        create_referral_data_account::handler(ctx)
    }

    pub fn add_approved_submitters_v1<'info>(ctx: Context<'_, '_, '_, 'info, AddApprovedSubmittersV1<'info>>) -> Result<()>
    {
        add_approved_submitters_v1::handler(ctx)
    }

    pub fn remove_approved_submitters_v1(ctx: Context<RemoveApprovedSubmittersV1>) -> Result<()>
    {
        remove_approved_submitters_v1::handler(ctx)
    }

    pub fn approve_request_with_referral<'info>(ctx: Context<'_, '_, '_, 'info, ApproveRequestWithReferral<'info>>) -> Result<()>
    {
        approve_request_with_referral::handler(ctx)
    }

    pub fn approve_request_multiple_with_referral<'info>(ctx: Context<'_, '_, '_, 'info, ApproveRequestMultipleWithReferral<'info>>) -> Result<()>
    {
        approve_request_multiple_with_referral::handler(ctx)
    }

    pub fn send_invoice(ctx: Context<SendInvoice>, amount: u64) -> Result<()>
    {
        send_invoice::handler(ctx, amount)
    }

    pub fn accept_invoice(ctx: Context<AcceptInvoice>,) -> Result<()>
    {
        accept_invoice::handler(ctx)        
    }

    pub fn reject_invoice(ctx: Context<RejectInvoice>, ) -> Result<()>
    {
        reject_invoice::handler(ctx)
    }

    pub fn close_invoice(ctx: Context<CloseInvoice>,) -> Result<()>
    {
        close_invoice::handler(ctx)
    }
}
