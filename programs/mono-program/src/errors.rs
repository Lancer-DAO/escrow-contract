use anchor_lang::error_code;

#[error_code]
pub enum MonoError
{
    #[msg("This Creator is Invalid")]
    NotTheCreator,

    #[msg("This mint is not valid")]
    InvalidMint,

    #[msg("Max Number of Approved Submitters already reached")]
    MaxApprovedSubmitters,

    #[msg("Submitter Key Already Present in ApprovedSubmitters List")]
    SubmitterAlreadyPresent,

    #[msg("Min Number of Approved Submitters already reached")]
    MinApprovedSubmitters,

    #[msg("There is an active request already present")]
    PendingRequestAlreadySubmitted,

    #[msg("No Request Submitted yet")]
    NoActiveRequest,

    #[msg("Insufficient funds to pay lancer fee")]
    CannotPayFee,

    #[msg("Cannot Cancel Feature")]
    CannotCancelFeature,

    #[msg("You are not the Admin")]
    InvalidAdmin,

    #[msg("You do not have permissions to submit")]
    NotApprovedSubmitter,

    #[msg("This Instruction is used for only a single submitter.")]
    ExpectedSingleSubmitter,

    #[msg("This Instruction is used for only Multiple submitters.")]
    ExpectedMultipleSubmitters,

    #[msg("Share Cannot Exceed 100")]
    MaxShareExceeded,

    #[msg("Share must be 100")]
    ShareMustBe100,

    #[msg("Token Error")]
    NotOwnedBySplToken,

    #[msg("Cannot withdraw full funds.")]
    CannotWithdrawPartially,

    #[msg("Invalid referral provided.")]
    InvalidReferral,

    #[msg("Insufficient funds")]
    InsufficientFunds,

    #[msg("Admin Cannot Close Bounty, check if there is a current submitter")]
    AdminCannotCloseBounty,

    #[msg("Only Creator or Current Submitter can vote to cancel")]
    CannotVoteToCancel,
}