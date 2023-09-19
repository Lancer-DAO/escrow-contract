import * as anchor from "@project-serum/anchor";
import { AnchorError, Program } from "@project-serum/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintToChecked,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { MonoProgram } from "../sdk/types/mono_program";
import MonoProgramJSON from "../sdk/idl/mono_program.json";
import {
  COMPLETER_FEE,
  LANCER_FEE,
  MINT_DECIMALS,
  MONO_DEVNET,
  WSOL_ADDRESS,
} from "../sdk/constants";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { add_more_token, createKeypair, createKeypairFromFile, getFeatureDataAccountLength } from "./utils";
import {
    findDisputeAccount,
  findFeatureAccount,
  findFeatureTokenAccount,
  findLancerProgramAuthority,
  findLancerTokenAccount,
  findProgramAuthority,
} from "../sdk/pda";
import {
  addApprovedSubmittersInstruction,
  approveRequestInstruction,
  createFeatureFundingAccountInstruction,
  createCustodialFeatureFundingAccountInstruction,
  custodialTransaction,
  enableMultipleSubmittersInstruction,
  fundFeatureInstruction,
  setShareMultipleSubmittersInstruction,
  submitRequestInstruction,
  withdrawTokensInstruction,
  sendInvoiceInstruction,
  acceptInvoiceInstruction,
  createLancerTokenAccountInstruction,
  rejectInvoiceInstruction,
  closeInvoiceInstruction,
  denyRequestInstruction,
  createDisputeInstruction,
  voteToCancelInstruction,
} from "../sdk/instructions";
import { assert, expect } from "chai";

