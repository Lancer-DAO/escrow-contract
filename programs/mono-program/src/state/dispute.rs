use anchor_lang::prelude::*;

#[account]
pub struct Dispute
{
    pub client: Pubkey, // 32
    pub submitter: Pubkey, // 32
    pub amount: u64, // 8
}

impl Dispute
{
    pub fn space() -> usize
    {
        8 +// Discriminator
            32 + // client
            32 + // client
            8 +// no of submitters
            50 //padding
    }
}
