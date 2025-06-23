/* sweep-usdt-multi.ts
   -------------------------------------------------------------
   pnpm add @safe-global/protocol-kit @safe-global/safe-core-sdk-types ethers@6 dotenv
   -------------------------------------------------------------
   ENV required:
     MAIN_SAFE   – address of your main Safe (owner of all proxies)
     RELAYER_PK  – EOA private key that controls MAIN_SAFE
     RPC_URL     – Optimism RPC
*/

import { ethers } from "ethers";
import Safe, { EthersAdapter } from "@safe-global/protocol-kit";
import {
  MetaTransactionData,
  OperationType,
  SafeTransaction,
} from "@safe-global/safe-core-sdk-types";
import * as dotenv from "dotenv";
dotenv.config();

/* ── CONFIG ─────────────────────────────────────────────────── */
const {
  MAIN_SAFE,
  RELAYER_PK,
  RPC_URL,
} = process.env;

const TOKEN  = "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85";   // USDT
const PROXIES = [
  "0xF2E2C4A58941b43e202858D42D3702d08F3D3ADA",
  "0x642e17721dF5Ce7338B34c006CB3153885ce2f01"
  // add more proxy addresses here
];

/* ── ABIs ───────────────────────────────────────────────────── */
const ERC20 = new ethers.Interface([
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address,uint256) returns (bool)",
]);

const SAFE_EXEC = new ethers.Interface([
  "function execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)",
]);

const APPROVE_IFACE = new ethers.Interface([
  "function approveHash(bytes32)",
]);

/* ── MAIN ───────────────────────────────────────────────────── */
async function main() {
  if (!MAIN_SAFE || !RELAYER_PK || !RPC_URL)
    throw new Error("Missing env vars");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer   = new ethers.Wallet(RELAYER_PK, provider);
  const ethAdapter = new EthersAdapter({ ethers, signerOrProvider: signer });

  const mainSdk = await Safe.create({ ethAdapter, safeAddress: MAIN_SAFE });
  const usdt = new ethers.Contract(TOKEN, ERC20, provider);

  const approveBatch: MetaTransactionData[] = [];
  const execBatch:    MetaTransactionData[] = [];

  // reusable contract signature: r = MAIN_SAFE, s = 0, v = 1
  const contractSig =
    "0x" +
    MAIN_SAFE.toLowerCase().replace("0x", "").padStart(64, "0") +
    "0".repeat(64) +
    "01";

  console.log("Scanning proxies …\n");

  for (const PROXY of PROXIES) {
    /* 1. proxy SDK for hash building */
    const proxySdk = await Safe.create({ ethAdapter, safeAddress: PROXY });

    /* 1-a. balance */
    const bal: bigint = await usdt.balanceOf(PROXY);
    console.log(
      `Proxy ${PROXY} balance: ${ethers.formatUnits(bal, 6)} USDT`
    );
    if (bal === 0n) {
      console.log("   ↳ skipping (zero)");
      continue;
    }

    /* 1-b. Safe-tx inside proxy (USDT transfer) */
    const transferTx: MetaTransactionData = {
      to:    TOKEN,
      value: "0",
      data:  ERC20.encodeFunctionData("transfer", [MAIN_SAFE, bal]),
      operation: OperationType.Call,
    };
    const safeTx: SafeTransaction = await proxySdk.createTransaction({
      transactions: [transferTx],
    });
    const hash = await proxySdk.getTransactionHash(safeTx);

    /* 2. Build approveHash (batch #1) */
    approveBatch.push({
      to:    PROXY,
      value: "0",
      data:  APPROVE_IFACE.encodeFunctionData("approveHash", [hash]),
      operation: OperationType.Call,
    });

    /* 3. Build execTransaction (batch #2) */
    const d = safeTx.data;
    execBatch.push({
      to:    PROXY,
      value: "0",
      data:  SAFE_EXEC.encodeFunctionData("execTransaction", [
               d.to, d.value, d.data, d.operation,
               0,0,0,                      // safeTxGas, baseGas, gasPrice
               ethers.ZeroAddress,         // gasToken
               ethers.ZeroAddress,         // refundReceiver
               contractSig                 // signatures
             ]),
      operation: OperationType.Call,
    });
  }

  if (!approveBatch.length) {
    console.log("\nNo proxies with positive USDT balance — nothing to sweep.");
    return;
  }

  /* ---------------- batch 1: approveHash ----------------- */
  console.log(
    `\nSubmitting batch 1 (approveHash) – ${approveBatch.length} actions …`
  );
  const tx1 = await mainSdk.createTransaction({ transactions: approveBatch });
  await mainSdk.signTransaction(tx1);
  const sent1 = await mainSdk.executeTransaction(tx1);
  await (sent1.transactionResponse as ethers.TransactionResponse).wait();
  console.log("✅ batch 1 confirmed");

  /* ---------------- batch 2: execTransaction ------------- */
  console.log(
    `Submitting batch 2 (execTransfer) – ${execBatch.length} actions …`
  );
  const tx2 = await mainSdk.createTransaction({ transactions: execBatch });
  await mainSdk.signTransaction(tx2);
  const sent2 = await mainSdk.executeTransaction(tx2);
  const rc2   = await (sent2.transactionResponse as ethers.TransactionResponse).wait();
  console.log("✅ sweep complete. Batch tx hash:", rc2!.hash);
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});
