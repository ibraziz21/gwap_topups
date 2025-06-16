import http  from 'http'
import { createSafe } from '../createProxyWithCallback'

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/wallet') {
    try {
      const { address, txHash } = await createSafe()
      res.writeHead(201, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ address, txHash }))
    } catch (err) {
      console.error(err)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'Safe creation failed' }))
    }
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
})

server.listen(PORT, () => console.log(`API ready on :${PORT}`))
