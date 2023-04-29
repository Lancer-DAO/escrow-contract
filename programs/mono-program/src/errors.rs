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

    #[msg("Max Number of Approved Submitters already reached")]
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

    #[msg("This Instruction is used for only single submitters.")]
    ExpectedSingleSubmitter,

    #[msg("This Instruction is used for only single submitters.")]
    ExpectedMultipleSubmitters,

}