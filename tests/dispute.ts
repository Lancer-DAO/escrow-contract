import * as anchor from "@project-serum/anchor";
import { AnchorError, Program } from "@project-serum/anchor";
import {
    ACCOUNT_SIZE,
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
import { add_more_token, createKeypair, createKeypairFromFile, getDisputeAccountLength, getFeatureDataAccountLength } from "./utils";
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
  settleDisputeInstruction,
} from "../sdk/instructions";
import { assert, expect } from "chai";
import { rpc } from "@project-serum/anchor/dist/cjs/utils";

// TODO -check all referral bumps
// TODO - Add these tests to tests.yaml and console.log tx hash of every single tx in tests/ folder
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

    it("settle dispute paying uneven portions",async () => {
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
        const [lancer_token_program_authority] = await findLancerProgramAuthority(program)
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

        try {
            await program.methods.settleDispute(new anchor.BN(amount)).accounts({
                disputeAdmin: creator.publicKey,
                creator: creator.publicKey,
                creatorTokenAccount: creator_special_mint_account.address,
                submitter: submitter.publicKey,
                submitterTokenAccount: submitter_special_mint_account.address,
                lancerDaoTokenAccount: lancer_dao_token_account,
                lancerTokenProgramAuthority: lancer_token_program_authority,
                disputeAccount: dispute_account,
                featureTokenAccount: feature_token_account,
                programAuthority: program_authority,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            }).signers([creator]).rpc()
        } catch (err) {
            // console.log("err => ", err );
            assert.equal((err as AnchorError).error.errorMessage, "This Pubkey is not a Valid Dispute Pubkey")
        }

        try {
            // use admin as dispute admin
            await program.methods.settleDispute(new anchor.BN(amount + amount)).accounts({
                disputeAdmin: provider.publicKey,
                creator: creator.publicKey,
                creatorTokenAccount: creator_special_mint_account.address,
                submitter: submitter.publicKey,
                submitterTokenAccount: submitter_special_mint_account.address,
                lancerDaoTokenAccount: lancer_dao_token_account,
                lancerTokenProgramAuthority: lancer_token_program_authority,
                disputeAccount: dispute_account,
                featureTokenAccount: feature_token_account,
                programAuthority: program_authority,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            }).signers([]).rpc()
        } catch (err) {
            // console.log("err => ", err );
            assert.equal((err as AnchorError).error.errorMessage, "Insufficient funds")
        }

        const creator_account_before_balance = await provider.connection.getBalance(creator.publicKey);
        const dispute_admin_account_before_balance = await provider.connection.getBalance(dispute_admin.publicKey);
        const submitter_token_account_before_balance = await provider.connection.getTokenAccountBalance(submitter_special_mint_account.address)
        const creator_token_account_before_balance = await provider.connection.getTokenAccountBalance(creator_special_mint_account.address)
        const lancer_token_account_before_balance = await provider.connection.getTokenAccountBalance(lancer_dao_token_account)

        let submitter_amount_for_dispute = amount / 5;
        let settle_dispute_ix = await settleDisputeInstruction(
            timestamp,
            dispute_admin.publicKey,
            creator.publicKey,
            submitter.publicKey,
            special_mint,
            submitter_amount_for_dispute,
            program
        );
        tx = await provider.sendAndConfirm(
            new Transaction().add(settle_dispute_ix),
            [dispute_admin]
        );
        console.log("settled dispute tx = ", tx);

        const creator_account_after_balance = await provider.connection.getBalance(creator.publicKey);
        const dispute_admin_after_balance = await provider.connection.getBalance(dispute_admin.publicKey);

        const submitter_token_account_after_balance = await provider.connection.getTokenAccountBalance(submitter_special_mint_account.address)
        const creator_token_account_after_balance = await provider.connection.getTokenAccountBalance(creator_special_mint_account.address)
        const lancer_token_account_after_balance = await provider.connection.getTokenAccountBalance(lancer_dao_token_account)

        // Checking submitter got exact share
        assert.equal(
          submitter_token_account_after_balance.value.amount, 
          (// submitter gets 95% of bounty amount
            (COMPLETER_FEE * submitter_amount_for_dispute) + parseInt(submitter_token_account_before_balance.value.amount)
          ).toString()
        );
        // Checking lancer got exact fees
        assert.equal(
          lancer_token_account_after_balance.value.amount,
          (// 5% from both sides
            (LANCER_FEE * amount) + parseInt(lancer_token_account_before_balance.value.amount)
          ).toString()
        )
        // Checking Creator got back remaining amount
        assert.equal(
            creator_token_account_after_balance.value.amount, 
            (// submitter gets 95% of bounty amount
              (COMPLETER_FEE * (amount - submitter_amount_for_dispute)) + 
              parseInt(creator_token_account_before_balance.value.amount)
            ).toString()
          );
  

        // creator gets back SOL from token account
        assert.equal(
            creator_account_after_balance.toString(), 
            (
                await provider.connection.getMinimumBalanceForRentExemption(ACCOUNT_SIZE) + 
                parseInt(creator_account_before_balance.toString())
            ).toString()
        );
        // dispute admin gets back SOL from dispute account
        expect(
            dispute_admin_after_balance.toString() > dispute_admin_account_before_balance.toString(),
            "Dispute Admin did not get rent from closing dispute account"
        );
        let closed_dispute_data_account = await provider.connection.getBalance(dispute_account);
        let closed_feature_token_account = await provider.connection.getBalance(feature_token_account);

        assert.equal(0, parseInt(closed_dispute_data_account.toString()));
        assert.equal(0, parseInt(closed_feature_token_account.toString()));


        
    })

    it("settle dispute paying uneven portions(when admin is the creator)",async () => {
        let creator = await createKeypairFromFile(provider, "../deploy/admin.json");
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
        const [lancer_token_program_authority] = await findLancerProgramAuthority(program)
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
            let fake_dispute = await createKeypair(provider);
            await program.methods.createDispute().accounts({
                creator: creator.publicKey,
                featureDataAccount: feature_data_account,
                featureTokenAccount: feature_token_account,
                programAuthority: program_authority,
                disputeAdmin: fake_dispute.publicKey,
                disputeAccount: dispute_account,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            }).signers([fake_dispute]).rpc();
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

        tx = await provider.sendAndConfirm(new Transaction().add(addApproveSubmitterIx), []); 
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

        try {
            let fake_dispute = await createKeypair(provider);

            await program.methods.settleDispute(new anchor.BN(amount)).accounts({
                disputeAdmin: fake_dispute.publicKey,
                creator: creator.publicKey,
                creatorTokenAccount: creator_special_mint_account.address,
                submitter: submitter.publicKey,
                submitterTokenAccount: submitter_special_mint_account.address,
                lancerDaoTokenAccount: lancer_dao_token_account,
                lancerTokenProgramAuthority: lancer_token_program_authority,
                disputeAccount: dispute_account,
                featureTokenAccount: feature_token_account,
                programAuthority: program_authority,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            }).signers([fake_dispute]).rpc()
        } catch (err) {
            // console.log("err => ", err );
            assert.equal((err as AnchorError).error.errorMessage, "This Pubkey is not a Valid Dispute Pubkey")
        }

        try {
            // use admin as dispute admin
            await program.methods.settleDispute(new anchor.BN(amount + amount)).accounts({
                disputeAdmin: provider.publicKey,
                creator: creator.publicKey,
                creatorTokenAccount: creator_special_mint_account.address,
                submitter: submitter.publicKey,
                submitterTokenAccount: submitter_special_mint_account.address,
                lancerDaoTokenAccount: lancer_dao_token_account,
                lancerTokenProgramAuthority: lancer_token_program_authority,
                disputeAccount: dispute_account,
                featureTokenAccount: feature_token_account,
                programAuthority: program_authority,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            }).signers([]).rpc()
        } catch (err) {
            // console.log("err => ", err );
            assert.equal((err as AnchorError).error.errorMessage, "Insufficient funds")
        }

        const creator_account_before_balance = await provider.connection.getBalance(creator.publicKey);
        const dispute_admin_account_before_balance = await provider.connection.getBalance(dispute_admin.publicKey);
        const submitter_token_account_before_balance = await provider.connection.getTokenAccountBalance(submitter_special_mint_account.address)
        const creator_token_account_before_balance = await provider.connection.getTokenAccountBalance(creator_special_mint_account.address)
        const lancer_token_account_before_balance = await provider.connection.getTokenAccountBalance(lancer_dao_token_account)

        let submitter_amount_for_dispute = amount / 5;
        let settle_dispute_ix = await settleDisputeInstruction(
            timestamp,
            dispute_admin.publicKey,
            creator.publicKey,
            submitter.publicKey,
            special_mint,
            submitter_amount_for_dispute,
            program
        );
        tx = await provider.sendAndConfirm(
            new Transaction().add(settle_dispute_ix),
            [dispute_admin]
        );
        console.log("settled dispute tx = ", tx);

        const creator_account_after_balance = await provider.connection.getBalance(creator.publicKey);
        const dispute_admin_after_balance = await provider.connection.getBalance(dispute_admin.publicKey);

        const submitter_token_account_after_balance = await provider.connection.getTokenAccountBalance(submitter_special_mint_account.address)
        const creator_token_account_after_balance = await provider.connection.getTokenAccountBalance(creator_special_mint_account.address)
        const lancer_token_account_after_balance = await provider.connection.getTokenAccountBalance(lancer_dao_token_account)

        // Checking submitter got exact share
        assert.equal(
          submitter_token_account_after_balance.value.amount, 
          (// submitter gets 100% of bounty amount
            (submitter_amount_for_dispute) + parseInt(submitter_token_account_before_balance.value.amount)
          ).toString()
        );
        // Checking lancer got no fees
        assert.equal(
          lancer_token_account_after_balance.value.amount,
          (
            parseInt(lancer_token_account_before_balance.value.amount)
          ).toString()
        )
        // Checking Creator got back remaining amount
        assert.equal(
            creator_token_account_after_balance.value.amount, 
            (// submitter gets 100% of bounty amount
              ((amount - submitter_amount_for_dispute)) + 
              parseInt(creator_token_account_before_balance.value.amount)
            ).toString()
          );
  

        // creator gets back SOL from token account
        expect(
            creator_account_after_balance.toString() >
            creator_account_before_balance.toString(),
            "Admin(Creator) Should get some SOL for closing token account"
        );
        // dispute admin gets back SOL from dispute account
        expect(
            dispute_admin_after_balance.toString() > dispute_admin_account_before_balance.toString(),
            "Dispute Admin did not get rent from closing dispute account"
        );
        let closed_dispute_data_account = await provider.connection.getBalance(dispute_account);
        let closed_feature_token_account = await provider.connection.getBalance(feature_token_account);

        assert.equal(0, parseInt(closed_dispute_data_account.toString()));
        assert.equal(0, parseInt(closed_feature_token_account.toString()));
        
    })

    it("settle dispute when there's no pay for submitter",async () => {
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
        const [lancer_token_program_authority] = await findLancerProgramAuthority(program)
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

        try {
            await program.methods.settleDispute(new anchor.BN(amount)).accounts({
                disputeAdmin: creator.publicKey,
                creator: creator.publicKey,
                creatorTokenAccount: creator_special_mint_account.address,
                submitter: submitter.publicKey,
                submitterTokenAccount: submitter_special_mint_account.address,
                lancerDaoTokenAccount: lancer_dao_token_account,
                lancerTokenProgramAuthority: lancer_token_program_authority,
                disputeAccount: dispute_account,
                featureTokenAccount: feature_token_account,
                programAuthority: program_authority,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            }).signers([creator]).rpc()
        } catch (err) {
            // console.log("err => ", err );
            assert.equal((err as AnchorError).error.errorMessage, "This Pubkey is not a Valid Dispute Pubkey")
        }

        try {
            // use admin as dispute admin
            await program.methods.settleDispute(new anchor.BN(amount + amount)).accounts({
                disputeAdmin: provider.publicKey,
                creator: creator.publicKey,
                creatorTokenAccount: creator_special_mint_account.address,
                submitter: submitter.publicKey,
                submitterTokenAccount: submitter_special_mint_account.address,
                lancerDaoTokenAccount: lancer_dao_token_account,
                lancerTokenProgramAuthority: lancer_token_program_authority,
                disputeAccount: dispute_account,
                featureTokenAccount: feature_token_account,
                programAuthority: program_authority,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            }).signers([]).rpc()
        } catch (err) {
            // console.log("err => ", err );
            assert.equal((err as AnchorError).error.errorMessage, "Insufficient funds")
        }

        const creator_account_before_balance = await provider.connection.getBalance(creator.publicKey);
        const dispute_admin_account_before_balance = await provider.connection.getBalance(dispute_admin.publicKey);
        const submitter_token_account_before_balance = await provider.connection.getTokenAccountBalance(submitter_special_mint_account.address)
        const creator_token_account_before_balance = await provider.connection.getTokenAccountBalance(creator_special_mint_account.address)
        const lancer_token_account_before_balance = await provider.connection.getTokenAccountBalance(lancer_dao_token_account)

        let submitter_amount_for_dispute = 0;

        
        let settle_dispute_ix = await settleDisputeInstruction(
            timestamp,
            dispute_admin.publicKey,
            creator.publicKey,
            submitter.publicKey,
            special_mint,
            submitter_amount_for_dispute,
            program
        );
        tx = await provider.sendAndConfirm(
            new Transaction().add(settle_dispute_ix),
            [dispute_admin]
        );
        console.log("settled dispute tx = ", tx);

        const creator_account_after_balance = await provider.connection.getBalance(creator.publicKey);
        const dispute_admin_after_balance = await provider.connection.getBalance(dispute_admin.publicKey);

        const submitter_token_account_after_balance = await provider.connection.getTokenAccountBalance(submitter_special_mint_account.address)
        const creator_token_account_after_balance = await provider.connection.getTokenAccountBalance(creator_special_mint_account.address)
        const lancer_token_account_after_balance = await provider.connection.getTokenAccountBalance(lancer_dao_token_account)

        // Checking submitter got exact share
        assert.equal(
          submitter_token_account_after_balance.value.amount, 
          (// submitter gets 95% of bounty amount
            (COMPLETER_FEE * submitter_amount_for_dispute) + parseInt(submitter_token_account_before_balance.value.amount)
          ).toString()
        );
        // Checking lancer does not get fees when submitter was not paid after a dispute
        assert.equal(
          lancer_token_account_after_balance.value.amount,
          (// 5% from both sides
            parseInt(lancer_token_account_before_balance.value.amount)
          ).toString()
        )
        // Checking Creator got back remaining amount
        assert.equal(
            creator_token_account_after_balance.value.amount, 
            (// Creator gets 105% of bounty amount
              ((COMPLETER_FEE + LANCER_FEE) * (amount - submitter_amount_for_dispute)) + 
              parseInt(creator_token_account_before_balance.value.amount)
            ).toString()
          );
  

        // creator gets back SOL from token account
        assert.equal(
            creator_account_after_balance.toString(), 
            (
                await provider.connection.getMinimumBalanceForRentExemption(ACCOUNT_SIZE) + 
                parseInt(creator_account_before_balance.toString())
            ).toString()
        );
        // dispute admin gets back SOL from dispute account
        expect(
            dispute_admin_after_balance.toString() > dispute_admin_account_before_balance.toString(),
            "Dispute Admin did not get rent from closing dispute account"
        );
        let closed_dispute_data_account = await provider.connection.getBalance(dispute_account);
        let closed_feature_token_account = await provider.connection.getBalance(feature_token_account);

        assert.equal(0, parseInt(closed_dispute_data_account.toString()));
        assert.equal(0, parseInt(closed_feature_token_account.toString()));

    })

    it("settle dispute when there's no pay for submitter and admin is the creator",async () => {
        let creator = await createKeypairFromFile(provider, "../deploy/admin.json");
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
        const [lancer_token_program_authority] = await findLancerProgramAuthority(program)
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
            let fake_dispute = await createKeypair(provider);
            await program.methods.createDispute().accounts({
                creator: creator.publicKey,
                featureDataAccount: feature_data_account,
                featureTokenAccount: feature_token_account,
                programAuthority: program_authority,
                disputeAdmin: fake_dispute.publicKey,
                disputeAccount: dispute_account,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            }).signers([fake_dispute]).rpc();
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

        try {
            let fake_dispute = await createKeypair(provider);
            await program.methods.settleDispute(new anchor.BN(amount)).accounts({
                disputeAdmin: fake_dispute.publicKey,
                creator: creator.publicKey,
                creatorTokenAccount: creator_special_mint_account.address,
                submitter: submitter.publicKey,
                submitterTokenAccount: submitter_special_mint_account.address,
                lancerDaoTokenAccount: lancer_dao_token_account,
                lancerTokenProgramAuthority: lancer_token_program_authority,
                disputeAccount: dispute_account,
                featureTokenAccount: feature_token_account,
                programAuthority: program_authority,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            }).signers([fake_dispute]).rpc()
        } catch (err) {
            // console.log("err => ", err );
            assert.equal((err as AnchorError).error.errorMessage, "This Pubkey is not a Valid Dispute Pubkey")
        }

        try {
            // use admin as dispute admin
            await program.methods.settleDispute(new anchor.BN(amount + amount)).accounts({
                disputeAdmin: provider.publicKey,
                creator: creator.publicKey,
                creatorTokenAccount: creator_special_mint_account.address,
                submitter: submitter.publicKey,
                submitterTokenAccount: submitter_special_mint_account.address,
                lancerDaoTokenAccount: lancer_dao_token_account,
                lancerTokenProgramAuthority: lancer_token_program_authority,
                disputeAccount: dispute_account,
                featureTokenAccount: feature_token_account,
                programAuthority: program_authority,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            }).signers([]).rpc()
        } catch (err) {
            // console.log("err => ", err );
            assert.equal((err as AnchorError).error.errorMessage, "Insufficient funds")
        }

        const creator_account_before_balance = await provider.connection.getBalance(creator.publicKey);
        const dispute_admin_account_before_balance = await provider.connection.getBalance(dispute_admin.publicKey);
        const submitter_token_account_before_balance = await provider.connection.getTokenAccountBalance(submitter_special_mint_account.address)
        const creator_token_account_before_balance = await provider.connection.getTokenAccountBalance(creator_special_mint_account.address)
        const lancer_token_account_before_balance = await provider.connection.getTokenAccountBalance(lancer_dao_token_account)

        let submitter_amount_for_dispute = 0;

        
        let settle_dispute_ix = await settleDisputeInstruction(
            timestamp,
            dispute_admin.publicKey,
            creator.publicKey,
            submitter.publicKey,
            special_mint,
            submitter_amount_for_dispute,
            program
        );
        tx = await provider.sendAndConfirm(
            new Transaction().add(settle_dispute_ix),
            [dispute_admin]
        );
        console.log("settled dispute tx = ", tx);

        const creator_account_after_balance = await provider.connection.getBalance(creator.publicKey);
        const dispute_admin_after_balance = await provider.connection.getBalance(dispute_admin.publicKey);

        const submitter_token_account_after_balance = await provider.connection.getTokenAccountBalance(submitter_special_mint_account.address)
        const creator_token_account_after_balance = await provider.connection.getTokenAccountBalance(creator_special_mint_account.address)
        const lancer_token_account_after_balance = await provider.connection.getTokenAccountBalance(lancer_dao_token_account)

        // Checking submitter got exact share
        assert.equal(
          submitter_token_account_after_balance.value.amount, 
          (// submitter gets 0% of bounty amount
            (COMPLETER_FEE * submitter_amount_for_dispute) + parseInt(submitter_token_account_before_balance.value.amount)
          ).toString()
        );
        // Checking lancer does not get fees when submitter was not paid after a dispute
        assert.equal(
          lancer_token_account_after_balance.value.amount,
          (// 5% from both sides
            parseInt(lancer_token_account_before_balance.value.amount)
          ).toString()
        )
        // Checking Creator got back remaining amount
        assert.equal(
            creator_token_account_after_balance.value.amount, 
            (// Creator gets 100% of bounty amount
              ((amount - submitter_amount_for_dispute)) + 
              parseInt(creator_token_account_before_balance.value.amount)
            ).toString()
          );
  

        // creator gets back SOL from token account
        expect(
            creator_account_after_balance >
            creator_account_before_balance,
            "Creator(Admin) Should have more SOL from closing token account"
        );
        // dispute admin gets back SOL from dispute account
        expect(
            dispute_admin_after_balance.toString() > dispute_admin_account_before_balance.toString(),
            "Dispute Admin did not get rent from closing dispute account"
        );
        let closed_dispute_data_account = await provider.connection.getBalance(dispute_account);
        let closed_feature_token_account = await provider.connection.getBalance(feature_token_account);

        assert.equal(0, parseInt(closed_dispute_data_account.toString()));
        assert.equal(0, parseInt(closed_feature_token_account.toString()));

    })

    
    it("settle dispute when there's no pay for creator",async () => {
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
        const [lancer_token_program_authority] = await findLancerProgramAuthority(program)
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

        try {
            await program.methods.settleDispute(new anchor.BN(amount)).accounts({
                disputeAdmin: creator.publicKey,
                creator: creator.publicKey,
                creatorTokenAccount: creator_special_mint_account.address,
                submitter: submitter.publicKey,
                submitterTokenAccount: submitter_special_mint_account.address,
                lancerDaoTokenAccount: lancer_dao_token_account,
                lancerTokenProgramAuthority: lancer_token_program_authority,
                disputeAccount: dispute_account,
                featureTokenAccount: feature_token_account,
                programAuthority: program_authority,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            }).signers([creator]).rpc()
        } catch (err) {
            // console.log("err => ", err );
            assert.equal((err as AnchorError).error.errorMessage, "This Pubkey is not a Valid Dispute Pubkey")
        }

        try {
            // use admin as dispute admin
            await program.methods.settleDispute(new anchor.BN(amount + amount)).accounts({
                disputeAdmin: provider.publicKey,
                creator: creator.publicKey,
                creatorTokenAccount: creator_special_mint_account.address,
                submitter: submitter.publicKey,
                submitterTokenAccount: submitter_special_mint_account.address,
                lancerDaoTokenAccount: lancer_dao_token_account,
                lancerTokenProgramAuthority: lancer_token_program_authority,
                disputeAccount: dispute_account,
                featureTokenAccount: feature_token_account,
                programAuthority: program_authority,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            }).signers([]).rpc()
        } catch (err) {
            // console.log("err => ", err );
            assert.equal((err as AnchorError).error.errorMessage, "Insufficient funds")
        }

        const creator_account_before_balance = await provider.connection.getBalance(creator.publicKey);
        const dispute_admin_account_before_balance = await provider.connection.getBalance(dispute_admin.publicKey);
        const submitter_token_account_before_balance = await provider.connection.getTokenAccountBalance(submitter_special_mint_account.address)
        const creator_token_account_before_balance = await provider.connection.getTokenAccountBalance(creator_special_mint_account.address)
        const lancer_token_account_before_balance = await provider.connection.getTokenAccountBalance(lancer_dao_token_account)

        let submitter_amount_for_dispute = amount;

        
        let settle_dispute_ix = await settleDisputeInstruction(
            timestamp,
            dispute_admin.publicKey,
            creator.publicKey,
            submitter.publicKey,
            special_mint,
            submitter_amount_for_dispute,
            program
        );
        tx = await provider.sendAndConfirm(
            new Transaction().add(settle_dispute_ix),
            [dispute_admin]
        );
        console.log("settled dispute tx = ", tx);

        const creator_account_after_balance = await provider.connection.getBalance(creator.publicKey);
        const dispute_admin_after_balance = await provider.connection.getBalance(dispute_admin.publicKey);

        const submitter_token_account_after_balance = await provider.connection.getTokenAccountBalance(submitter_special_mint_account.address)
        const creator_token_account_after_balance = await provider.connection.getTokenAccountBalance(creator_special_mint_account.address)
        const lancer_token_account_after_balance = await provider.connection.getTokenAccountBalance(lancer_dao_token_account)

        // Checking submitter got exact share
        assert.equal(amount, submitter_amount_for_dispute);
        assert.equal(
          submitter_token_account_after_balance.value.amount, 
          (// submitter gets 95% of bounty amount
            (COMPLETER_FEE * submitter_amount_for_dispute) + parseInt(submitter_token_account_before_balance.value.amount)
          ).toString()
        );
        // Checking lancer got exact fees
        assert.equal(
            lancer_token_account_after_balance.value.amount,
            (// 5% from both sides
              (LANCER_FEE * amount) + parseInt(lancer_token_account_before_balance.value.amount)
            ).toString()
          )
          // Checking Creator got back remaining amount
        assert.equal(
            creator_token_account_after_balance.value.amount, 
            (// submitter gets 95% of bounty amount
              ((COMPLETER_FEE + LANCER_FEE) * (amount - submitter_amount_for_dispute)) + 
              parseInt(creator_token_account_before_balance.value.amount)
            ).toString()
          );
  

        // creator gets back SOL from token account
        assert.equal(
            creator_account_after_balance.toString(), 
            (
                await provider.connection.getMinimumBalanceForRentExemption(ACCOUNT_SIZE) + 
                parseInt(creator_account_before_balance.toString())
            ).toString()
        );
        // dispute admin gets back SOL from dispute account
        expect(
            dispute_admin_after_balance.toString() > dispute_admin_account_before_balance.toString(),
            "Dispute Admin did not get rent from closing dispute account"
        );
        let closed_dispute_data_account = await provider.connection.getBalance(dispute_account);
        let closed_feature_token_account = await provider.connection.getBalance(feature_token_account);

        assert.equal(0, parseInt(closed_dispute_data_account.toString()));
        assert.equal(0, parseInt(closed_feature_token_account.toString()));

    })


    it("settle dispute when there's no pay for creator(also admin)",async () => {
        let creator = await createKeypairFromFile(provider, "../deploy/admin.json");
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
        const [lancer_token_program_authority] = await findLancerProgramAuthority(program)
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
            let fake_dispute = await createKeypair(provider);
            await program.methods.createDispute().accounts({
                creator: creator.publicKey,
                featureDataAccount: feature_data_account,
                featureTokenAccount: feature_token_account,
                programAuthority: program_authority,
                disputeAdmin: fake_dispute.publicKey,
                disputeAccount: dispute_account,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            }).signers([fake_dispute]).rpc();
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

        try {
            let fake_dispute = await createKeypair(provider);
            await program.methods.settleDispute(new anchor.BN(amount)).accounts({
                disputeAdmin: fake_dispute.publicKey,
                creator: creator.publicKey,
                creatorTokenAccount: creator_special_mint_account.address,
                submitter: submitter.publicKey,
                submitterTokenAccount: submitter_special_mint_account.address,
                lancerDaoTokenAccount: lancer_dao_token_account,
                lancerTokenProgramAuthority: lancer_token_program_authority,
                disputeAccount: dispute_account,
                featureTokenAccount: feature_token_account,
                programAuthority: program_authority,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            }).signers([fake_dispute]).rpc()
        } catch (err) {
            // console.log("err => ", err );
            assert.equal((err as AnchorError).error.errorMessage, "This Pubkey is not a Valid Dispute Pubkey")
        }

        try {
            // use admin as dispute admin
            await program.methods.settleDispute(new anchor.BN(amount + amount)).accounts({
                disputeAdmin: provider.publicKey,
                creator: creator.publicKey,
                creatorTokenAccount: creator_special_mint_account.address,
                submitter: submitter.publicKey,
                submitterTokenAccount: submitter_special_mint_account.address,
                lancerDaoTokenAccount: lancer_dao_token_account,
                lancerTokenProgramAuthority: lancer_token_program_authority,
                disputeAccount: dispute_account,
                featureTokenAccount: feature_token_account,
                programAuthority: program_authority,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            }).signers([]).rpc()
        } catch (err) {
            // console.log("err => ", err );
            assert.equal((err as AnchorError).error.errorMessage, "Insufficient funds")
        }

        const creator_account_before_balance = await provider.connection.getBalance(creator.publicKey);
        const dispute_admin_account_before_balance = await provider.connection.getBalance(dispute_admin.publicKey);
        const submitter_token_account_before_balance = await provider.connection.getTokenAccountBalance(submitter_special_mint_account.address)
        const creator_token_account_before_balance = await provider.connection.getTokenAccountBalance(creator_special_mint_account.address)
        const lancer_token_account_before_balance = await provider.connection.getTokenAccountBalance(lancer_dao_token_account)

        let submitter_amount_for_dispute = amount;

        
        let settle_dispute_ix = await settleDisputeInstruction(
            timestamp,
            dispute_admin.publicKey,
            creator.publicKey,
            submitter.publicKey,
            special_mint,
            submitter_amount_for_dispute,
            program
        );
        tx = await provider.sendAndConfirm(
            new Transaction().add(settle_dispute_ix),
            [dispute_admin]
        );
        console.log("settled dispute tx = ", tx);

        const creator_account_after_balance = await provider.connection.getBalance(creator.publicKey);
        const dispute_admin_after_balance = await provider.connection.getBalance(dispute_admin.publicKey);

        const submitter_token_account_after_balance = await provider.connection.getTokenAccountBalance(submitter_special_mint_account.address)
        const creator_token_account_after_balance = await provider.connection.getTokenAccountBalance(creator_special_mint_account.address)
        const lancer_token_account_after_balance = await provider.connection.getTokenAccountBalance(lancer_dao_token_account)

        // Checking submitter got exact share
        assert.equal(amount, submitter_amount_for_dispute);
        assert.equal(
          submitter_token_account_after_balance.value.amount, 
          (// submitter gets 100% of bounty amount
            (submitter_amount_for_dispute) + parseInt(submitter_token_account_before_balance.value.amount)
          ).toString()
        );
        // Checking lancer got no fees
        assert.equal(
            lancer_token_account_after_balance.value.amount,
            (// 0% from both sides
              parseInt(lancer_token_account_before_balance.value.amount)
            ).toString()
          )
          // Checking Creator got back remaining amount
        assert.equal(
            creator_token_account_after_balance.value.amount, 
            (// creator gets 0% of bounty amount
              ((amount - submitter_amount_for_dispute)) + 
              parseInt(creator_token_account_before_balance.value.amount)
            ).toString()
          );
  

        // creator gets back SOL from token account
        expect(
            creator_account_after_balance >
            creator_account_before_balance, 
            "Creator(Admin) should have more SOL from closing token account"
        );
        // dispute admin gets back SOL from dispute account
        expect(
            dispute_admin_after_balance.toString() > dispute_admin_account_before_balance.toString(),
            "Dispute Admin did not get rent from closing dispute account"
        );
        let closed_dispute_data_account = await provider.connection.getBalance(dispute_account);
        let closed_feature_token_account = await provider.connection.getBalance(feature_token_account);

        assert.equal(0, parseInt(closed_dispute_data_account.toString()));
        assert.equal(0, parseInt(closed_feature_token_account.toString()));

    })

})