// server.js

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

const headers = { apikey: API_KEY }

// Serve arquivos estáticos da pasta `public/`
app.use(express.static('public'))

// Endpoint que retorna o estado da instância e, se desconectada, o QR code em Base64
app.get('/api/qr', async (req, res) => {
  const instance = req.query.instance
  if (!instance) {
    return res.status(400).json({ error: 'Parâmetro "instance" é obrigatório' })
  }

  try {
    // 1) Verifica estado da instância
    const stateResp = await fetch(`${API_URL}/instance/connectionState/${instance}`, { headers })
    if (!stateResp.ok) {
      const txt = await stateResp.text()
      console.error('Erro ConnectionState:', stateResp.status, txt)
      return res.status(500).json({ error: 'Falha ao verificar estado', details: txt })
    }
    const stateJson = await stateResp.json()
    const instObj = stateJson.instance
    if (!instObj || !instObj.state) {
      console.error('Resposta inesperada da API de estado:', stateJson)
      return res.status(500).json({ error: 'Resposta inesperada da API de estado' })
    }
    const state = instObj.state

    // 2) Se não estiver "open", busca o QR code
    let qr = null
    if (state !== 'open') {
      const qrResp = await fetch(`${API_URL}/instance/connect/${instance}`, { headers })
      if (!qrResp.ok) {
        const txt = await qrResp.text()
        console.error('Erro InstanceConnect:', qrResp.status, txt)
        return res.status(500).json({ error: 'Falha ao buscar QR', details: txt })
      }
      const qrJson = await qrResp.json()
      qr = qrJson.code   // campo `code` já vem em Base64
    }

    return res.json({ state, qr })
  } catch (err) {
    console.error('Erro interno no servidor:', err)
    return res.status(500).json({ error: 'Erro interno no servidor' })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 Server rodando na porta ${PORT}`)
})
