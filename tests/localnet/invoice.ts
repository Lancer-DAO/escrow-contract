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
import { MonoProgram } from "../../sdk/types/mono_program";
import MonoProgramJSON from "../../sdk/idl/mono_program.json";
import {
  COMPLETER_FEE,
  LANCER_FEE,
  MINT_DECIMALS,
  MONO_DEVNET,
  WSOL_ADDRESS,
} from "../../sdk/constants";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { add_more_token, createKeypair } from "./utils";
import {
  findFeatureAccount,
  findFeatureTokenAccount,
  findLancerProgramAuthority,
  findLancerTokenAccount,
  findProgramAuthority,
} from "../../sdk/pda";
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
} from "../../sdk/instructions";
import { assert, expect } from "chai";

describe("invoice tests", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider() as anchor.AnchorProvider;

  const program = new Program<MonoProgram>(
    MonoProgramJSON as unknown as MonoProgram,
    new PublicKey(MONO_DEVNET),
    provider
  );
  const WSOL_AMOUNT = 2 * LAMPORTS_PER_SOL;

  it("test sending and accepting invoice works(when lancer admin does not accept invoice)", async () => {
    // Add your test here.
    let creator = await createKeypair(provider);
    let new_creator = await createKeypair(provider);
    const creator_wsol_account = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      creator,
      WSOL_ADDRESS,
      creator.publicKey
    );

    const new_creator_wsol_account = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      new_creator,
      WSOL_ADDRESS,
      new_creator.publicKey
    );

    await add_more_token(
      provider,
      new_creator_wsol_account.address,
      WSOL_AMOUNT
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
      WSOL_ADDRESS,
      program
    );
    const [new_feature_data_account, new_feature_data_account_bump] =
      await findFeatureAccount(timestamp, new_creator.publicKey, program);
    const [new_feature_token_account, new_feature_token_account_bump] =
      await findFeatureTokenAccount(
        timestamp,
        new_creator.publicKey,
        WSOL_ADDRESS,
        program
      );
    const [program_authority, program_authority_bump] =
      await findProgramAuthority(program);
    const ix = await program.methods
      .createFeatureFundingAccount(timestamp)
      .accounts({
        creator: creator.publicKey,
        fundsMint: WSOL_ADDRESS,
        featureDataAccount: feature_data_account,
        featureTokenAccount: feature_token_account,
        programAuthority: program_authority,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
        associatedProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .instruction();

    const tx = await provider.sendAndConfirm(new Transaction().add(ix), [
      creator,
    ]);
    console.log("createFFA transaction signature", tx);
    const accounts = await provider.connection.getParsedProgramAccounts(
      program.programId, // new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
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
    let acc = await program.account.featureDataAccount.fetch(
      accounts[0].pubkey
    );
    // Check creator in FFA corresponds to expected creator
    assert.equal(creator.publicKey.toString(), acc.creator.toString());
    assert.equal(acc.isMultipleSubmitters, false);

    const token_account_in_TokenAccount = await getAccount(
      provider.connection,
      acc.fundsTokenAccount
    );
    const token_account_in_Account = await provider.connection.getAccountInfo(
      token_account_in_TokenAccount.address
    );

    // Check FFA token Account is owned by program Authority Account
    assert.equal(
      token_account_in_TokenAccount.owner.toString(),
      program_authority.toString()
    );
    // Check token account mint corresponds with saved funds mint
    assert.equal(
      token_account_in_TokenAccount.mint.toString(),
      acc.fundsMint.toString()
    );
    // Check token account owner is already TOKEN_PROGRAM_ID(already done in getAccount())
    assert.equal(
      token_account_in_Account.owner.toString(),
      TOKEN_PROGRAM_ID.toString()
    );

    let invoice_amount = WSOL_AMOUNT;
    let sendInvoiceIx = await sendInvoiceInstruction(
      timestamp,
      WSOL_AMOUNT,
      creator.publicKey,
      new_creator.publicKey,
      WSOL_ADDRESS,
      program
    );
    await provider.sendAndConfirm(new Transaction().add(sendInvoiceIx), [
      creator,
    ]);

    acc = await program.account.featureDataAccount.fetch(accounts[0].pubkey);

    assert.equal(acc.amount.toNumber(), WSOL_AMOUNT);
    assert.equal(
      acc.payoutAccount.toString(),
      new_creator.publicKey.toString()
    );

    // test for previous creator cannot be new creator
    try {
      await program.methods
        .acceptInvoice()
        .accounts({
          newCreator: creator.publicKey,
          newCreatorTokenAccount: creator_wsol_account.address,
          fundsMint: WSOL_ADDRESS,
          newFeatureDataAccount: new_feature_data_account,
          newFeatureTokenAccount: new_feature_token_account,
          programAuthority: program_authority,
          creator: creator.publicKey,
          featureDataAccount: feature_data_account,
          featureTokenAccount: feature_token_account,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
          associatedProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();
    } catch (err) {
      assert.equal(
        (err as AnchorError).error.errorMessage,
        "A seeds constraint was violated"
      );
    }

    // test lancer fees are paid
    try {
      await program.methods
        .acceptInvoice()
        .accounts({
          newCreator: new_creator.publicKey,
          newCreatorTokenAccount: new_creator_wsol_account.address,
          fundsMint: WSOL_ADDRESS,
          newFeatureDataAccount: new_feature_data_account,
          newFeatureTokenAccount: new_feature_token_account,
          programAuthority: program_authority,
          creator: creator.publicKey,
          featureDataAccount: feature_data_account,
          featureTokenAccount: feature_token_account,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
          associatedProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([new_creator])
        .rpc();
    } catch (err) {
      assert.equal(
        (err as AnchorError).error.errorMessage,
        "Insufficient funds to pay lancer fee"
      );
      // add more funds
      await add_more_token(
        provider,
        new_creator_wsol_account.address,
        WSOL_AMOUNT / 2
      );
    }

    let acceptInvoiceIx = await acceptInvoiceInstruction(
      acc.unixTimestamp,
      creator.publicKey,
      new_creator.publicKey,
      WSOL_ADDRESS,
      program
    );
    const FFA_token_account_before_balance = 0;
    const new_creator_wsol_account_before_balance =
      await provider.connection.getTokenAccountBalance(
        new_creator_wsol_account.address
      );

    await provider.sendAndConfirm(new Transaction().add(acceptInvoiceIx), [
      new_creator,
    ]);
    console.log("accept invoice tx = ", tx);

    const FFA_token_account_after_balance =
      await provider.connection.getTokenAccountBalance(
        new_feature_token_account
      );
    const new_creator_wsol_account_after_balance =
      await provider.connection.getTokenAccountBalance(
        new_creator_wsol_account.address
      );

    assert.equal(
      FFA_token_account_after_balance.value.amount,
      //token account needs to be able to pay both lancer and completer
      (
        (LANCER_FEE + COMPLETER_FEE) * WSOL_AMOUNT +
        parseInt(FFA_token_account_before_balance.toString())
      ).toString()
    );

    assert.equal(
      new_creator_wsol_account_before_balance.value.amount,
      //token account needs to be able to pay both lancer and completer
      (
        (LANCER_FEE + COMPLETER_FEE) * WSOL_AMOUNT +
        parseInt(new_creator_wsol_account_after_balance.value.amount)
      ).toString()
    );

    let closed_token_account = await provider.connection.getBalance(
      feature_token_account
    );
    let closed_data_account = await provider.connection.getBalance(
      feature_data_account
    );

    assert.equal(0, parseInt(closed_data_account.toString()));
    assert.equal(0, parseInt(closed_token_account.toString()));

    acc = await program.account.featureDataAccount.fetch(
      new_feature_data_account
    );
    assert.equal(acc.unixTimestamp.toString(), timestamp.toString());
    assert.equal(acc.noOfSubmitters, 0);
    assert.equal(acc.amount.toNumber(), invoice_amount);
    assert.equal(acc.requestSubmitted, false);
    assert.equal(acc.funderCancel, false);
    assert.equal(acc.payoutCancel, false);
    assert.equal(
      acc.fundsTokenAccount.toString(),
      new_feature_token_account.toString()
    );
    assert.equal(acc.currentSubmitter.toString(), PublicKey.default.toString());
    assert.equal(acc.creator.toString(), new_creator.publicKey.toString());
    assert.equal(acc.fundsMint.toString(), WSOL_ADDRESS.toString());
    assert.equal(acc.payoutAccount.toString(), PublicKey.default.toString());
    assert.equal(acc.isMultipleSubmitters, false);
    assert.equal(acc.fundsDataAccountBump, new_feature_data_account_bump);
    assert.equal(acc.fundsTokenAccountBump, new_feature_token_account_bump);
    assert.equal(acc.programAuthorityBump, program_authority_bump);
  });

  it("test sending and accepting invoice works(when lancer admin does accepts invoice)", async () => {
    // Add your test here.
    let creator = await createKeypair(provider);
    let new_creator = provider.publicKey;
    let mint_authority = await createKeypair(provider);
    const special_mint = await createMint(
      provider.connection,
      mint_authority,
      mint_authority.publicKey,
      mint_authority.publicKey,
      MINT_DECIMALS
    );
    const create_lancer_token_account_ix =
      await createLancerTokenAccountInstruction(special_mint, program);
    await provider.sendAndConfirm(
      new Transaction().add(create_lancer_token_account_ix),
      []
    );

    const creator_special_mint_account =
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        mint_authority,
        special_mint,
        creator.publicKey
      );

    const new_creator_special_mint_account =
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        mint_authority,
        special_mint,
        new_creator
      );

    const special_mint_airdrop = await mintToChecked(
      provider.connection,
      mint_authority,
      special_mint,
      new_creator_special_mint_account.address,
      mint_authority,
      WSOL_AMOUNT / 2,
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
      program
    );
    const [new_feature_data_account, new_feature_data_account_bump] =
      await findFeatureAccount(timestamp, new_creator, program);
    const [new_feature_token_account, new_feature_token_account_bump] =
      await findFeatureTokenAccount(
        timestamp,
        new_creator,
        special_mint,
        program
      );
    const [program_authority, program_authority_bump] =
      await findProgramAuthority(program);
    const ix = await program.methods
      .createFeatureFundingAccount(timestamp)
      .accounts({
        creator: creator.publicKey,
        fundsMint: special_mint,
        featureDataAccount: feature_data_account,
        featureTokenAccount: feature_token_account,
        programAuthority: program_authority,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
        associatedProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .instruction();

    const tx = await provider.sendAndConfirm(new Transaction().add(ix), [
      creator,
    ]);
    console.log("createFFA transaction signature", tx);
    const accounts = await provider.connection.getParsedProgramAccounts(
      program.programId, // new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
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
    let acc = await program.account.featureDataAccount.fetch(
      accounts[0].pubkey
    );
    // Check creator in FFA corresponds to expected creator
    assert.equal(creator.publicKey.toString(), acc.creator.toString());
    assert.equal(acc.isMultipleSubmitters, false);

    const token_account_in_TokenAccount = await getAccount(
      provider.connection,
      acc.fundsTokenAccount
    );
    const token_account_in_Account = await provider.connection.getAccountInfo(
      token_account_in_TokenAccount.address
    );

    // Check FFA token Account is owned by program Authority Account
    assert.equal(
      token_account_in_TokenAccount.owner.toString(),
      program_authority.toString()
    );
    // Check token account mint corresponds with saved funds mint
    assert.equal(
      token_account_in_TokenAccount.mint.toString(),
      acc.fundsMint.toString()
    );
    // Check token account owner is already TOKEN_PROGRAM_ID(already done in getAccount())
    assert.equal(
      token_account_in_Account.owner.toString(),
      TOKEN_PROGRAM_ID.toString()
    );

    let invoice_amount = WSOL_AMOUNT;
    let sendInvoiceIx = await sendInvoiceInstruction(
      timestamp,
      WSOL_AMOUNT,
      creator.publicKey,
      new_creator,
      special_mint,
      program
    );
    await provider.sendAndConfirm(new Transaction().add(sendInvoiceIx), [
      creator,
    ]);

    acc = await program.account.featureDataAccount.fetch(accounts[0].pubkey);

    assert.equal(acc.amount.toNumber(), WSOL_AMOUNT);
    assert.equal(acc.payoutAccount.toString(), new_creator.toString());

    // test for previous creator cannot be new creator
    try {
      await program.methods
        .acceptInvoice()
        .accounts({
          newCreator: creator.publicKey,
          newCreatorTokenAccount: creator_special_mint_account.address,
          fundsMint: special_mint,
          newFeatureDataAccount: new_feature_data_account,
          newFeatureTokenAccount: new_feature_token_account,
          programAuthority: program_authority,
          creator: creator.publicKey,
          featureDataAccount: feature_data_account,
          featureTokenAccount: feature_token_account,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
          associatedProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();
    } catch (err) {
      assert.equal(
        (err as AnchorError).error.errorMessage,
        "A seeds constraint was violated"
      );
    }

    // test lancer fees are paid
    try {
      await program.methods
        .acceptInvoice()
        .accounts({
          newCreator: new_creator,
          newCreatorTokenAccount: new_creator_special_mint_account.address,
          fundsMint: special_mint,
          newFeatureDataAccount: new_feature_data_account,
          newFeatureTokenAccount: new_feature_token_account,
          programAuthority: program_authority,
          creator: creator.publicKey,
          featureDataAccount: feature_data_account,
          featureTokenAccount: feature_token_account,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
          associatedProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([])
        .rpc();
    } catch (err) {
      assert.equal(
        (err as AnchorError).error.errorMessage,
        "Insufficient funds"
      );
      // add more funds
      await mintToChecked(
        provider.connection,
        mint_authority,
        special_mint,
        new_creator_special_mint_account.address,
        mint_authority,
        10 * WSOL_AMOUNT,
        MINT_DECIMALS
      );
    }

    let acceptInvoiceIx = await acceptInvoiceInstruction(
      acc.unixTimestamp,
      creator.publicKey,
      new_creator,
      special_mint,
      program
    );
    const FFA_token_account_before_balance = 0;
    const new_creator_special_mint_account_before_balance =
      await provider.connection.getTokenAccountBalance(
        new_creator_special_mint_account.address
      );

    await provider.sendAndConfirm(new Transaction().add(acceptInvoiceIx), []);
    console.log("accept invoice tx = ", tx);

    const FFA_token_account_after_balance =
      await provider.connection.getTokenAccountBalance(
        new_feature_token_account
      );
    const new_creator_special_mint_account_after_balance =
      await provider.connection.getTokenAccountBalance(
        new_creator_special_mint_account.address
      );

    assert.equal(
      FFA_token_account_after_balance.value.amount,
      //token account needs to be able to pay both lancer and completer
      (
        WSOL_AMOUNT + parseInt(FFA_token_account_before_balance.toString())
      ).toString()
    );

    assert.equal(
      new_creator_special_mint_account_before_balance.value.amount,
      //token account needs to be able to pay both lancer and completer
      (
        WSOL_AMOUNT +
        parseInt(new_creator_special_mint_account_after_balance.value.amount)
      ).toString()
    );

    let closed_token_account = await provider.connection.getBalance(
      feature_token_account
    );
    let closed_data_account = await provider.connection.getBalance(
      feature_data_account
    );

    assert.equal(0, parseInt(closed_data_account.toString()));
    assert.equal(0, parseInt(closed_token_account.toString()));

    acc = await program.account.featureDataAccount.fetch(
      new_feature_data_account
    );
    assert.equal(acc.unixTimestamp.toString(), timestamp.toString());
    assert.equal(acc.noOfSubmitters, 0);
    assert.equal(acc.amount.toNumber(), invoice_amount);
    assert.equal(acc.requestSubmitted, false);
    assert.equal(acc.funderCancel, false);
    assert.equal(acc.payoutCancel, false);
    assert.equal(
      acc.fundsTokenAccount.toString(),
      new_feature_token_account.toString()
    );
    assert.equal(acc.currentSubmitter.toString(), PublicKey.default.toString());
    assert.equal(acc.creator.toString(), new_creator.toString());
    assert.equal(acc.fundsMint.toString(), special_mint.toString());
    assert.equal(acc.payoutAccount.toString(), PublicKey.default.toString());
    assert.equal(acc.isMultipleSubmitters, false);
    assert.equal(acc.fundsDataAccountBump, new_feature_data_account_bump);
    assert.equal(acc.fundsTokenAccountBump, new_feature_token_account_bump);
    assert.equal(acc.programAuthorityBump, program_authority_bump);
  });

  it("testing rejecting invoice", async () => {
    let creator = await createKeypair(provider);
    let spoofer = await createKeypair(provider);
    let new_creator = await createKeypair(provider);
    const creator_wsol_account = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      creator,
      WSOL_ADDRESS,
      creator.publicKey
    );

    const new_creator_wsol_account = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      new_creator,
      WSOL_ADDRESS,
      new_creator.publicKey
    );

    await add_more_token(
      provider,
      new_creator_wsol_account.address,
      WSOL_AMOUNT
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
      WSOL_ADDRESS,
      program
    );
    const [new_feature_data_account, new_feature_data_account_bump] =
      await findFeatureAccount(timestamp, new_creator.publicKey, program);
    const [new_feature_token_account, new_feature_token_account_bump] =
      await findFeatureTokenAccount(
        timestamp,
        new_creator.publicKey,
        WSOL_ADDRESS,
        program
      );
    const [program_authority, program_authority_bump] =
      await findProgramAuthority(program);
    const ix = await program.methods
      .createFeatureFundingAccount(timestamp)
      .accounts({
        creator: creator.publicKey,
        fundsMint: WSOL_ADDRESS,
        featureDataAccount: feature_data_account,
        featureTokenAccount: feature_token_account,
        programAuthority: program_authority,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
        associatedProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .instruction();

    const tx = await provider.sendAndConfirm(new Transaction().add(ix), [
      creator,
    ]);
    console.log("createFFA transaction signature", tx);
    const accounts = await provider.connection.getParsedProgramAccounts(
      program.programId, // new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
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
    let acc = await program.account.featureDataAccount.fetch(
      accounts[0].pubkey
    );
    // Check creator in FFA corresponds to expected creator
    assert.equal(creator.publicKey.toString(), acc.creator.toString());
    assert.equal(acc.isMultipleSubmitters, false);

    const token_account_in_TokenAccount = await getAccount(
      provider.connection,
      acc.fundsTokenAccount
    );
    const token_account_in_Account = await provider.connection.getAccountInfo(
      token_account_in_TokenAccount.address
    );

    // Check FFA token Account is owned by program Authority Account
    assert.equal(
      token_account_in_TokenAccount.owner.toString(),
      program_authority.toString()
    );
    // Check token account mint corresponds with saved funds mint
    assert.equal(
      token_account_in_TokenAccount.mint.toString(),
      acc.fundsMint.toString()
    );
    // Check token account owner is already TOKEN_PROGRAM_ID(already done in getAccount())
    assert.equal(
      token_account_in_Account.owner.toString(),
      TOKEN_PROGRAM_ID.toString()
    );

    let invoice_amount = WSOL_AMOUNT;
    let sendInvoiceIx = await sendInvoiceInstruction(
      timestamp,
      WSOL_AMOUNT,
      creator.publicKey,
      new_creator.publicKey,
      WSOL_ADDRESS,
      program
    );
    await provider.sendAndConfirm(new Transaction().add(sendInvoiceIx), [
      creator,
    ]);

    acc = await program.account.featureDataAccount.fetch(accounts[0].pubkey);

    try {
      await program.methods
        .rejectInvoice()
        .accounts({
          invoiceAcceptor: spoofer.publicKey,
          creator: creator.publicKey,
          fundsMint: WSOL_ADDRESS,
          featureDataAccount: feature_data_account,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([spoofer])
        .rpc();
    } catch (err) {
      assert.equal(
        (err as AnchorError).error.errorMessage,
        "You do not have permissions to submit"
      );
    }

    let rejectInvoiceIx = await rejectInvoiceInstruction(
      acc.unixTimestamp,
      creator.publicKey,
      new_creator.publicKey,
      WSOL_ADDRESS,
      program
    );

    await provider.sendAndConfirm(new Transaction().add(rejectInvoiceIx), [
      new_creator,
    ]);
    acc = await program.account.featureDataAccount.fetch(accounts[0].pubkey);

    assert.equal(acc.payoutAccount.toString(), PublicKey.default.toString());
    assert.equal(acc.amount.toNumber(), invoice_amount);
    //send invoice to another account with lesser amount
    let another_invoice_acceptor = await createKeypair(provider);
    let new_invoice_amount = invoice_amount / 4;

    sendInvoiceIx = await sendInvoiceInstruction(
      timestamp,
      new_invoice_amount,
      creator.publicKey,
      another_invoice_acceptor.publicKey,
      WSOL_ADDRESS,
      program
    );
    await provider.sendAndConfirm(new Transaction().add(sendInvoiceIx), [
      creator,
    ]);

    acc = await program.account.featureDataAccount.fetch(accounts[0].pubkey);

    assert.equal(acc.amount.toNumber(), new_invoice_amount);
    assert.equal(
      acc.payoutAccount.toString(),
      another_invoice_acceptor.publicKey.toString()
    );
  });

  it("sending invoice, rejecting and close invoice", async () => {
    let creator = await createKeypair(provider);
    let spoofer = await createKeypair(provider);
    let new_creator = await createKeypair(provider);
    const creator_wsol_account = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      creator,
      WSOL_ADDRESS,
      creator.publicKey
    );

    const new_creator_wsol_account = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      new_creator,
      WSOL_ADDRESS,
      new_creator.publicKey
    );

    await add_more_token(
      provider,
      new_creator_wsol_account.address,
      WSOL_AMOUNT
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
      WSOL_ADDRESS,
      program
    );
    const [program_authority, program_authority_bump] =
      await findProgramAuthority(program);
    const ix = await program.methods
      .createFeatureFundingAccount(timestamp)
      .accounts({
        creator: creator.publicKey,
        fundsMint: WSOL_ADDRESS,
        featureDataAccount: feature_data_account,
        featureTokenAccount: feature_token_account,
        programAuthority: program_authority,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
        associatedProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .instruction();

    const tx = await provider.sendAndConfirm(new Transaction().add(ix), [
      creator,
    ]);
    console.log("createFFA transaction signature", tx);
    const accounts = await provider.connection.getParsedProgramAccounts(
      program.programId, // new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
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
    let acc = await program.account.featureDataAccount.fetch(
      accounts[0].pubkey
    );
    // Check creator in FFA corresponds to expected creator
    assert.equal(creator.publicKey.toString(), acc.creator.toString());
    assert.equal(acc.isMultipleSubmitters, false);

    const token_account_in_TokenAccount = await getAccount(
      provider.connection,
      acc.fundsTokenAccount
    );
    const token_account_in_Account = await provider.connection.getAccountInfo(
      token_account_in_TokenAccount.address
    );

    // Check FFA token Account is owned by program Authority Account
    assert.equal(
      token_account_in_TokenAccount.owner.toString(),
      program_authority.toString()
    );
    // Check token account mint corresponds with saved funds mint
    assert.equal(
      token_account_in_TokenAccount.mint.toString(),
      acc.fundsMint.toString()
    );
    // Check token account owner is already TOKEN_PROGRAM_ID(already done in getAccount())
    assert.equal(
      token_account_in_Account.owner.toString(),
      TOKEN_PROGRAM_ID.toString()
    );

    let invoice_amount = WSOL_AMOUNT;
    let sendInvoiceIx = await sendInvoiceInstruction(
      timestamp,
      WSOL_AMOUNT,
      creator.publicKey,
      new_creator.publicKey,
      WSOL_ADDRESS,
      program
    );
    await provider.sendAndConfirm(new Transaction().add(sendInvoiceIx), [
      creator,
    ]);

    acc = await program.account.featureDataAccount.fetch(accounts[0].pubkey);

    try {
      await program.methods
        .rejectInvoice()
        .accounts({
          invoiceAcceptor: spoofer.publicKey,
          creator: creator.publicKey,
          fundsMint: WSOL_ADDRESS,
          featureDataAccount: feature_data_account,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([spoofer])
        .rpc();
    } catch (err) {
      assert.equal(
        (err as AnchorError).error.errorMessage,
        "You do not have permissions to submit"
      );
    }

    let rejectInvoiceIx = await rejectInvoiceInstruction(
      acc.unixTimestamp,
      creator.publicKey,
      new_creator.publicKey,
      WSOL_ADDRESS,
      program
    );

    await provider.sendAndConfirm(new Transaction().add(rejectInvoiceIx), [
      new_creator,
    ]);
    acc = await program.account.featureDataAccount.fetch(accounts[0].pubkey);

    assert.equal(acc.payoutAccount.toString(), PublicKey.default.toString());
    assert.equal(acc.amount.toNumber(), invoice_amount);

    let closeInvoiceIx = await closeInvoiceInstruction(
      acc.unixTimestamp,
      creator.publicKey,
      WSOL_ADDRESS,
      program
    );

    await provider.sendAndConfirm(new Transaction().add(closeInvoiceIx), [
      creator,
    ]);

    let closed_token_account = await provider.connection.getBalance(
      feature_token_account
    );
    let closed_data_account = await provider.connection.getBalance(
      feature_data_account
    );

    assert.equal(0, parseInt(closed_data_account.toString()));
    assert.equal(0, parseInt(closed_token_account.toString()));
  });
});
