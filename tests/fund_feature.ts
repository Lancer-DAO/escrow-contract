import * as anchor from "@project-serum/anchor";
import { AnchorError, Program } from "@project-serum/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID, createAccount, createInitializeAccount3Instruction, createMint, createSyncNativeInstruction, getAccount, getMint, getOrCreateAssociatedTokenAccount, NATIVE_MINT, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { MonoProgram } from "../sdk/types/mono_program";
import  MonoProgramJSON  from "../sdk/idl/mono_program.json";
import { COMPLETER_FEE, LANCER_FEE, LANCER_FEE_THIRD_PARTY, MINT_DECIMALS, MONO_DEVNET, THIRD_PARTY, WSOL_ADDRESS } from "../sdk/constants";
import { ComputeBudgetInstruction, ComputeBudgetProgram, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import { add_more_token, createKeypair } from "./utils";
import { findFeatureAccount, findFeatureTokenAccount, findLancerCompanyTokens, findLancerCompleterTokens, findLancerProgramAuthority, findLancerTokenAccount, findProgramAuthority, findProgramMintAuthority } from "../sdk/pda";
import { addApprovedSubmittersInstruction, approveRequestInstruction, approveRequestMultipleTransaction, approveRequestThirdPartyInstruction, cancelFeatureInstruction, createFeatureFundingAccountInstruction, createLancerTokenAccountInstruction, createLancerTokensInstruction, denyRequestInstruction, enableMultipleSubmittersInstruction, fundFeatureInstruction, removeApprovedSubmittersInstruction, setShareMultipleSubmittersInstruction, submitRequestInstruction, submitRequestMultipleInstruction, voteToCancelInstruction, withdrawTokensInstruction } from "../sdk/instructions";
import { assert } from "chai";
import { min } from "bn.js";

describe("fund feature tests", () => {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());
    const provider =  anchor.getProvider() as anchor.AnchorProvider;
  
    const program = new Program<MonoProgram>(
          MonoProgramJSON as unknown as MonoProgram, 
          new PublicKey(MONO_DEVNET), 
          provider
      );
      const WSOL_AMOUNT = 2 * LAMPORTS_PER_SOL;

      it ("test fundFeature Works", async () => {
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
        const tx1 = await provider.sendAndConfirm(new Transaction().add(create_FFA_ix), [creator]);
        console.log("createFFA(2nd test) transaction signature", tx1);
    
        // transfer WSOL
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
        const [feature_token_account] = await findFeatureTokenAccount(
          acc.unixTimestamp,
          creator.publicKey,
          WSOL_ADDRESS,
          program
        );
        const [feature_data_account] = await findFeatureAccount(
          acc.unixTimestamp,
          creator.publicKey,
          program
        );
        const [program_authority] = await findProgramAuthority(program);
    
        // test insuffiecient 
        try {
          await program.methods.fundFeature(new anchor.BN(WSOL_AMOUNT))
            .accounts({
              creator: creator.publicKey,
              fundsMint: WSOL_ADDRESS,
              creatorTokenAccount: creator_wsol_account.address,
              featureDataAccount: feature_data_account,
              featureTokenAccount: feature_token_account,
              programAuthority: program_authority,
              tokenProgram: TOKEN_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
            }).signers([creator]).rpc()
        } catch (err) {
          assert.equal((err as AnchorError).error.errorMessage, "Insufficient funds to pay lancer fee")
        }
    
        //add more SOL
        await add_more_token(provider, creator_wsol_account.address, WSOL_AMOUNT * 5 / 100);
    
        // check balaance before funding feature
        const FFA_token_account_before_balance = await provider.connection.getTokenAccountBalance(feature_token_account)
        let fund_feature_ix = await fundFeatureInstruction(
          WSOL_AMOUNT,
          acc.unixTimestamp,
          creator.publicKey,
          WSOL_ADDRESS,
          program
        );
    
          const tx2 = await provider.sendAndConfirm(new Transaction().add(fund_feature_ix), [creator]);
          console.log("fundFeature transaction signature", tx2);
          const FFA_token_account_after_balance = await provider.connection.getTokenAccountBalance(feature_token_account)
          assert.equal(
            FFA_token_account_after_balance.value.amount, 
            (//token account needs to be able to pay both lancer and completer
              ((LANCER_FEE + COMPLETER_FEE) * WSOL_AMOUNT) + parseInt(FFA_token_account_before_balance.value.amount)
            ).toString()
          );
          acc = await program.account.featureDataAccount.fetch(accounts[0].pubkey);
    
          assert.equal(acc.amount.toNumber(), WSOL_AMOUNT)
    
      });
    

})