import { ethers } from 'ethers'
import SafeProxyFactoryAbi from '../abi.json'
import { CFG } from './config'

// 1. addresses
const FACTORY = '0xC22834581EbC8527d974F8a1c97E1bEA4EF910BC' // Optimism factory
const SINGLETON = '0x3E5c63644E683549055b9Be8653de26E0B4CD36E'
const REGISTRY = '0xae00377a40b8b14e5f92e28a945c7dda615b2b46'
const OWNER_SAFE = process.env.MAIN_SAFE!

export async function createSafe(): Promise<{
  address: string
  txHash: string
}> {
  // 2. init data for the Safe singleton
  const safeInterface = new ethers.Interface([
    'function setup(address[] owners,uint256 threshold,address to,bytes data,address fallbackHandler,address paymentToken,uint256 payment,address payable paymentReceiver)'
  ])

  const safeIface = new ethers.Interface([
    "function enableModule(address)"
  ]);
  const ENABLE_DATA = safeIface.encodeFunctionData(
    "enableModule",
    ["0x62dA5B4722Fe31B0C3e882bBdd12d9F38b7e660e"]   // your module
  );
  const initData = safeInterface.encodeFunctionData('setup', [
    [OWNER_SAFE], // owners[]
    1,            // threshold
    ethers.ZeroAddress, ENABLE_DATA, ethers.ZeroAddress, ethers.ZeroAddress, 0, ethers.ZeroAddress
  ])

  const provider = new ethers.JsonRpcProvider(CFG.rpc, CFG.chainId)
  const signer = new ethers.Wallet(CFG.pk, provider)
  // 3. derive a saltNonce (string)
  const saltNonce = Date.now().toString()

  // 4. call the factory
  const factory = new ethers.Contract(FACTORY, SafeProxyFactoryAbi, signer)




  const tx = await factory.createProxyWithCallback(
    SINGLETON,
    initData,
    saltNonce,
    REGISTRY
  )
  console.log('tx sent:', tx.hash)
  const receipt = await tx.wait()

  const eventSig = factory.interface.getEvent('ProxyCreation')!.topicHash
  const log = receipt.logs.find((l: { topics: string[] }) => l.topics[1] === eventSig) ?? receipt.logs[0]
  const proxy = ethers.getAddress(log.address)

  console.log(`proxy    : ${proxy}`)
  console.log(`explorer : https://optimistic.etherscan.io/tx/${tx.hash}`)

  return { address: proxy, txHash: tx.hash }
}

