/* createSafe.ts – deterministic Safe proxy on multiple chains
   ------------------------------------------------------------
   pnpm add ethers@6          # or yarn add ethers@6
*/

import { ethers } from 'ethers';
import SafeFactoryAbi from '../abi.json'; 
import { CFG } from './config';     // GnosisSafeProxyFactory ABI

/* ── 1. shared constants ─────────────────────────────────────── */
const SINGLETON = '0x3E5c63644E683549055b9Be8653de26E0B4CD36E'; // Safe v1.4.x
const OWNER     = CFG.mainSafe                      // main Safe EOA
const SALT      = ethers.id('global-safe-v1'); 
console.log(OWNER)                 // 32-byte salt

/* ── 2. per-chain settings (factory must live at same addr) ─── */
const CHAINS = [
  {
    name:     'Optimism',
    factory:  '0xC22834581EbC8527d974F8a1c97E1bEA4EF910BC',
    rpc:      'https://mainnet.optimism.io',
    chainId:  10,
    explorer: 'https://optimistic.etherscan.io/tx/',
    pk:       CFG.pk,      // funded relayer
  },
  {
    name:     'Celo',
    factory:  '0xC22834581EbC8527d974F8a1c97E1bEA4EF910BC', // same addr
    rpc:      'https://forno.celo.org',
    chainId:  42220,
    explorer: 'https://explorer.celo.org/mainnet/tx/',
    pk:       CFG.pk!,
  },
] as const;

/* ── 3. initData helper (no module, no fallback) ─────────────── */
function buildInitData(): string {
  const iface = new ethers.Interface([
    'function setup(address[],uint256,address,bytes,address,address,uint256,address)',
  ]);

  return iface.encodeFunctionData('setup', [
    [OWNER],           // owners[]
    1,                 // threshold
    ethers.ZeroAddress,
    '0x',              // no delegate call
    ethers.ZeroAddress, ethers.ZeroAddress, 0, ethers.ZeroAddress,
  ]);
}

/* ── 4. main loop ─────────────────────────────────────────────── */
(async () => {
  const initData = buildInitData();

  for (const cfg of CHAINS) {
    const provider = new ethers.JsonRpcProvider(cfg.rpc, cfg.chainId);
    const signer   = new ethers.Wallet(cfg.pk, provider);
    const factory  = new ethers.Contract(cfg.factory, SafeFactoryAbi, signer);

    console.log(`\n🚀 Deploying on ${cfg.name}…`);

    

    const tx = await factory.createProxyWithNonce(
      SINGLETON,
      initData,
      SALT,
      { gasLimit: 3_000_000 },
    );
    console.log('tx sent:', tx.hash);

    const rc = await tx.wait();
    const proxy = rc.logs[0].address;

    console.log(`✅ proxy ${cfg.name}: ${proxy}`);
    console.log(`🔗 ${cfg.explorer}${tx.hash}`);
  }
})();
