# Deposit-Safe Factory + On-Chain Registry  

Create **one-owner Gnosis Safe proxies** for every user *and* tag each proxy on-chain via a single callback.

---

## ✨ What’s inside

| Step | Contract / Script | Purpose |
|------|------------------|---------|
| **1** | `contracts/ProxyRegistry.sol` | Stores `proxy ⇒ user` the moment a new proxy is created. |
| **2** | `src/createProxyWithCallback.ts` | Calls the official **Safe Proxy Factory** (Optimism) and passes the registry address as the callback. |

**Outcome →** Each user gets a ~ 30 k-gas Safe proxy whose *only* owner is **your main Safe** and the registry instantly knows which user it belongs to.

---

## 🛠 Quick start
```bash
# 1 · Install dependencies
npm install

# 2 · Create & fill your env file
cp .env.example .env       # then edit RPC_URL, PK, MAIN_SAFE, …

# 3. Install packages and run
npx ts-node src/routes/wallet.ts

#4. Call the API URL with the correct port to create a new wallet
curl -X POST http://localhost:8080/wallet | jq


```
---

## 🛠 Essential ENV Keys

```bash
# 1 · RPC_URL
L2 RPC endpoint

# 2 · PK
Gas paying signer(To be replaced by connected user)

# 3 · Main Safe
Parent Safe that will own all proxies created
```

## 🔗 Key contract addresses (Optimism mainnet)

```bash
Singleton (Safe v1.3.0)	0x3E5c63644E683549055b9Be8653de26E0B4CD36E
Proxy Factory	0xC22834581EbC8527d974F8A1c97E1BEa4Ef910Bc
Proxy Registry	0xaE00377a40B8b14e5f92E28A945c7DdA615b2B46
```


