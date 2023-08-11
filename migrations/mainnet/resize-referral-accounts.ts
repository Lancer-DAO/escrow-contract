import * as anchor from "@project-serum/anchor";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import {Connection, Keypair, PublicKey, Transaction} from "@solana/web3.js";
//@ts-ignore
import {MonoProgram} from "../../target/types/mono_program";
//@ts-ignore
import idl from "../target/idl/mono_program";
import {Client} from "@ladderlabs/buddy-sdk"


async function resizeAccounts() {
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
}

resizeAccounts();

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

    const buddyClient = new Client(connection);

    const referralAccounts = await program.account.referralDataAccount.all();

    for (const referralAccount of referralAccounts) {
        let referrerMembers = [];

        for (const referral of referralAccount.account.approvedReferrers) {
            if (referral.toString() !== PublicKey.default.toString()) {
                const treasuryOwner = (await connection.getAccountInfo(referral)).owner; //make sure its actual owner and not token program

                const referrerMember = await buddyClient.member.getByTreasuryOwner(treasuryOwner);
                referrerMembers.push(referrerMember[0]);
            } else {
                referrerMembers.push(PublicKey.default);
            }
        }

        const tx = new Transaction();

        tx.add(
            await program.methods
                .addReferrerMember(referrerMembers)
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
// setMemberReferrer();