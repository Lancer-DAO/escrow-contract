use anchor_lang::{AnchorSerialize, Key, ToAccountInfo};
use solana_program::account_info::{AccountInfo};
use solana_program::hash::hash;
use solana_program::instruction::{AccountMeta, Instruction};
use solana_program::program::{invoke, invoke_signed};
use solana_program::pubkey::Pubkey;
use crate::constants::BUDDY_LINK_PROGRAM_ID;

pub fn transfer_reward_to_referrers<'info>(
    referrals: &[Pubkey],
    expected_mint: &Pubkey,
    total_amount: u64,
    shares_in_bps: Vec<u16>,
    remaining_accounts: &[AccountInfo<'info>],
    token_program: &AccountInfo<'info>,
    from_account: &AccountInfo<'info>,
    program_authority: &AccountInfo<'info>,
    transfer_signer_seeds: &[&[&[u8]]],
    //to know where to start in the remaining accounts since lancer also uses them
    starting_index_for_referrer_accounts: usize,
    expected_number_of_payouts_in_remaining: usize,
) -> bool {
    /*
    Remaining accounts

    -Buddy Link Program
    -Mint
    -up to 5 combination of
        referrer treasuries / token accounts (default public key if not referred), will be
            skipped in buddylink transfer
        referrer member
     */

    /*
    Starting index is the index of the first referrer treasury / token account
    2 for BL and mint
    expected + 1 because on single transfer, there is no remaining accounts
     */
    let minimum_remaining_account_length = starting_index_for_referrer_accounts + (expected_number_of_payouts_in_remaining + 1) * 2;

    if remaining_accounts.len() < minimum_remaining_account_length {
        return false;
    }

    let other_remaining_accounts = &remaining_accounts[starting_index_for_referrer_accounts..];

    if referrals != other_remaining_accounts.iter().map(|a| a.key()).collect::<Vec<Pubkey>>().as_slice() {
        return false;
    }

    let buddy_link_program = remaining_accounts[starting_index_for_referrer_accounts - 2].to_account_info();

    if buddy_link_program.key() != BUDDY_LINK_PROGRAM_ID {
        return false;
    }

    let mint = remaining_accounts[starting_index_for_referrer_accounts - 1].to_account_info();

    if mint.key() != *expected_mint {
        return false;
    }

    let mut accounts_metas = vec![
        AccountMeta::new(program_authority.key(), true), //Program authority (signer)
        AccountMeta::new_readonly(buddy_link_program.key(), false), //System program (null, so program id of Buddylink)
        AccountMeta::new_readonly(mint.key(), false), //Mint
        AccountMeta::new_readonly(token_program.key(), false), //Token program
        AccountMeta::new(from_account.key(), false), //Token account from (belongs to referee)
    ];

    accounts_metas.extend_from_slice(
        &other_remaining_accounts
            .iter()
            .map(|account| AccountMeta {
                pubkey: account.key(),
                is_signer: false,
                is_writable: true,
            })
            .collect::<Vec<AccountMeta>>()
    );

    let mut account_infos = vec![
        program_authority.to_account_info(), //Program authority (signer)
        buddy_link_program.to_account_info(), //System program (null, so program id of Buddylink)
        mint.to_account_info(), //Mint
        token_program.to_account_info(), //Token program
        from_account.to_account_info(), //Token account from (belongs to referee)
    ];

    account_infos.extend_from_slice(other_remaining_accounts);

    let mut instruction_data: Vec<u8> = vec![];

    instruction_data.extend_from_slice(&hash("global:transfer_reward_unchecked_multiple".as_bytes()).to_bytes()[..8]);
    instruction_data.extend_from_slice(&total_amount.try_to_vec().unwrap());
    instruction_data.extend_from_slice(&shares_in_bps.try_to_vec().unwrap());
    instruction_data.push(true as u8); //use on-chain analytics

    let instruction = Instruction {
        program_id: buddy_link_program.key(),
        accounts: accounts_metas,
        data: instruction_data,
    };

    invoke_signed(
        &instruction,
        &account_infos,
        transfer_signer_seeds,
    ).expect("Error transferring reward to referrers");

    true
}

pub fn validate_referrer<'info>(
    payer: &AccountInfo<'info>,
    authority: &AccountInfo<'info>,
    remaining_accounts: &[AccountInfo<'info>],
) -> Option<(Pubkey, Pubkey)> {
    /*
    Remaining accounts

    Buddy link program
    Buddy profile
    Buddy
    Buddy treasury (owner of the member)
    Member
    Referrer member
    Referrer treasury
    Referrer treasury reward

    Optional:
    Mint
    Referrer token account
     */

    let remaining_account_length = remaining_accounts.len();
    if remaining_account_length != 8 && remaining_account_length != 10 {
        return None;
    }

    let buddy_link_program = remaining_accounts[0].to_account_info();
    let other_remaining_accounts = &remaining_accounts[1..];


    if buddy_link_program.key() != BUDDY_LINK_PROGRAM_ID {
        return None;
    }

    let mut account_metas = vec![
        AccountMeta::new(payer.key(), true),
        AccountMeta::new_readonly(authority.key(), false),
    ];

    account_metas.extend_from_slice(
        &other_remaining_accounts
            .iter()
            .map(|account| AccountMeta {
                pubkey: account.key(),
                is_signer: account.is_signer,
                is_writable: account.is_writable,
            })
            .collect::<Vec<AccountMeta>>()
    );

    let mut account_infos = vec![
        payer.to_account_info(),
        authority.to_account_info(),
    ];

    account_infos.extend_from_slice(&other_remaining_accounts);

    let mut instruction_data: Vec<u8> = vec![];
    instruction_data.extend_from_slice(&hash("global:validate_referrer".as_bytes()).to_bytes()[..8]);

    let instruction = Instruction {
        program_id: buddy_link_program.key(),
        accounts: account_metas,
        data: instruction_data,
    };

    invoke(
        &instruction,
        &account_infos,
    ).expect("Error validating referrer");

    Some(if remaining_account_length == 8 {
        (
            remaining_accounts[7].key(), //the treasury pda (if no spl, a.k.a. sol)
            remaining_accounts[5].key() //the referrer member
        )
    } else {
        (
            remaining_accounts[9].key(), //the token account
            remaining_accounts[5].key() //the referrer member
        )
    })
}