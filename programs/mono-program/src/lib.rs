use anchor_lang::prelude::*;


mod constants;
mod errors;
mod state;
mod instructions;

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

    pub fn approve_request(ctx: Context<ApproveRequest>, ) -> Result<()>
    {
        approve_request::handler(ctx, )
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

    pub fn approve_request_third_party(ctx: Context<ApproveRequestThirdParty>,) -> Result<()> 
    {
        approve_request_third_party::handler(ctx, )
    }

    pub fn enable_multiple_submitters(ctx: Context<EnableMultipleSubmitters>, ) -> Result<()> 
    {
        enable_multiple_submitters::handler(ctx)
    }

    pub fn submit_request_multiple(ctx: Context<SubmitRequestMultiple>,) -> Result<()> 
    {
        submit_request_multiple::handler(ctx)
    }

    pub fn set_share_multiple_submitters(ctx: Context<SetShareMultipleSubmitters>, submitter: Pubkey, submitter_share: f32) -> Result<()> 
    {
        set_share_multiple_submitters::handler(ctx, submitter, submitter_share)
    }

    pub fn approve_request_multiple<'info>(ctx: Context<'_, '_, '_, 'info, ApproveRequestMultiple<'info>>, ) -> Result<()> 
    {
        approve_request_multiple::handler(ctx, )
    }

    pub fn approve_request_multiple_third_party<'info>(ctx: Context<'_, '_, '_, 'info, ApproveRequestMultipleThirdParty<'info>>) -> Result<()> 
    {
        approve_request_multiple_third_party::handler(ctx)
    }

}