describe("dispute tests ", () => {
        // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());
    const provider = anchor.getProvider() as anchor.AnchorProvider;

    const program = new Program<MonoProgram>(
        MonoProgramJSON as unknown as MonoProgram,
        new PublicKey(MONO_DEVNET),
        provider
    );
    const WSOL_AMOUNT = 2 * LAMPORTS_PER_SOL;

    it("create dispute when request_submitted is true(using dispute1 as dispute admin)",async () => {
        let creator = await createKeypair(provider);
        let submitter = await createKeypair(provider);
        // let funder = provider.publicKey;
        let mint_authority = await createKeypair(provider);
        let dispute_admin = await createKeypairFromFile(provider, "../deploy/dispute_1.json");

        const special_mint = await createMint(
          provider.connection,
          mint_authority,
          mint_authority.publicKey,
          mint_authority.publicKey,
          MINT_DECIMALS,
        ); 
        const create_lancer_token_account_ix = await createLancerTokenAccountInstruction(
          special_mint,
          program
        );
        await provider.sendAndConfirm(
          new Transaction().add(create_lancer_token_account_ix), 
          []
        );

        const creator_special_mint_account = await getOrCreateAssociatedTokenAccount(
            provider.connection,
            mint_authority,
            special_mint,
            creator.publicKey
        );

        const submitter_special_mint_account = await getOrCreateAssociatedTokenAccount(
            provider.connection,
            mint_authority,
            special_mint,
            submitter.publicKey
        );


        const special_mint_airdrop = await mintToChecked(
            provider.connection,
            mint_authority,
            special_mint,
            creator_special_mint_account.address,
            mint_authority,
            10 * WSOL_AMOUNT,
            MINT_DECIMALS
        );    
        const timestamp = Date.now().toString();

        const [feature_data_account] = await findFeatureAccount(
            timestamp, 
            creator.publicKey,
            program
        );
        const [feature_token_account] = await findFeatureTokenAccount(
        timestamp, 
        creator.publicKey,
        special_mint, 
        program,
        );
        const [program_authority] = await findProgramAuthority(
        program,
        );
        const [lancer_dao_token_account] = await findLancerTokenAccount(
            special_mint,
            program
        );
        const [dispute_account] = await findDisputeAccount(
            timestamp,
            creator.publicKey,
            special_mint,
            program
        );

        let tx = await program.methods.createFeatureFundingAccount(timestamp).
            accounts({
                creator: creator.publicKey,
                fundsMint: special_mint,
                featureDataAccount: feature_data_account,
                featureTokenAccount: feature_token_account,
                programAuthority: program_authority,
                tokenProgram: TOKEN_PROGRAM_ID,
                rent: SYSVAR_RENT_PUBKEY,
                associatedProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            }).signers([creator]).rpc();
        console.log("createFFA(Special mint) transaction signature", tx);

        let amount = 2 * LAMPORTS_PER_SOL;
        let fund_feature_ix = await fundFeatureInstruction(
            amount,
            timestamp,
            creator.publicKey,
            special_mint,
            program
        );
        tx = await provider.sendAndConfirm(new Transaction().add(fund_feature_ix), [creator]);
        console.log("fundFeature transaction signature", tx);

        try {
            await program.methods.createDispute().accounts({
                creator: creator.publicKey,
                featureDataAccount: feature_data_account,
                featureTokenAccount: feature_token_account,
                programAuthority: program_authority,
                disputeAdmin: creator.publicKey,
                disputeAccount: dispute_account,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            }).signers([creator]).rpc();
        } catch (err) {
            // console.log("err ", err);
            assert.equal((err as AnchorError).error.errorMessage, "This Pubkey is not a Valid Dispute Pubkey")
        }
        let addApproveSubmitterIx = await addApprovedSubmittersInstruction(
            timestamp,
            creator.publicKey,
            submitter.publicKey,
            program
        )
          
        tx = await provider.sendAndConfirm(new Transaction().add(addApproveSubmitterIx), [creator]); 
        console.log("addApproveSubmitters tx sig ", tx);

        let submit_request_ix = await submitRequestInstruction(
            timestamp,
            creator.publicKey,
            submitter.publicKey,
            submitter_special_mint_account.address,
            program
        )

        tx = await provider.sendAndConfirm(
            new Transaction().add(submit_request_ix),
            [submitter]
        );
        console.log("submit request tx = ", tx)

        const creator_account_before_balance = await provider.connection.getBalance(creator.publicKey);
        let create_dispute_ix = await createDisputeInstruction(
            timestamp,
            dispute_admin.publicKey,
            creator.publicKey,
            special_mint,
            program
        );
        tx = await provider.sendAndConfirm(
            new Transaction().add(create_dispute_ix),
            [dispute_admin]
        );
        console.log("create dispute tx = ", tx);

        const creator_account_after_balance = await provider.connection.getBalance(creator.publicKey);
        assert.equal(
            creator_account_after_balance.toString(), 
        (
            await provider.connection.getMinimumBalanceForRentExemption(getFeatureDataAccountLength()) + 
            parseInt(creator_account_before_balance.toString())
        ).toString()
        );
        let closed_data_account = await provider.connection.getBalance(feature_data_account);

        assert.equal(0, parseInt(closed_data_account.toString()));

        const disputeAccountData = await program.account.dispute.fetch(dispute_account);

        assert.equal(disputeAccountData.creator.toString(), creator.publicKey.toString());
        assert.equal(disputeAccountData.submitter.toString(), submitter.publicKey.toString());
        assert.equal(disputeAccountData.amount.toNumber(), amount);
        assert.equal(disputeAccountData.mint.toString(), special_mint.toString());
        assert.equal(disputeAccountData.unixTimestamp.toString(), timestamp.toString());
    })

    it("create dispute when only creator votes to cancel(using dispute2 as dispute admin)",async () => {
        let creator = await createKeypair(provider);
        let submitter = await createKeypair(provider);
        // let funder = provider.publicKey;
        let mint_authority = await createKeypair(provider);
        let dispute_admin = await createKeypairFromFile(provider, "../deploy/dispute_2.json");

        const special_mint = await createMint(
          provider.connection,
          mint_authority,
          mint_authority.publicKey,
          mint_authority.publicKey,
          MINT_DECIMALS,
        ); 
        const create_lancer_token_account_ix = await createLancerTokenAccountInstruction(
          special_mint,
          program
        );
        await provider.sendAndConfirm(
          new Transaction().add(create_lancer_token_account_ix), 
          []
        );

        const creator_special_mint_account = await getOrCreateAssociatedTokenAccount(
            provider.connection,
            mint_authority,
            special_mint,
            creator.publicKey
        );

        const submitter_special_mint_account = await getOrCreateAssociatedTokenAccount(
            provider.connection,
            mint_authority,
            special_mint,
            submitter.publicKey
        );


        const special_mint_airdrop = await mintToChecked(
            provider.connection,
            mint_authority,
            special_mint,
            creator_special_mint_account.address,
            mint_authority,
            10 * WSOL_AMOUNT,
            MINT_DECIMALS
        );    
        const timestamp = Date.now().toString();

        const [feature_data_account] = await findFeatureAccount(
            timestamp, 
            creator.publicKey,
            program
        );
        const [feature_token_account] = await findFeatureTokenAccount(
        timestamp, 
        creator.publicKey,
        special_mint, 
        program,
        );
        const [program_authority] = await findProgramAuthority(
        program,
        );
        const [lancer_dao_token_account] = await findLancerTokenAccount(
            special_mint,
            program
        );
        const [dispute_account] = await findDisputeAccount(
            timestamp,
            creator.publicKey,
            special_mint,
            program
        );

        let tx = await program.methods.createFeatureFundingAccount(timestamp).
            accounts({
                creator: creator.publicKey,
                fundsMint: special_mint,
                featureDataAccount: feature_data_account,
                featureTokenAccount: feature_token_account,
                programAuthority: program_authority,
                tokenProgram: TOKEN_PROGRAM_ID,
                rent: SYSVAR_RENT_PUBKEY,
                associatedProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            }).signers([creator]).rpc();
        console.log("createFFA(Special mint) transaction signature", tx);

        let amount = 2 * LAMPORTS_PER_SOL;
        let fund_feature_ix = await fundFeatureInstruction(
            amount,
            timestamp,
            creator.publicKey,
            special_mint,
            program
        );
        tx = await provider.sendAndConfirm(new Transaction().add(fund_feature_ix), [creator]);
        console.log("fundFeature transaction signature", tx);

        try {
            await program.methods.createDispute().accounts({
                creator: creator.publicKey,
                featureDataAccount: feature_data_account,
                featureTokenAccount: feature_token_account,
                programAuthority: program_authority,
                disputeAdmin: creator.publicKey,
                disputeAccount: dispute_account,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            }).signers([creator]).rpc();
        } catch (err) {
            // console.log("err ", err);
            assert.equal((err as AnchorError).error.errorMessage, "This Pubkey is not a Valid Dispute Pubkey")
        }
        let addApproveSubmitterIx = await addApprovedSubmittersInstruction(
            timestamp,
            creator.publicKey,
            submitter.publicKey,
            program
        )
          
        tx = await provider.sendAndConfirm(new Transaction().add(addApproveSubmitterIx), [creator]); 
        console.log("addApproveSubmitters tx sig ", tx);

        let submit_request_ix = await submitRequestInstruction(
            timestamp,
            creator.publicKey,
            submitter.publicKey,
            submitter_special_mint_account.address,
            program
        )

        tx = await provider.sendAndConfirm(
            new Transaction().add(submit_request_ix),
            [submitter]
        );
        console.log("submit request tx = ", tx)

        // creator votes to cancel feature(VoteToCancel)
        let voteToCancelIxByCreator = await voteToCancelInstruction(
            timestamp,
            creator.publicKey,
            creator.publicKey,
            true,
            program
        );

        tx = await provider.sendAndConfirm(
            new Transaction().add(voteToCancelIxByCreator),
            [creator]
        );
        console.log("votes to cancel tx by creator = ", tx)

        const creator_account_before_balance = await provider.connection.getBalance(creator.publicKey);
        let create_dispute_ix = await createDisputeInstruction(
            timestamp,
            dispute_admin.publicKey,
            creator.publicKey,
            special_mint,
            program
        );
        tx = await provider.sendAndConfirm(
            new Transaction().add(create_dispute_ix),
            [dispute_admin]
        );
        console.log("create dispute tx = ", tx);

        const creator_account_after_balance = await provider.connection.getBalance(creator.publicKey);
        assert.equal(
            creator_account_after_balance.toString(), 
        (
            await provider.connection.getMinimumBalanceForRentExemption(getFeatureDataAccountLength()) + 
            parseInt(creator_account_before_balance.toString())
        ).toString()
        );
        let closed_data_account = await provider.connection.getBalance(feature_data_account);

        assert.equal(0, parseInt(closed_data_account.toString()));

    })

    it("create dispute when only submitter votes to cancel(using dispute3 as dispute admin)",async () => {
        let creator = await createKeypair(provider);
        let submitter = await createKeypair(provider);
        // let funder = provider.publicKey;
        let mint_authority = await createKeypair(provider);
        let dispute_admin = await createKeypairFromFile(provider, "../deploy/dispute_3.json");

        const special_mint = await createMint(
          provider.connection,
          mint_authority,
          mint_authority.publicKey,
          mint_authority.publicKey,
          MINT_DECIMALS,
        ); 
        const create_lancer_token_account_ix = await createLancerTokenAccountInstruction(
          special_mint,
          program
        );
        await provider.sendAndConfirm(
          new Transaction().add(create_lancer_token_account_ix), 
          []
        );

        const creator_special_mint_account = await getOrCreateAssociatedTokenAccount(
            provider.connection,
            mint_authority,
            special_mint,
            creator.publicKey
        );

        const submitter_special_mint_account = await getOrCreateAssociatedTokenAccount(
            provider.connection,
            mint_authority,
            special_mint,
            submitter.publicKey
        );


        const special_mint_airdrop = await mintToChecked(
            provider.connection,
            mint_authority,
            special_mint,
            creator_special_mint_account.address,
            mint_authority,
            10 * WSOL_AMOUNT,
            MINT_DECIMALS
        );    
        const timestamp = Date.now().toString();

        const [feature_data_account] = await findFeatureAccount(
            timestamp, 
            creator.publicKey,
            program
        );
        const [feature_token_account] = await findFeatureTokenAccount(
        timestamp, 
        creator.publicKey,
        special_mint, 
        program,
        );
        const [program_authority] = await findProgramAuthority(
        program,
        );
        const [lancer_dao_token_account] = await findLancerTokenAccount(
            special_mint,
            program
        );
        const [dispute_account] = await findDisputeAccount(
            timestamp,
            creator.publicKey,
            special_mint,
            program
        );

        let tx = await program.methods.createFeatureFundingAccount(timestamp).
            accounts({
                creator: creator.publicKey,
                fundsMint: special_mint,
                featureDataAccount: feature_data_account,
                featureTokenAccount: feature_token_account,
                programAuthority: program_authority,
                tokenProgram: TOKEN_PROGRAM_ID,
                rent: SYSVAR_RENT_PUBKEY,
                associatedProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            }).signers([creator]).rpc();
        console.log("createFFA(Special mint) transaction signature", tx);

        let amount = 2 * LAMPORTS_PER_SOL;
        let fund_feature_ix = await fundFeatureInstruction(
            amount,
            timestamp,
            creator.publicKey,
            special_mint,
            program
        );
        tx = await provider.sendAndConfirm(new Transaction().add(fund_feature_ix), [creator]);
        console.log("fundFeature transaction signature", tx);

        let addApproveSubmitterIx = await addApprovedSubmittersInstruction(
            timestamp,
            creator.publicKey,
            submitter.publicKey,
            program
        )
          
        tx = await provider.sendAndConfirm(new Transaction().add(addApproveSubmitterIx), [creator]); 
        console.log("addApproveSubmitters tx sig ", tx);

        let submit_request_ix = await submitRequestInstruction(
            timestamp,
            creator.publicKey,
            submitter.publicKey,
            submitter_special_mint_account.address,
            program
        )

        tx = await provider.sendAndConfirm(
            new Transaction().add(submit_request_ix),
            [submitter]
        );
        console.log("submit request tx = ", tx)

        // submitter votes to cancel feature(VoteToCancel)
        let voteToCancelIxBySubmitter = await voteToCancelInstruction(
            timestamp,
            creator.publicKey,
            submitter.publicKey,
            true,
            program
        );

        tx = await provider.sendAndConfirm(
            new Transaction().add(voteToCancelIxBySubmitter),
            [submitter]
        );
        console.log("votes to cancel tx by submitter = ", tx)

        const creator_account_before_balance = await provider.connection.getBalance(creator.publicKey);
        let create_dispute_ix = await createDisputeInstruction(
            timestamp,
            dispute_admin.publicKey,
            creator.publicKey,
            special_mint,
            program
        );
        tx = await provider.sendAndConfirm(
            new Transaction().add(create_dispute_ix),
            [dispute_admin]
        );
        console.log("create dispute tx = ", tx);

        const creator_account_after_balance = await provider.connection.getBalance(creator.publicKey);
        assert.equal(
            creator_account_after_balance.toString(), 
        (
            await provider.connection.getMinimumBalanceForRentExemption(getFeatureDataAccountLength()) + 
            parseInt(creator_account_before_balance.toString())
        ).toString()
        );
        let closed_data_account = await provider.connection.getBalance(feature_data_account);

        assert.equal(0, parseInt(closed_data_account.toString()));

    })

    it("create dispute fails when both creator and current submitter votes to cancel(using admin as dispute admin)", async () => {
        let creator = await createKeypair(provider);
        let submitter = await createKeypair(provider);
        // let funder = provider.publicKey;
        let mint_authority = await createKeypair(provider);
        let dispute_admin = await createKeypairFromFile(provider, "../deploy/admin.json");

        const special_mint = await createMint(
          provider.connection,
          mint_authority,
          mint_authority.publicKey,
          mint_authority.publicKey,
          MINT_DECIMALS,
        ); 
        const create_lancer_token_account_ix = await createLancerTokenAccountInstruction(
          special_mint,
          program
        );
        await provider.sendAndConfirm(
          new Transaction().add(create_lancer_token_account_ix), 
          []
        );

        const creator_special_mint_account = await getOrCreateAssociatedTokenAccount(
            provider.connection,
            mint_authority,
            special_mint,
            creator.publicKey
        );

        const submitter_special_mint_account = await getOrCreateAssociatedTokenAccount(
            provider.connection,
            mint_authority,
            special_mint,
            submitter.publicKey
        );


        const special_mint_airdrop = await mintToChecked(
            provider.connection,
            mint_authority,
            special_mint,
            creator_special_mint_account.address,
            mint_authority,
            10 * WSOL_AMOUNT,
            MINT_DECIMALS
        );    
        const timestamp = Date.now().toString();

        const [feature_data_account] = await findFeatureAccount(
            timestamp, 
            creator.publicKey,
            program
        );
        const [feature_token_account] = await findFeatureTokenAccount(
        timestamp, 
        creator.publicKey,
        special_mint, 
        program,
        );
        const [program_authority] = await findProgramAuthority(
        program,
        );
        const [lancer_dao_token_account] = await findLancerTokenAccount(
            special_mint,
            program
        );
        const [dispute_account] = await findDisputeAccount(
            timestamp,
            creator.publicKey,
            special_mint,
            program
        );

        let tx = await program.methods.createFeatureFundingAccount(timestamp).
            accounts({
                creator: creator.publicKey,
                fundsMint: special_mint,
                featureDataAccount: feature_data_account,
                featureTokenAccount: feature_token_account,
                programAuthority: program_authority,
                tokenProgram: TOKEN_PROGRAM_ID,
                rent: SYSVAR_RENT_PUBKEY,
                associatedProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            }).signers([creator]).rpc();
        console.log("createFFA(Special mint) transaction signature", tx);

        let amount = 2 * LAMPORTS_PER_SOL;
        let fund_feature_ix = await fundFeatureInstruction(
            amount,
            timestamp,
            creator.publicKey,
            special_mint,
            program
        );
        tx = await provider.sendAndConfirm(new Transaction().add(fund_feature_ix), [creator]);
        console.log("fundFeature transaction signature", tx);

        let addApproveSubmitterIx = await addApprovedSubmittersInstruction(
            timestamp,
            creator.publicKey,
            submitter.publicKey,
            program
        )
          
        tx = await provider.sendAndConfirm(new Transaction().add(addApproveSubmitterIx), [creator]); 
        console.log("addApproveSubmitters tx sig ", tx);

        let submit_request_ix = await submitRequestInstruction(
            timestamp,
            creator.publicKey,
            submitter.publicKey,
            submitter_special_mint_account.address,
            program
        )

        tx = await provider.sendAndConfirm(
            new Transaction().add(submit_request_ix),
            [submitter]
        );
        console.log("submit request tx = ", tx)

        // submitter votes to cancel feature(VoteToCancel)
        let voteToCancelIxBySubmitter = await voteToCancelInstruction(
            timestamp,
            creator.publicKey,
            submitter.publicKey,
            true,
            program
        );
        // creator votes to cancel feature(VoteToCancel)
        let voteToCancelIxByCreator = await voteToCancelInstruction(
            timestamp,
            creator.publicKey,
            creator.publicKey,
            true,
            program
        );

        tx = await provider.sendAndConfirm(
            new Transaction().add(voteToCancelIxBySubmitter),
            [submitter]
        );
        console.log("votes to cancel tx by submitter = ", tx)
        tx = await provider.sendAndConfirm(
            new Transaction().add(voteToCancelIxByCreator),
            [creator]
        );
        console.log("votes to cancel tx by creator = ", tx)

        try {
            await program.methods.createDispute().accounts({
                creator: creator.publicKey,
                featureDataAccount: feature_data_account,
                featureTokenAccount: feature_token_account,
                programAuthority: program_authority,
                disputeAdmin: provider.publicKey,
                disputeAccount: dispute_account,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            }).signers([dispute_admin]).rpc();
        } catch (err) {
            assert.equal((err as AnchorError).error.errorMessage, "Cannot Dispute Bounty")
        }

    })

    
})