#!/usr/bin/env ts-node
import { ethers } from 'ethers'
import {
  EthersAdapter,
  SafeAccountConfig,
  SafeFactory
} from '@safe-global/protocol-kit'

import { CFG } from './config'
import { OPTIMISM_SAFE } from './utils/addresses'

async function main() {
  /* 1. Provider & signer */
  const provider = new ethers.JsonRpcProvider(CFG.rpc, CFG.chainId)
  const signer   = new ethers.Wallet(CFG.pk, provider)

  /* 2. Safe SDK adapter */
    const ethAdapter = new EthersAdapter({ ethers, signerOrProvider: signer })

  /* 3. Factory with Optimism overrides */
  const factory = await SafeFactory.create({
    ethAdapter
  })

  /* 4. Deposit-only config: main Safe is the sole owner */
  const cfg: SafeAccountConfig = {
    owners: [CFG.mainSafe],
    threshold: 1
  }

  const saltNonce = Date.now().toString()  // anything unique
  const predicted = await factory.predictSafeAddress(cfg, saltNonce)
  console.log('Predicted address:', predicted)

  const registry = '0xaE00377a40B8b14e5f92E28A945c7DdA615b2B46'

  const depositSafe = await factory.deploySafe({ safeAccountConfig: cfg, saltNonce,  callback: registry  })
  console.log('Deployed proxy at:', await depositSafe.getAddress())
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
