import * as anchor from "@project-serum/anchor";
import { createSyncNativeInstruction } from "@solana/spl-token";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import fs from "fs";

const MAX_NO_OF_SUBMITTERS = 5;

export const createKeypair = async (
  provider: anchor.AnchorProvider
) => {
    const keypair = new anchor.web3.Keypair();
    const latestBlockHash = await provider.connection.getLatestBlockhash();
    
    const airdropSignature = await provider.connection.requestAirdrop(
      keypair.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: airdropSignature,    
    });
    return keypair;
};

export const createKeypairFromFile = async (
  provider: anchor.AnchorProvider,
  filepath
) => {
  const path = require("path");
  const file = fs.readFileSync(path.resolve(__dirname, filepath));
  // let fileTxt = readFileSync("./_users/mint.json", { encoding: 'utf-8' });
  let kepairJson = JSON.parse(file);
  let buffers_8 = Uint8Array.from(kepairJson);
  let token_keypair = anchor.web3.Keypair.fromSecretKey(buffers_8);

  // fund dispute_admin
  const latestBlockHash = await provider.connection.getLatestBlockhash();
    
  const airdropSignature = await provider.connection.requestAirdrop(
    token_keypair.publicKey,
    10 * anchor.web3.LAMPORTS_PER_SOL
  );
  await provider.connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: airdropSignature,    
  });


  // console.log("token keypair = ", token_keypair.publicKey.toString());
  return token_keypair;
} 

export const add_more_token = async (
  provider:  anchor.AnchorProvider,
  token_account: PublicKey,
  WSOL_AMOUNT : number,
) => {

    let convert_to_wsol_tx = new Transaction().add(
      // trasnfer SOL
      SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: token_account,
        lamports: WSOL_AMOUNT,
      }),
      // sync wrapped SOL balance
      createSyncNativeInstruction(token_account)
    );  
    await provider.sendAndConfirm(convert_to_wsol_tx, [] );

}

function wait(ms){
   var start = new Date().getTime();
   var end = start;
   while(end < start + ms) {
     end = new Date().getTime();
  }
}

export function getFeatureDataAccountLength()
{
  let unix_timestamp_length = 13;

  return 8  +// Discriminator 
  8 + //Amount
  1  +// request_submitted
  32 +// current_submitter
  (32 * MAX_NO_OF_SUBMITTERS) +// approved_submitters
  (4 * MAX_NO_OF_SUBMITTERS) + //approved submiiters share(in case of mulriple submitters)
  32 +// creator
  32 +// funds_mint
  32 +// funds_account
  32 +// payout_account
  1  +// funder_cancel
  1  +// payout_cancel
  1  +// no_of_submitters
  1  +// is_multiple_submitters
  1  +// funds_token_account_bump
  1  +// funds_data_account_bump
  1  +// program_authority_bump    
  (4 + unix_timestamp_length); // 4 + unix_timestamp

}

export function getDisputeAccountLength()
{
  let unix_timestamp_length = 13;

  return 8  +// Discriminator 
  32 + // creator
  32 + // submitter
  (4 + unix_timestamp_length) + // 4 + unix_timestamp
  32 + // mint
  8 + //amount
  1 + //dispute_account_bump
  1 + // program_authority_bump
  1;// funds_token_account_bump
}