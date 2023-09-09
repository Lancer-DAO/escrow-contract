import * as anchor from "@project-serum/anchor";
import { AnchorError, Program } from "@project-serum/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID, createAccount, createInitializeAccount3Instruction, createMint, createSyncNativeInstruction, getAccount, getMint, getOrCreateAssociatedTokenAccount, mintToChecked, NATIVE_MINT, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import  MonoProgramJSON  from "../sdk/idl/mono_program.json";
import { COMPLETER_FEE, LANCER_ADMIN, LANCER_FEE, MINT_DECIMALS, MONO_DEVNET, WSOL_ADDRESS } from "../sdk/constants";
import { ComputeBudgetInstruction, ComputeBudgetProgram, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import { add_more_token, createKeypair } from "./utils";
import { findFeatureAccount, findFeatureTokenAccount, findLancerCompanyTokens, findLancerCompleterTokens, findLancerProgramAuthority, findLancerTokenAccount, findProgramAuthority, findProgramMintAuthority, findReferralDataAccount } from "../sdk/pda";
import { addApprovedSubmittersInstruction, addApprovedSubmittersV1Instruction, adminCloseBountyInstruction, approveRequestInstruction, approveRequestMultipleTransaction, approveRequestPartialInstruction, cancelFeatureInstruction, createFeatureFundingAccountInstruction, createLancerTokenAccountInstruction, createReferralDataAccountInstruction, denyRequestInstruction, enableMultipleSubmittersInstruction, fundFeatureInstruction, removeApprovedSubmittersInstruction, removeApprovedSubmittersV1Instruction, setShareMultipleSubmittersInstruction, submitRequestInstruction, submitRequestMultipleInstruction, voteToCancelInstruction, withdrawTokensInstruction } from "../sdk/instructions";
import { assert } from "chai";
import { min } from "bn.js";
import { MonoProgram } from "../sdk/types/mono_program";
import { rpc } from "@project-serum/anchor/dist/cjs/utils";


describe("admin tests", () => {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());
    const provider =  anchor.getProvider() as anchor.AnchorProvider;
  
    const program = new Program<MonoProgram>(
          MonoProgramJSON as unknown as MonoProgram, 
          new PublicKey(MONO_DEVNET), 
          provider
      );
      const WSOL_AMOUNT = 2 * LAMPORTS_PER_SOL;

      it("test createLancerTokenAccount works", async () => {
        let lancer_admin = await createKeypair(provider);
        
        const [lancer_dao_token_account] = await findLancerTokenAccount(
          WSOL_ADDRESS,
          program
        );
        const [lancer_token_program_authority] = await findLancerProgramAuthority(
          program
        );

        try {
          await program.methods.createLancerTokenAccount()
          .accounts({
            lancerAdmin: lancer_admin.publicKey,
            fundsMint: WSOL_ADDRESS,
            lancerDaoTokenAccount: lancer_dao_token_account,
            programAuthority: lancer_token_program_authority,
          }).signers([lancer_admin]).rpc()
    
        } catch (err) {
          assert.equal((err as AnchorError).error.errorMessage,"You are not the Admin")
        }
      
        const create_lancer_token_account_ix = await createLancerTokenAccountInstruction(
          WSOL_ADDRESS,
          program
        );
        await provider.sendAndConfirm(
          new Transaction().add(create_lancer_token_account_ix), 
          []
        );

        let lancer_token_account_info = await getAccount(
          provider.connection,
          lancer_dao_token_account
        );
        assert.equal(lancer_token_account_info.mint.toString(), WSOL_ADDRESS.toString())
        assert.equal(
          lancer_token_account_info.owner.toString(), 
          lancer_token_program_authority.toString()
        )
      })

      it ("Admin can close spam Bounties",async () => {
        let creator = await createKeypair(provider);
        let funder = provider.publicKey;
        let mint_authority = await createKeypair(provider);

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
        let lancer_token_account_before_bounty = await provider.connection.getTokenAccountBalance(lancer_dao_token_account)
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
        })
        .signers([creator]).rpc();  
        console.log("createFFA(Special mint) transaction signature", tx);
    
        // transfer 2 WSOL
        let amount = 2 * LAMPORTS_PER_SOL;
        // Add funds to FFA token account(FundFeature)
        let fund_feature_ix = await fundFeatureInstruction(
          amount,
          timestamp,
          creator.publicKey,
          special_mint,
          program
        );

        tx = await provider.sendAndConfirm(new Transaction().add(fund_feature_ix), [creator]);
        console.log("fundFeature transaction signature", tx);

        // add pubkey to list of accepted submitters(AddApprovedSubmitters)
        const submitter1 = await createKeypair(provider);
    
          const submitter1_wsol_account = await getOrCreateAssociatedTokenAccount(
            provider.connection,
            submitter1,
            special_mint,
            submitter1.publicKey
        );
          let addApproveSubmitterIx = await addApprovedSubmittersInstruction(
            timestamp,
            creator.publicKey,
            submitter1.publicKey,
            program
          )
          
          tx = await provider.sendAndConfirm(new Transaction().add(addApproveSubmitterIx), [creator]); 
          console.log("addApproveSubmitters tx sig ", tx)

          // test approve request fails if there is no submitted request(ApproveRequest)  
          let info = await provider.connection.getAccountInfo(lancer_dao_token_account);
    
          const [lancer_token_program_authority] = await findLancerProgramAuthority(
            program
          );

          // Check only Admin can call this 
          try {
            await program.methods.adminCloseBounty().accounts(
                {
                    creator: creator.publicKey,
                    creatorTokenAccount: creator_special_mint_account.address,
                    featureDataAccount: feature_data_account,
                    featureTokenAccount: feature_token_account,
                    lancerAdmin: creator.publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID
                }
            ).signers([creator]).rpc();
          } catch (err) {
              assert.equal((err as AnchorError).error.errorMessage,"You are not the Admin")
          }

          const admin_close_bounty_ix = await adminCloseBountyInstruction(
            timestamp,
            creator.publicKey,
            creator_special_mint_account.address,
            special_mint,
            program
          );

          let creator_token_account_before_balance = await provider.connection.getTokenAccountBalance(creator_special_mint_account.address);

          tx = await provider.sendAndConfirm(new Transaction().add(admin_close_bounty_ix), []);
          console.log("Admin closed Bounty Tx = ", tx);

          const creator_token_account_after_balance = await provider.connection.getTokenAccountBalance(creator_special_mint_account.address)
          assert.equal(
          creator_token_account_after_balance.value.amount, 
          (
              ((LANCER_FEE + COMPLETER_FEE) * amount) + parseInt(creator_token_account_before_balance.value.amount)
          ).toString()
          );
          let closed_token_account = await provider.connection.getBalance(feature_token_account);
          let closed_data_account = await provider.connection.getBalance(feature_data_account);
  
          assert.equal(0, parseInt(closed_data_account.toString()));
          assert.equal(0, parseInt(closed_token_account.toString()));
  
      })

      it ("Admin cannot close spam Bounties If submitter is present or pending submission",async () => {
        let creator = await createKeypair(provider);
        let funder = provider.publicKey;
        let mint_authority = await createKeypair(provider);

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
        let lancer_token_account_before_bounty = await provider.connection.getTokenAccountBalance(lancer_dao_token_account)
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
        })
        .signers([creator]).rpc();  
        console.log("createFFA(Special mint) transaction signature", tx);
    
        // transfer 2 WSOL
        let amount = 2 * LAMPORTS_PER_SOL;
        // Add funds to FFA token account(FundFeature)
        let fund_feature_ix = await fundFeatureInstruction(
          amount,
          timestamp,
          creator.publicKey,
          special_mint,
          program
        );

        tx = await provider.sendAndConfirm(new Transaction().add(fund_feature_ix), [creator]);
        console.log("fundFeature transaction signature", tx);

        // add pubkey to list of accepted submitters(AddApprovedSubmitters)
        const submitter1 = await createKeypair(provider);
    
          const submitter1_wsol_account = await getOrCreateAssociatedTokenAccount(
            provider.connection,
            submitter1,
            special_mint,
            submitter1.publicKey
        );
          let addApproveSubmitterIx = await addApprovedSubmittersInstruction(
            timestamp,
            creator.publicKey,
            submitter1.publicKey,
            program
          )
          
          tx = await provider.sendAndConfirm(new Transaction().add(addApproveSubmitterIx), [creator]); 
          console.log("addApproveSubmitters tx sig ", tx)

          // test approve request fails if there is no submitted request(ApproveRequest)  
          let info = await provider.connection.getAccountInfo(lancer_dao_token_account);
    
          const [lancer_token_program_authority] = await findLancerProgramAuthority(
            program
          );

        const accounts = await provider.connection.getParsedProgramAccounts(
        program.programId, 
        {
            filters: [
            {
                dataSize: 381, // number of bytes
            },
            {
                memcmp: {
                    offset: 8, // number of bytes
                    bytes: creator.publicKey.toBase58(), // base58 encoded string
                },
            },
            ],      
        }
        );

        let acc = await program.account.featureDataAccount.fetch(accounts[0].pubkey);
    

          // Check that Admin cannot close bounty with active submitter
          try {
            const submit_request_ix = await submitRequestInstruction(
                timestamp,
                creator.publicKey,
                submitter1.publicKey,
                submitter1_wsol_account.address,
                program
            );
            const submit_request_tx = await provider.sendAndConfirm(
                new Transaction().add(submit_request_ix),
                [submitter1]
            );
            console.log("submitted Request = ", submit_request_tx);

            await program.methods.adminCloseBounty().accounts(
                {
                    creator: creator.publicKey,
                    creatorTokenAccount: creator_special_mint_account.address,
                    featureDataAccount: feature_data_account,
                    featureTokenAccount: feature_token_account,
                    lancerAdmin: LANCER_ADMIN,
                    tokenProgram: TOKEN_PROGRAM_ID
                }
            ).signers([]).rpc();

          } catch (err) {
              assert.equal((err as AnchorError).error.errorMessage,"Admin Cannot Close Bounty, check if there is a current submitter")
          }

        // remove current submitter and reset *request_submitted* 
        let deny_request_ix  = await denyRequestInstruction(
            timestamp,
            creator.publicKey,
            submitter1.publicKey,
            program
        );
        let deny_request_tx = await provider.sendAndConfirm(
            new Transaction().add(deny_request_ix),
            [creator]
        );
        console.log("denied Request = ", deny_request_tx);
        

          // Check that Admin cannot close Bounty when there is a pending Request
        const submit_request_ix = await submitRequestInstruction(
            timestamp,
            creator.publicKey,
            submitter1.publicKey,
            submitter1_wsol_account.address,
            program
        );

        try {
            const submit_request_ix = await submitRequestInstruction(
                timestamp,
                creator.publicKey,
                submitter1.publicKey,
                submitter1_wsol_account.address,
                program
            );
            const submit_request_tx = await provider.sendAndConfirm(
                new Transaction().add(submit_request_ix),
                [submitter1]
            );
            console.log("submitted Request = ", submit_request_tx);

            const remove_current_submitter_ix = await removeApprovedSubmittersInstruction(
                timestamp,
                creator.publicKey,
                submitter1.publicKey,
                program
            );

            const remove_current_submitter_tx = await provider.sendAndConfirm(
                new Transaction().add(remove_current_submitter_ix),
                [creator]
            );
            console.log("remove current submitter = ", remove_current_submitter_tx);

            acc = await program.account.featureDataAccount.fetch(accounts[0].pubkey);

            assert.notEqual(acc.approvedSubmitters[0].toString(), submitter1.publicKey.toString())
            assert.equal(acc.payoutCancel, false);
            assert.equal(acc.requestSubmitted, true);// This is what causes it to fail

        await program.methods.adminCloseBounty().accounts(
            {
                creator: creator.publicKey,
                creatorTokenAccount: creator_special_mint_account.address,
                featureDataAccount: feature_data_account,
                featureTokenAccount: feature_token_account,
                lancerAdmin: LANCER_ADMIN,
                tokenProgram: TOKEN_PROGRAM_ID
            }
        ).signers([]).rpc();


        } catch (err) {
            assert.equal((err as AnchorError).error.errorMessage,"Admin Cannot Close Bounty, check if there is a current submitter")
        }

        // remove current submitter and reset *request_submitted* 
        deny_request_ix  = await denyRequestInstruction(
            timestamp,
            creator.publicKey,
            submitter1.publicKey,
            program
        );
        deny_request_tx = await provider.sendAndConfirm(
            new Transaction().add(deny_request_ix),
            [creator]
        );
        console.log("denied Request = ", deny_request_tx);

        // Check that Vote to Cancel cannot be called if submitter is no longer valid(this should not be here but was surprisingly found when testing so add to TODO list)
        try {

            await program.methods.voteToCancel(true).accounts({
                creator: creator.publicKey,
                voter: submitter1.publicKey,
                featureDataAccount: feature_data_account
            }).signers([submitter1]).rpc();


        } catch (err) {
            assert.equal((err as AnchorError).error.errorMessage, "Only Creator or Current Submitter can vote to cancel")
        }

        // add submitter
        tx = await provider.sendAndConfirm(
            new Transaction()
                .add(addApproveSubmitterIx),
            [creator]
        );
        console.log("adding submitter again tx ", tx);

        // submit Request
        tx = await provider.sendAndConfirm(
            new Transaction()
                .add(submit_request_ix),
            [submitter1]
        );
        console.log("submitting Request tx ", tx);

        // vote to cancel(this removes current_submitter and request_submitted but voteToCancel remains active indicating this contract might be useful)
        const vote_to_cancel_ix = await voteToCancelInstruction(
            timestamp,
            creator.publicKey,
            submitter1.publicKey,
            true,
            program
        );
        tx = await provider.sendAndConfirm(
            new Transaction()
                .add(vote_to_cancel_ix),
            [submitter1]
        );
        console.log("submitter votes to cancel tx ", tx);
