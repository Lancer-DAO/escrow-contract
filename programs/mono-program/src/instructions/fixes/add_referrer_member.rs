use anchor_lang::prelude::*;

use crate::constants::{LANCER_ADMIN, MAX_NO_OF_SUBMITTERS_WITH_REFERRAL};
use crate::errors::{MonoError};
use crate::state::{ReferralDataAccount};


#[derive(Accounts)]
pub struct AddReferrerMember<'info> {
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,

    #[account(mut, address = LANCER_ADMIN @ MonoError::InvalidAdmin)]
    pub lancer_admin: Signer<'info>,

    //todo put this to not v2 when migration is done
    #[account(mut)]
    pub referral_data_account: Account<'info, ReferralDataAccount>,
}

pub fn handler<'info>(ctx: Context<'_, '_, '_, 'info, AddReferrerMember<'info>>, referrer_members: Vec<Pubkey>) -> Result<()> {
    let referral_data_account = &mut ctx.accounts.referral_data_account;

    let mut new_approved_referrers: [Pubkey; MAX_NO_OF_SUBMITTERS_WITH_REFERRAL] = [Pubkey::default(); MAX_NO_OF_SUBMITTERS_WITH_REFERRAL];

    //Set the old approved referrers in the new array
    for (i, &value) in referral_data_account.approved_referrers.iter().enumerate() {
        if i < 5 {
            new_approved_referrers[i * 2] = value;
        } else {
            break;
        }
    }

    //Set the member referrers
    for (i, &value) in referrer_members.iter().enumerate() {
        if i < 5 {
            new_approved_referrers[(i * 2) + 1] = value;
        } else {
            break;
        }
    }

    referral_data_account.approved_referrers = new_approved_referrers;

    Ok(())
}