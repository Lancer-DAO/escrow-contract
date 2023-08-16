import * as anchor from "@project-serum/anchor";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
<<<<<<< HEAD
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
//@ts-ignore
import { MonoProgram } from "../../target/types/mono_program";
//@ts-ignore
import idl from "../../target/idl/mono_program";
import { Client } from "@ladderlabs/buddy-sdk";
import { getAccount } from "@solana/spl-token";
import adminKey from "./admin.json";

async function resizeAccounts() {
  const connection = new Connection(
    "https://winter-necessary-smoke.solana-mainnet.discover.quiknode.pro", //todo RPC
    "confirmed"
  );

  //Todo get admin key
  const admin = Keypair.fromSecretKey(Uint8Array.from(adminKey));

  // const admin = Keypair.fromSecretKey(Uint8Array.from([]));

  const CONTRACT_ADDRESS = "LNCRQTZfeLMFHsSggvVc9kQWb1A98PEqHxVzBraWpQs"; //TODO lancer contract address

  anchor.setProvider(
    new anchor.AnchorProvider(
      connection,
      new NodeWallet(admin),
      anchor.AnchorProvider.defaultOptions()
    )
  );
  anchor.setProvider(
    new anchor.AnchorProvider(
      connection,
      new NodeWallet(new Keypair()),
      anchor.AnchorProvider.defaultOptions()
    )
  );

  const program = new anchor.Program<MonoProgram>(idl, CONTRACT_ADDRESS);

  const referralAccounts = await program.account.referralDataAccount.all();

  for (const referralAccount of referralAccounts) {
    const tx = new Transaction();
    console.log(referralAccounts.length);

    tx.add(
      await program.methods
        .resizeReferralAccount()
        .accounts({
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          lancerAdmin: admin.publicKey,
          referralDataAccount: referralAccount.publicKey,
        })
        .instruction()
    );

    await program.provider.sendAndConfirm(tx, [admin]);
  }
  // for (const referralAccount of referralAccounts) {
  //     const tx = new Transaction();
  //
  //     tx.add(
  //         await program.methods
  //             .resizeReferralAccount()
  //             .accounts({
  //                 systemProgram: anchor.web3.SystemProgram.programId,
  //                 rent: anchor.web3.SYSVAR_RENT_PUBKEY,
  //                 lancerAdmin: admin.publicKey,
  //                 referralDataAccount: referralAccount.publicKey,
  //             })
  //             .instruction()
  //     );
  //
  //     await program.provider.sendAndConfirm(tx, [admin]);
  // }
}

// resizeAccounts();
// resizeAccounts();

async function setMemberReferrer() {
  const connection = new Connection(
    "https://winter-necessary-smoke.solana-mainnet.discover.quiknode.pro", //todo RPC
    "confirmed"
  );

  //Todo get admin key
  const admin = Keypair.fromSecretKey(Uint8Array.from(adminKey));

  const CONTRACT_ADDRESS = "LNCRQTZfeLMFHsSggvVc9kQWb1A98PEqHxVzBraWpQs"; //TODO lancer contract address

  anchor.setProvider(
    new anchor.AnchorProvider(
      connection,
      new NodeWallet(admin),
      anchor.AnchorProvider.defaultOptions()
    )
  );

  const program = new anchor.Program<MonoProgram>(idl, CONTRACT_ADDRESS);

  const referralAccounts = await program.account.referralDataAccount.all();

  for (const referralAccount of referralAccounts) {
    const tx = new Transaction();

    tx.add(
      await program.methods
        .addReferrerMember([])
        .accounts({
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          lancerAdmin: admin.publicKey,
          referralDataAccount: referralAccount.publicKey,
        })
        .instruction()
    );
    tx.add(
      await program.methods
        .addReferrerMember([])
        .accounts({
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          lancerAdmin: admin.publicKey,
          referralDataAccount: referralAccount.publicKey,
        })
        .instruction()
    );

    await program.provider.sendAndConfirm(tx, [admin]);
  }
}

//todo uncomment when ready (do it after when v2 referral accounts are there)
setMemberReferrer();
=======
import {Connection, Keypair, PublicKey, Transaction} from "@solana/web3.js";
//@ts-ignore
import {MonoProgram} from "../../target/types/mono_program";
//@ts-ignore
import idl from "../../target/idl/mono_program";
import {Client} from "@ladderlabs/buddy-sdk"
import {getAccount} from "@solana/spl-token";


async function resizeAccounts() {
    const connection = new Connection(
        "https://wandering-divine-dream.solana-mainnet.quiknode.pro/e4ff6afb31ec8f31d05d2f2c4231ea6c3b4f3af4/", //todo RPC
        "confirmed"
    );


    // const admin = Keypair.fromSecretKey(Uint8Array.from([]));

    const CONTRACT_ADDRESS = "LNCRQTZfeLMFHsSggvVc9kQWb1A98PEqHxVzBraWpQs"; //TODO lancer contract address

    anchor.setProvider(
        new anchor.AnchorProvider(
            connection,
            new NodeWallet(new Keypair()),
            anchor.AnchorProvider.defaultOptions()
        )
    );

    const program = new anchor.Program<MonoProgram>(idl, CONTRACT_ADDRESS);

    const referralAccounts = await program.account.referralDataAccount.all();

    console.log(referralAccounts.length)

    // for (const referralAccount of referralAccounts) {
    //     const tx = new Transaction();
    //
    //     tx.add(
    //         await program.methods
    //             .resizeReferralAccount()
    //             .accounts({
    //                 systemProgram: anchor.web3.SystemProgram.programId,
    //                 rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    //                 lancerAdmin: admin.publicKey,
    //                 referralDataAccount: referralAccount.publicKey,
    //             })
    //             .instruction()
    //     );
    //
    //     await program.provider.sendAndConfirm(tx, [admin]);
    // }
}

// resizeAccounts();

async function setMemberReferrer() {
    const connection = new Connection(
        "", //todo RPC
        "confirmed"
    );

    //Todo get admin key
    const admin = Keypair.fromSecretKey(Uint8Array.from([]));

    const CONTRACT_ADDRESS = ""; //TODO lancer contract address

    anchor.setProvider(
        new anchor.AnchorProvider(
            connection,
            new NodeWallet(admin),
            anchor.AnchorProvider.defaultOptions()
        )
    );

    const program = new anchor.Program<MonoProgram>(idl, CONTRACT_ADDRESS);

    const referralAccounts = await program.account.referralDataAccount.all();

    for (const referralAccount of referralAccounts) {
        const tx = new Transaction();

        tx.add(
            await program.methods
                .addReferrerMember([])
                .accounts({
                    systemProgram: anchor.web3.SystemProgram.programId,
                    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                    lancerAdmin: admin.publicKey,
                    referralDataAccount: referralAccount.publicKey,
                })
                .instruction()
        );

        await program.provider.sendAndConfirm(tx, [admin]);
    }
}

setMemberReferrer();
>>>>>>> e29ebc383b0ebffdca57b8a178621f8d0b5c7b17
