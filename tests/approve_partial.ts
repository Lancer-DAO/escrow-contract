import * as anchor from "@project-serum/anchor";
import { AnchorError, Program } from "@project-serum/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID, createAccount, createInitializeAccount3Instruction, createMint, createSyncNativeInstruction, getAccount, getMint, getOrCreateAssociatedTokenAccount, mintToChecked, NATIVE_MINT, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import  MonoProgramJSON  from "../sdk/idl/mono_program.json";
import { COMPLETER_FEE, LANCER_FEE, MINT_DECIMALS, MONO_DEVNET, WSOL_ADDRESS } from "../sdk/constants";
import { ComputeBudgetInstruction, ComputeBudgetProgram, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import { add_more_token, createKeypair } from "./utils";
import { findFeatureAccount, findFeatureTokenAccount, findLancerCompanyTokens, findLancerCompleterTokens, findLancerProgramAuthority, findLancerTokenAccount, findProgramAuthority, findProgramMintAuthority, findReferralDataAccount } from "../sdk/pda";
import { addApprovedSubmittersInstruction, addApprovedSubmittersV1Instruction, approveRequestInstruction, approveRequestMultipleTransaction, approveRequestPartialInstruction, cancelFeatureInstruction, createFeatureFundingAccountInstruction, createLancerTokenAccountInstruction, createReferralDataAccountInstruction, denyRequestInstruction, enableMultipleSubmittersInstruction, fundFeatureInstruction, removeApprovedSubmittersInstruction, removeApprovedSubmittersV1Instruction, setShareMultipleSubmittersInstruction, submitRequestInstruction, submitRequestMultipleInstruction, voteToCancelInstruction, withdrawTokensInstruction } from "../sdk/instructions";
import { assert } from "chai";
import { min } from "bn.js";
import { MonoProgram } from "../sdk/types/mono_program";

describe("approve partial tests", () => {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());
    const provider =  anchor.getProvider() as anchor.AnchorProvider;
  
    const program = new Program<MonoProgram>(
          MonoProgramJSON as unknown as MonoProgram, 
          new PublicKey(MONO_DEVNET), 
          provider
      );
      const WSOL_AMOUNT = 2 * LAMPORTS_PER_SOL;

    it ("test approveRequestPartial works ", async () => {
        let creator = await createKeypair(provider);
            
        const creator_wsol_account = await getOrCreateAssociatedTokenAccount(
            provider.connection,
            creator,
            WSOL_ADDRESS,
            creator.publicKey
        );
        await add_more_token(provider, creator_wsol_account.address, WSOL_AMOUNT);

        const create_FFA_ix = await createFeatureFundingAccountInstruction(
          WSOL_ADDRESS,
          creator.publicKey,
          program
        );
        let tx = await provider.sendAndConfirm(new Transaction().add(create_FFA_ix), [creator]);
        console.log("createFFA(2nd test) transaction signature", tx);
    
        // transfer 2 WSOL
        let amount = 2 * LAMPORTS_PER_SOL;
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

        // Add funds to FFA token account(FundFeature)
        let fund_feature_ix = await fundFeatureInstruction(
          amount,
          acc.unixTimestamp,
          creator.publicKey,
          WSOL_ADDRESS,
          program
        );
        await add_more_token(provider, creator_wsol_account.address, WSOL_AMOUNT / 5);
    
          tx = await provider.sendAndConfirm(new Transaction().add(fund_feature_ix), [creator]);
          console.log("fundFeature transaction signature", tx);
    
          // add pubkey to list of accepted submitters(AddApprovedSubmitters)
          const submitter1 = await createKeypair(provider);
    
          const submitter1_wsol_account = await getOrCreateAssociatedTokenAccount(
            provider.connection,
            submitter1,
            WSOL_ADDRESS,
            submitter1.publicKey
        );
          let addApproveSubmitterIx = await addApprovedSubmittersInstruction(
            acc.unixTimestamp,
            creator.publicKey,
            submitter1.publicKey,
            program
          )
          
          tx = await provider.sendAndConfirm(new Transaction().add(addApproveSubmitterIx), [creator]); 
          console.log("addApproveSubmitters tx sig ", tx)

          // test approve request fails if there is no submitted request(ApproveRequest)  
          let [feature_data_account] = await findFeatureAccount(
            acc.unixTimestamp,
            creator.publicKey,
            program
          );    
          let [feature_token_account] = await findFeatureTokenAccount(
            acc.unixTimestamp,
            creator.publicKey,
            WSOL_ADDRESS,
            program
          );
          let [program_authority] = await findProgramAuthority(program);
      
          const [lancer_dao_token_account] = await findLancerTokenAccount(
            WSOL_ADDRESS,
            program
          );
          let info = await provider.connection.getAccountInfo(lancer_dao_token_account);
    
          const [lancer_token_program_authority] = await findLancerProgramAuthority(
            program
          );

          try{
            let approveRequestIx = await program.methods.approveRequest()
            .accounts({
              creator: creator.publicKey,
              submitter: submitter1.publicKey,
              payoutAccount: submitter1_wsol_account.address,
              featureDataAccount: feature_data_account,
              featureTokenAccount: feature_token_account,
              programAuthority: program_authority,
              lancerTokenProgramAuthority: lancer_token_program_authority,
              lancerDaoTokenAccount: lancer_dao_token_account,
              tokenProgram: TOKEN_PROGRAM_ID,
            }).signers([creator]).rpc();
          }catch(err){
            // console.log("err: ", err);
            assert.equal((err as AnchorError).error.errorMessage, "No Request Submitted yet")
          }
          // submit request for merging(SubmitRequest)
          const submitRequestIx = await submitRequestInstruction(
            acc.unixTimestamp, 
            creator.publicKey, 
            submitter1.publicKey,
            submitter1_wsol_account.address,
            program
        )
        acc = await program.account.featureDataAccount.fetch(accounts[0].pubkey);
        tx = await provider.sendAndConfirm(new Transaction().add(submitRequestIx), [submitter1])
        console.log("submitRequest tx sig ", tx)

        // approve request(merge and send funds)(ApproveRequest)
          const submitter_token_account_before_balance = await provider.connection.getTokenAccountBalance(submitter1_wsol_account.address)
          const lancer_token_account_before_balance = await provider.connection.getTokenAccountBalance(lancer_dao_token_account)
          acc = await program.account.featureDataAccount.fetch(accounts[0].pubkey);

          try {
            await program.methods.approveRequestPartial(new anchor.BN(amount))
                .accounts({
                    creator: creator.publicKey,
                    submitter: submitter1.publicKey,
                    payoutAccount: submitter1_wsol_account.address,
                    featureDataAccount: feature_data_account,
                    featureTokenAccount: feature_token_account,
                    programAuthority: program_authority,
                    lancerDaoTokenAccount: lancer_dao_token_account,
                    lancerTokenProgramAuthority: lancer_token_program_authority,
                    tokenProgram: TOKEN_PROGRAM_ID,
                }).signers([creator]).rpc()
          } catch (err) {
            assert.equal((err as AnchorError).error.errorMessage, "Cannot withdraw full funds.")
          }

          acc = await program.account.featureDataAccount.fetch(feature_data_account);

          assert.equal(acc.approvedSubmitters[0].toString(), submitter1.publicKey.toString())
          assert.equal(acc.approvedSubmitters[1].toString(), PublicKey.default.toString())
          assert.equal(acc.approvedSubmitters[2].toString(), PublicKey.default.toString())
          assert.equal(acc.approvedSubmitters[3].toString(), PublicKey.default.toString())
          assert.equal(acc.approvedSubmitters[4].toString(), PublicKey.default.toString())

          let approveRequestPartialIx = await approveRequestPartialInstruction(
            acc.unixTimestamp,
            creator.publicKey,
            submitter1.publicKey,
            submitter1_wsol_account.address,
            WSOL_ADDRESS,
            amount / 2,
            program
          );
          tx = await provider.sendAndConfirm(new Transaction().add(approveRequestPartialIx), [creator])
          console.log("approve Request Partial tx = ", tx);

          const submitter_token_account_after_balance = await provider.connection.getTokenAccountBalance(submitter1_wsol_account.address)
            const lancer_token_account_after_balance = await provider.connection.getTokenAccountBalance(lancer_dao_token_account)

            assert.equal(
              submitter_token_account_after_balance.value.amount, 
              (// submitter gets 95% of bounty amount
                (COMPLETER_FEE * amount / 2) + parseInt(submitter_token_account_before_balance.value.amount)
              ).toString()
            );
            assert.equal(
              lancer_token_account_after_balance.value.amount,
              (// 5% from both sides
                (LANCER_FEE / 2 * amount / 2) + parseInt(lancer_token_account_before_balance.value.amount)
              ).toString()
            )

            acc = await program.account.featureDataAccount.fetch(feature_data_account);

            assert.equal(acc.amount.toNumber(), parseInt(amount.toString()) / 2)
            assert.equal(acc.approvedSubmitters[0].toString(), PublicKey.default.toString())
            assert.equal(acc.approvedSubmitters[1].toString(), PublicKey.default.toString())
            assert.equal(acc.approvedSubmitters[2].toString(), PublicKey.default.toString())
            assert.equal(acc.approvedSubmitters[3].toString(), PublicKey.default.toString())
            assert.equal(acc.approvedSubmitters[4].toString(), PublicKey.default.toString())

    })


    it ("test approveRequestPartial works multiple times and is closed by approveRequest(single submitter)", async () => {
      let creator = await createKeypair(provider);

      const creator_wsol_account = await getOrCreateAssociatedTokenAccount(
          provider.connection,
          creator,
          WSOL_ADDRESS,
          creator.publicKey
      );
      await add_more_token(provider, creator_wsol_account.address, WSOL_AMOUNT);

      const [lancer_dao_token_account] = await findLancerTokenAccount(
        WSOL_ADDRESS,
        program
      );
      let lancer_token_account_before_bounty = await provider.connection.getTokenAccountBalance(lancer_dao_token_account)

      const create_FFA_ix = await createFeatureFundingAccountInstruction(
        WSOL_ADDRESS,
        creator.publicKey,
        program
      );
      let tx = await provider.sendAndConfirm(new Transaction().add(create_FFA_ix), [creator]);
      console.log("createFFA(2nd test) transaction signature", tx);

      // transfer 2 WSOL
      let amount = 2 * LAMPORTS_PER_SOL;
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

      // Add funds to FFA token account(FundFeature)
      let fund_feature_ix = await fundFeatureInstruction(
        amount,
        acc.unixTimestamp,
        creator.publicKey,
        WSOL_ADDRESS,
        program
      );
      await add_more_token(provider, creator_wsol_account.address, WSOL_AMOUNT / 5);

        tx = await provider.sendAndConfirm(new Transaction().add(fund_feature_ix), [creator]);
        console.log("fundFeature transaction signature", tx);

        // add pubkey to list of accepted submitters(AddApprovedSubmitters)
        const submitter1 = await createKeypair(provider);

        const submitter1_wsol_account = await getOrCreateAssociatedTokenAccount(
          provider.connection,
          submitter1,
          WSOL_ADDRESS,
          submitter1.publicKey
      );
        let addApproveSubmitterIx = await addApprovedSubmittersInstruction(
          acc.unixTimestamp,
          creator.publicKey,
          submitter1.publicKey,
          program
        )

        tx = await provider.sendAndConfirm(new Transaction().add(addApproveSubmitterIx), [creator]); 
        console.log("addApproveSubmitters tx sig ", tx)

        // test approve request fails if there is no submitted request(ApproveRequest)  
        let [feature_data_account] = await findFeatureAccount(
          acc.unixTimestamp,
          creator.publicKey,
          program
        );    
        let [feature_token_account] = await findFeatureTokenAccount(
          acc.unixTimestamp,
          creator.publicKey,
          WSOL_ADDRESS,
          program
        );
        let [program_authority] = await findProgramAuthority(program);
    
        let info = await provider.connection.getAccountInfo(lancer_dao_token_account);
  
        const [lancer_token_program_authority] = await findLancerProgramAuthority(
          program
        );

        try{
          await program.methods.approveRequest()
          .accounts({
            creator: creator.publicKey,
            submitter: submitter1.publicKey,
            payoutAccount: submitter1_wsol_account.address,
            featureDataAccount: feature_data_account,
            featureTokenAccount: feature_token_account,
            programAuthority: program_authority,
            lancerTokenProgramAuthority: lancer_token_program_authority,
            lancerDaoTokenAccount: lancer_dao_token_account,
            tokenProgram: TOKEN_PROGRAM_ID,
          }).signers([creator]).rpc();
        }catch(err){
          // console.log("err: ", err);
          assert.equal((err as AnchorError).error.errorMessage, "No Request Submitted yet")
        }
        // submit request for merging(SubmitRequest)
        const submitRequestIx = await submitRequestInstruction(
          acc.unixTimestamp, 
          creator.publicKey, 
          submitter1.publicKey,
          submitter1_wsol_account.address,
          program
      )
      acc = await program.account.featureDataAccount.fetch(accounts[0].pubkey);
      tx = await provider.sendAndConfirm(new Transaction().add(submitRequestIx), [submitter1])
      console.log("submitRequest tx sig ", tx)

      // approve request(merge and send funds)(ApproveRequest)
        let submitter_token_account_before_balance = await provider.connection.getTokenAccountBalance(submitter1_wsol_account.address)
        let lancer_token_account_before_balance = await provider.connection.getTokenAccountBalance(lancer_dao_token_account)
        acc = await program.account.featureDataAccount.fetch(accounts[0].pubkey);

        try {
          await program.methods.approveRequestPartial(new anchor.BN(amount))
              .accounts({
                  creator: creator.publicKey,
                  submitter: submitter1.publicKey,
                  payoutAccount: submitter1_wsol_account.address,
                  featureDataAccount: feature_data_account,
                  featureTokenAccount: feature_token_account,
                  programAuthority: program_authority,
                  lancerDaoTokenAccount: lancer_dao_token_account,
                  lancerTokenProgramAuthority: lancer_token_program_authority,
                  tokenProgram: TOKEN_PROGRAM_ID,
              }).signers([creator]).rpc()
        } catch (err) {
          assert.equal((err as AnchorError).error.errorMessage, "Cannot withdraw full funds.")
        }

        acc = await program.account.featureDataAccount.fetch(feature_data_account);

        assert.equal(acc.approvedSubmitters[0].toString(), submitter1.publicKey.toString())
        assert.equal(acc.approvedSubmitters[1].toString(), PublicKey.default.toString())
        assert.equal(acc.approvedSubmitters[2].toString(), PublicKey.default.toString())
        assert.equal(acc.approvedSubmitters[3].toString(), PublicKey.default.toString())
        assert.equal(acc.approvedSubmitters[4].toString(), PublicKey.default.toString())
        console.log("amount - ", acc.amount.toNumber())

        let partial_amount = amount / 2;
        let approveRequestPartialIx = await approveRequestPartialInstruction(
          acc.unixTimestamp,
          creator.publicKey,
          submitter1.publicKey,
          submitter1_wsol_account.address,
          WSOL_ADDRESS,
          partial_amount,
          program
        );
        tx = await provider.sendAndConfirm(new Transaction().add(approveRequestPartialIx), [creator])
        console.log("approve Request Partial tx = ", tx);

        acc = await program.account.featureDataAccount.fetch(feature_data_account);
        console.log("amount - ", acc.amount.toNumber())

        approveRequestPartialIx = await approveRequestPartialInstruction(
          acc.unixTimestamp,
          creator.publicKey,
          submitter1.publicKey,
          submitter1_wsol_account.address,
          WSOL_ADDRESS,
          partial_amount / 2,
          program
        )
        tx = await provider.sendAndConfirm(new Transaction().add(approveRequestPartialIx), [creator])
        console.log("approve Request Partial tx(2nd) = ", tx);

        let submitter_token_account_after_balance = await provider.connection.getTokenAccountBalance(submitter1_wsol_account.address)
        let lancer_token_account_after_balance = await provider.connection.getTokenAccountBalance(lancer_dao_token_account)

          acc = await program.account.featureDataAccount.fetch(feature_data_account);
          console.log("amount - ", acc.amount.toNumber())
  
          assert.equal(
            submitter_token_account_after_balance.value.amount, 
            (// submitter gets 95% of bounty amount
              (COMPLETER_FEE * (partial_amount + partial_amount / 2)) + parseInt(submitter_token_account_before_balance.value.amount)
            ).toString()
          );
          assert.equal(
            lancer_token_account_after_balance.value.amount,
            (// 5% only from creator of bounty(partial)
              (LANCER_FEE / 2 * (partial_amount + partial_amount / 2)) + parseInt(lancer_token_account_before_balance.value.amount)
            ).toString()
          )

          acc = await program.account.featureDataAccount.fetch(feature_data_account);

          assert.equal(
            acc.amount.toNumber(), 
            parseInt(
              (amount - partial_amount - partial_amount / 2).toString()
            )
          )
          assert.equal(acc.approvedSubmitters[0].toString(), PublicKey.default.toString())
          assert.equal(acc.approvedSubmitters[1].toString(), PublicKey.default.toString())
          assert.equal(acc.approvedSubmitters[2].toString(), PublicKey.default.toString())
          assert.equal(acc.approvedSubmitters[3].toString(), PublicKey.default.toString())
          assert.equal(acc.approvedSubmitters[4].toString(), PublicKey.default.toString())

          let remaining_funds = acc.amount.toNumber();
          try{
            await program.methods.approveRequestPartial(new anchor.BN(acc.amount.toNumber()))
            .accounts({
              creator: creator.publicKey,
              submitter: submitter1.publicKey,
              payoutAccount: submitter1_wsol_account.address,
              featureDataAccount: feature_data_account,
              featureTokenAccount: feature_token_account,
              programAuthority: program_authority,
              lancerTokenProgramAuthority: lancer_token_program_authority,
              lancerDaoTokenAccount: lancer_dao_token_account,
              tokenProgram: TOKEN_PROGRAM_ID,
            }).signers([creator]).rpc();
          }catch(err){
            // console.log("err: ", err);
            assert.equal((err as AnchorError).error.errorMessage, "Cannot withdraw full funds.")
          }

          submitter_token_account_before_balance = await provider.connection.getTokenAccountBalance(submitter1_wsol_account.address)
          lancer_token_account_before_balance = await provider.connection.getTokenAccountBalance(lancer_dao_token_account)

          let approveRequestIx = await approveRequestInstruction(
            acc.unixTimestamp,
            creator.publicKey,
            submitter1.publicKey,
            submitter1_wsol_account.address,
            WSOL_ADDRESS,
            program
          );
          tx = await provider.sendAndConfirm(new Transaction().add(approveRequestIx), [creator])

          submitter_token_account_after_balance = await provider.connection.getTokenAccountBalance(submitter1_wsol_account.address)
          lancer_token_account_after_balance = await provider.connection.getTokenAccountBalance(lancer_dao_token_account)
          let lancer_token_account_after_bounty = await provider.connection.getTokenAccountBalance(lancer_dao_token_account)
  
          assert.equal(
            submitter_token_account_after_balance.value.amount, 
            (// submitter gets 95% of bounty amount
              (COMPLETER_FEE * remaining_funds) + 
              parseInt(submitter_token_account_before_balance.value.amount)
            ).toString()
          );
          assert.equal(
            lancer_token_account_after_bounty.value.amount,
            (// 5% from both sides
              (LANCER_FEE * amount) + parseInt(lancer_token_account_before_bounty.value.amount)
            ).toString()
          )    

          // Check token account and data account are closed
          let closed_token_account = await provider.connection.getBalance(feature_token_account);
          let closed_data_account = await provider.connection.getBalance(feature_data_account);
     
          assert.equal(0, parseInt(closed_data_account.toString()));
          assert.equal(0, parseInt(closed_token_account.toString()));

    })


    it ("fund feature twice, then pay partially", async () => {
      let creator = await createKeypair(provider);
            
      const creator_wsol_account = await getOrCreateAssociatedTokenAccount(
          provider.connection,
          creator,
          WSOL_ADDRESS,
          creator.publicKey
      );
      await add_more_token(provider, creator_wsol_account.address, WSOL_AMOUNT);

      const create_FFA_ix = await createFeatureFundingAccountInstruction(
        WSOL_ADDRESS,
        creator.publicKey,
        program
      );
      let tx = await provider.sendAndConfirm(new Transaction().add(create_FFA_ix), [creator]);
      console.log("createFFA(2nd test) transaction signature", tx);

      // transfer 2 WSOL
      let amount = 2 * LAMPORTS_PER_SOL;
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

      // Add funds to FFA token account(FundFeature)
      let fund_feature_ix1 = await fundFeatureInstruction(
        amount,
        acc.unixTimestamp,
        creator.publicKey,
        WSOL_ADDRESS,
        program
      );
      let fund_feature_ix2 = await fundFeatureInstruction(
        amount,
        acc.unixTimestamp,
        creator.publicKey,
        WSOL_ADDRESS,
        program
      );
      await add_more_token(provider, creator_wsol_account.address, WSOL_AMOUNT);
      await add_more_token(provider, creator_wsol_account.address, WSOL_AMOUNT);

        tx = await provider.sendAndConfirm(
          new Transaction()
            .add(fund_feature_ix1)
            .add(fund_feature_ix2), 
          [creator]
        );
        console.log("fundFeature transaction signature", tx);

        // add pubkey to list of accepted submitters(AddApprovedSubmitters)
        const submitter1 = await createKeypair(provider);
  
        const submitter1_wsol_account = await getOrCreateAssociatedTokenAccount(
          provider.connection,
          submitter1,
          WSOL_ADDRESS,
          submitter1.publicKey
      );
        let addApproveSubmitterIx = await addApprovedSubmittersInstruction(
          acc.unixTimestamp,
          creator.publicKey,
          submitter1.publicKey,
          program
        )
 
        tx = await provider.sendAndConfirm(new Transaction().add(addApproveSubmitterIx), [creator]); 
        console.log("addApproveSubmitters tx sig ", tx)

        // test approve request fails if there is no submitted request(ApproveRequest)  
        let [feature_data_account] = await findFeatureAccount(
          acc.unixTimestamp,
          creator.publicKey,
          program
        );    
        let [feature_token_account] = await findFeatureTokenAccount(
          acc.unixTimestamp,
          creator.publicKey,
          WSOL_ADDRESS,
          program
        );
        let [program_authority] = await findProgramAuthority(program);
    
        const [lancer_dao_token_account] = await findLancerTokenAccount(
          WSOL_ADDRESS,
          program
        );
        let info = await provider.connection.getAccountInfo(lancer_dao_token_account);
  
        const [lancer_token_program_authority] = await findLancerProgramAuthority(
          program
        );
        acc = await program.account.featureDataAccount.fetch(accounts[0].pubkey);

        try{
          let approveRequestIx = await program.methods.approveRequest()
          .accounts({
            creator: creator.publicKey,
            submitter: submitter1.publicKey,
            payoutAccount: submitter1_wsol_account.address,
            featureDataAccount: feature_data_account,
            featureTokenAccount: feature_token_account,
            programAuthority: program_authority,
            lancerTokenProgramAuthority: lancer_token_program_authority,
            lancerDaoTokenAccount: lancer_dao_token_account,
            tokenProgram: TOKEN_PROGRAM_ID,
          }).signers([creator]).rpc();
        }catch(err){
          // console.log("err: ", err);
          assert.equal((err as AnchorError).error.errorMessage, "No Request Submitted yet")
        }
        // submit request for merging(SubmitRequest)
        let submitRequestIx = await submitRequestInstruction(
          acc.unixTimestamp, 
          creator.publicKey, 
          submitter1.publicKey,
          submitter1_wsol_account.address,
          program
      )
      acc = await program.account.featureDataAccount.fetch(accounts[0].pubkey);
      tx = await provider.sendAndConfirm(new Transaction().add(submitRequestIx), [submitter1])
      console.log("submitRequest tx sig ", tx)

      // approve request(merge and send funds)(ApproveRequest)
        const submitter_token_account_before_balance = await provider.connection.getTokenAccountBalance(submitter1_wsol_account.address)
        const lancer_token_account_before_balance = await provider.connection.getTokenAccountBalance(lancer_dao_token_account)
        acc = await program.account.featureDataAccount.fetch(accounts[0].pubkey);

        try {
          await program.methods.approveRequestPartial(new anchor.BN(amount + amount))
              .accounts({
                  creator: creator.publicKey,
                  submitter: submitter1.publicKey,
                  payoutAccount: submitter1_wsol_account.address,
                  featureDataAccount: feature_data_account,
                  featureTokenAccount: feature_token_account,
                  programAuthority: program_authority,
                  lancerDaoTokenAccount: lancer_dao_token_account,
                  lancerTokenProgramAuthority: lancer_token_program_authority,
                  tokenProgram: TOKEN_PROGRAM_ID,
              }).signers([creator]).rpc();
        } catch (err) { 
          assert.equal((err as AnchorError).error.errorMessage, "Cannot withdraw full funds.")
        }

        acc = await program.account.featureDataAccount.fetch(accounts[0].pubkey);

        assert.equal(acc.approvedSubmitters[0].toString(), submitter1.publicKey.toString())
        assert.equal(acc.approvedSubmitters[1].toString(), PublicKey.default.toString())
        assert.equal(acc.approvedSubmitters[2].toString(), PublicKey.default.toString())
        assert.equal(acc.approvedSubmitters[3].toString(), PublicKey.default.toString())
        assert.equal(acc.approvedSubmitters[4].toString(), PublicKey.default.toString())

        let approveRequestPartialIx1 = await approveRequestPartialInstruction(
          acc.unixTimestamp,
          creator.publicKey,
          submitter1.publicKey,
          submitter1_wsol_account.address,
          WSOL_ADDRESS,
          amount / 2,
          program
        );
        let approveRequestPartialIx2 = await approveRequestPartialInstruction(
          acc.unixTimestamp,
          creator.publicKey,
          submitter1.publicKey,
          submitter1_wsol_account.address,
          WSOL_ADDRESS,
          amount,
          program
        );
        tx = await provider.sendAndConfirm(
          new Transaction().add(approveRequestPartialIx1).add(approveRequestPartialIx2), 
          [creator]
        )
        console.log("approve Request Partial tx = ", tx);

        const submitter_token_account_after_balance = await provider.connection.getTokenAccountBalance(submitter1_wsol_account.address)
          const lancer_token_account_after_balance = await provider.connection.getTokenAccountBalance(lancer_dao_token_account)

          assert.equal(
            submitter_token_account_after_balance.value.amount, 
            (// submitter gets 95% of bounty amount
              (COMPLETER_FEE * (amount / 2 + amount)) + parseInt(submitter_token_account_before_balance.value.amount)
            ).toString()
          );
          assert.equal(
            lancer_token_account_after_balance.value.amount,
            (// 5% from both sides
              (LANCER_FEE / 2 * (amount / 2 + amount)) + parseInt(lancer_token_account_before_balance.value.amount)
            ).toString()
          )

          acc = await program.account.featureDataAccount.fetch(feature_data_account);

          assert.equal(acc.amount.toNumber(), parseInt(amount.toString()) / 2)
          assert.equal(acc.approvedSubmitters[0].toString(), PublicKey.default.toString())
          assert.equal(acc.approvedSubmitters[1].toString(), PublicKey.default.toString())
          assert.equal(acc.approvedSubmitters[2].toString(), PublicKey.default.toString())
          assert.equal(acc.approvedSubmitters[3].toString(), PublicKey.default.toString())
          assert.equal(acc.approvedSubmitters[4].toString(), PublicKey.default.toString())

    })


    it ("fund feature, partial pay, add funds, paartial pay, finaly pay", async () => {
      
    })
})