//--------------------------
        try {
            await program.methods.adminCloseBounty().accounts(
            {
                creator: creator.publicKey,
                creatorTokenAccount: creator_special_mint_account.address,
                featureDataAccount: feature_data_account,
                featureTokenAccount: feature_token_account,
                lancerAdmin: LANCER_ADMIN,
                tokenProgram: TOKEN_PROGRAM_ID
            }
        ).signers([]).rpc();

        } catch (err) {
            assert.equal((err as AnchorError).error.errorMessage, "Admin Cannot Close Bounty, check if there is a current submitter")
        }
        {
            // submit Request
            tx = await provider.sendAndConfirm(
                new Transaction()
                    .add(submit_request_ix),
                [submitter1]
            );
            console.log("submitting Request tx ", tx);

            // vote to cancel(setting it back to false(which is default))
            const vote_to_cancel_ix = await voteToCancelInstruction(
                timestamp,
                creator.publicKey,
                submitter1.publicKey,
                false,
                program
            );
            tx = await provider.sendAndConfirm(
                new Transaction()
                    .add(vote_to_cancel_ix),
                [submitter1]
            );
            console.log("submitter votes false to cancel tx ", tx);
        }        
        
        // Remove submitter or deny Request
        deny_request_tx = await provider.sendAndConfirm(
            new Transaction().add(deny_request_ix),
            [creator]
        );
        console.log("denied Request(again) = ", deny_request_tx);

        // contract/bounty becomes inactive here and can now be deleted by admin
        const admin_close_bounty_ix = await adminCloseBountyInstruction(
            timestamp,
            creator.publicKey,
            creator_special_mint_account.address,
            special_mint,
            program
        );

        let creator_token_account_before_balance = await provider.connection.getTokenAccountBalance(creator_special_mint_account.address);

        tx = await provider.sendAndConfirm(new Transaction().add(admin_close_bounty_ix), []);
        console.log("Admin closed Bounty Tx = ", tx);

        const creator_token_account_after_balance = await provider.connection.getTokenAccountBalance(creator_special_mint_account.address)
        assert.equal(
        creator_token_account_after_balance.value.amount, 
        (
            ((LANCER_FEE + COMPLETER_FEE) * amount) + parseInt(creator_token_account_before_balance.value.amount)
        ).toString()
        );
        let closed_token_account = await provider.connection.getBalance(feature_token_account);
        let closed_data_account = await provider.connection.getBalance(feature_data_account);

        assert.equal(0, parseInt(closed_data_account.toString()));
        assert.equal(0, parseInt(closed_token_account.toString()));
  
      })


})