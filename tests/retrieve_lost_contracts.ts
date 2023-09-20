import * as anchor from "@project-serum/anchor";
import { AnchorError, Program } from "@project-serum/anchor";
import { getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { MonoProgram } from "../sdk/types/mono_program";
import  MonoProgramJSON  from "../sdk/idl/mono_program.json";
import { COMPLETER_FEE, LANCER_FEE, MONO_DEVNET, WSOL_ADDRESS } from "../sdk/constants";
import { ConfirmOptions, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction, clusterApiUrl } from "@solana/web3.js";
import { add_more_token, createKeypair, createKeypairFromFile } from "./utils";
import { findFeatureAccount, findFeatureTokenAccount, findProgramAuthority } from "../sdk/pda";
import { addApprovedSubmittersInstruction, cancelFeatureInstruction, createFeatureFundingAccountInstruction, denyRequestInstruction, fundFeatureInstruction, submitRequestInstruction, voteToCancelInstruction } from "../sdk/instructions";
import { assert } from "chai";
import fs from "fs";
import * as nacl from 'tweetnacl';
import * as bs58 from 'bs58';

const LANCER_MAINNET = "LNCRQTZfeLMFHsSggvVc9kQWb1A98PEqHxVzBraWpQs";
const LANCER_ESCROW_TOKEN_ACCOUNT = "";
const LANCER_BOUNTY_DATA_ACCOUNT = ""
const MAINNET_RPC = ""

// extract private key from phantom
const secret_key_from_phantom = "";
const lancer_keypair = createKeypairFromPathPrivateKey(secret_key_from_phantom);
const MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

function createKeypairFromPathJSON(filepath: string)
{
    const path = require("path");
    const file = fs.readFileSync(path.resolve(__dirname, filepath));
    // let fileTxt = readFileSync("./_users/mint.json", { encoding: 'utf-8' });
    let kepairJson = JSON.parse(file);
    let buffers_8 = Uint8Array.from(kepairJson);
    let token_keypair = anchor.web3.Keypair.fromSecretKey(buffers_8);
 
    return token_keypair;
}

function createKeypairFromPathPrivateKey(key)
{
    let keypair =  Keypair.fromSecretKey(
        bs58.decode(key.toString().trim())
    );
    // console.log("pub = ", keypair.publicKey.toString());
    return keypair;
}

describe("retreive from mainnet", () => {
    let lancer_pubkey = lancer_keypair.publicKey
    // Configure the client to use the local cluster.
    let connection = new Connection(MAINNET_RPC)
    let provider = new anchor.AnchorProvider(connection, new anchor.Wallet(lancer_keypair), {} as ConfirmOptions)

    console.log(" public key  = ", lancer_keypair.publicKey.toString());


    const program = new Program<MonoProgram>(
          MonoProgramJSON as unknown as MonoProgram, 
          new PublicKey(LANCER_MAINNET), 
          provider
      );

    it ("retrieive money from lost bounties ",async () => {
        const [program_authority] = await findProgramAuthority(
            program,
        );

        // Retrieve the Data Account keys here with a better method
        // {
        //         const account_data = await provider.connection.getParsedProgramAccounts(
        //         program.programId, // new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
        //         {
        //         filters: [
        //             {
        //             dataSize: 381, // number of bytes
        //             },
        //             {
        //             memcmp: {
        //                 offset: 8, // number of bytes
        //                 bytes: lancer_pubkey.publicKey.toBase58(), // base58 encoded string
        //             },
        //             },
        //         ],
        //         }
        //     );
        //     const fetch_current_account_data = await program.account.featureDataAccount.fetch(account_data[0].pubkey)

        //     assert.equal(fetch_current_account_data.fundsTokenAccount.toString(), LANCER_ESCROW_TOKEN_ACCOUNT);
        //     assert.equal(account_data[0].pubkey.toString(), LANCER_BOUNTY_DATA_ACCOUNT);

        //     console.log("derived correct accounts");
        // }

    try {
        let creator_token_account = await getAssociatedTokenAddress(
            new PublicKey(MINT),
            lancer_pubkey,
        );
        let vote_to_cancel_tx = await program.methods.voteToCancel(true).accounts({
            creator: lancer_pubkey,
            featureDataAccount: new PublicKey(LANCER_BOUNTY_DATA_ACCOUNT),
            voter: lancer_pubkey,
        }).signers([lancer_keypair]).rpc();

        console.log("vote to cancel tx  = ", vote_to_cancel_tx )

        let tx = await program.methods.cancelFeature().accounts({
            creator: lancer_pubkey,
            featureDataAccount: new PublicKey(LANCER_BOUNTY_DATA_ACCOUNT),
            featureTokenAccount: new PublicKey(LANCER_ESCROW_TOKEN_ACCOUNT),
            creatorTokenAccount: creator_token_account,
            programAuthority: program_authority,
            tokenProgram: TOKEN_PROGRAM_ID,
        }).signers([lancer_keypair]).rpc();
        console.log("money retrieved, check ", tx);

        
    } catch (error) {
        console.log("err = ", error);
    }  

    //  done()
    });

})