import express from 'express'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000
const API_URL = process.env.EVOLUTION_API_URL
const API_KEY = process.env.EVOLUTION_API_KEY

if (!API_URL || !API_KEY) {
  console.error('⚠️ Defina EVOLUTION_API_URL e EVOLUTION_API_KEY em variáveis de ambiente')
  process.exit(1)
}

// Serve arquivos estáticos em public/
app.use(express.static('public'))

// Rota única: retorna estado e, se não "open", o QR code em base64
app.get('/api/qr', async (req, res) => {
  const instance = req.query.instance
  if (!instance) {
    return res.status(400).json({ error: 'Missing instance parameter' })
  }

  try {
    // 1) Verifica estado
    const stateResp = await fetch(`${API_URL}/instance/connectionState/${instance}`, {
      headers: { 'x-api-key': API_KEY }
    })
    const { instance: instObj } = await stateResp.json()
    const state = instObj.state

    let qr = null
    if (state !== 'open') {
      // 2) Pega QR code em base64
      const qrResp = await fetch(`${API_URL}/instance/connect/${instance}`, {
        headers: { 'x-api-key': API_KEY }
      })
      const qrJson = await qrResp.json()
      // usa o campo 'code' (já em Base64)
      qr = qrJson.code
    }

    return res.json({ state, qr })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erro ao conectar à Evolution API' })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 Server rodando na porta ${PORT}`)
})
