import { ethers } from 'ethers'
import SafeProxyFactoryAbi from '../abi.json'
import { CFG } from './config'

// 1. addresses
const FACTORY   = '0xC22834581EbC8527d974F8a1c97E1bEA4EF910BC' // Optimism factory
const SINGLETON = '0x3E5c63644E683549055b9Be8653de26E0B4CD36E'
const REGISTRY  = '0xaE00377a40B8b14e5f92E28A945c7DdA615b2B46'
const OWNER_SAFE = process.env.MAIN_SAFE!

// 2. init data for the Safe singleton
const safeInterface = new ethers.Interface([
  'function setup(address[] owners,uint256 threshold,address to,bytes data,address fallbackHandler,address paymentToken,uint256 payment,address payable paymentReceiver)'
])
const initData = safeInterface.encodeFunctionData('setup', [
  [OWNER_SAFE], // owners[]
  1,            // threshold
  ethers.ZeroAddress, '0x', ethers.ZeroAddress, ethers.ZeroAddress, 0, ethers.ZeroAddress
])

const provider = new ethers.JsonRpcProvider(CFG.rpc, CFG.chainId)
const signer   = new ethers.Wallet(CFG.pk, provider)
// 3. derive a saltNonce (string)
const saltNonce = Date.now().toString()

// 4. call the factory
const factory = new ethers.Contract(FACTORY, SafeProxyFactoryAbi, signer)


async function main() {

const tx = await factory.createProxyWithCallback(
  SINGLETON,
  initData,
  saltNonce,
  REGISTRY
)
console.log('tx sent:', tx.hash)
const receipt = await tx.wait()
const proxyAddr = receipt.logs[0].address   // first log is ProxyCreationL2
console.log('new proxy:', proxyAddr)
}

main().catch(err => {
    console.error(err)
    process.exit(1)
  })