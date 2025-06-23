import 'dotenv/config'

function env(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

export const CFG = {
  rpc:       env('RPC_URL'),
  pk:        env('RELAYER_PK'),
  mainSafe:  env('MAIN_SAFE'),
  chainId:   10  // Optimism
}
