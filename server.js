// server.js

import express from 'express'
import fetch from 'node-fetch'
import dotenv from 'dotenv'
import cors from 'cors'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000
const API_URL = process.env.EVOLUTION_API_URL
const API_KEY = process.env.EVOLUTION_API_KEY

if (!API_URL || !API_KEY) {
  console.error('⚠️ Defina EVOLUTION_API_URL e EVOLUTION_API_KEY em variáveis de ambiente')
  process.exit(1)
}

app.use(cors())
app.use(express.static('public'))

const headers = { apikey: API_KEY }

app.get('/api/qr', async (req, res) => {
  const instance = req.query.instance
  if (!instance) {
    return res.status(400).json({ error: 'Parâmetro "instance" é obrigatório' })
  }

  try {
    // 1) Verifica estado
    const stateResp = await fetch(`${API_URL}/instance/connectionState/${instance}`, { headers })
    if (!stateResp.ok) {
      const txt = await stateResp.text()
      console.error('Erro ConnectionState:', stateResp.status, txt)
      return res.status(500).json({ error: 'Falha ao verificar estado', details: txt })
    }
    const { instance: instObj } = await stateResp.json()
    if (!instObj?.state) {
      console.error('Resposta inesperada da API de estado:', await stateResp.json())
      return res.status(500).json({ error: 'Resposta inesperada da API de estado' })
    }
    const state = instObj.state

    // 2) Se desconectada, busca o QR array
    let base64 = null, pairingCode = null
    if (state !== 'open') {
      const qrResp = await fetch(`${API_URL}/instance/connect/${instance}`, { headers })
      if (!qrResp.ok) {
        const txt = await qrResp.text()
        console.error('Erro InstanceConnect:', qrResp.status, txt)
        return res.status(500).json({ error: 'Falha ao buscar QR', details: txt })
      }
      const arr = await qrResp.json()
      const item = Array.isArray(arr) ? arr[0] : arr
      base64     = item.base64   || null
      pairingCode= item.code     || null
    }

    return res.json({ state, base64, pairingCode })
  } catch (err) {
    console.error('Erro interno no servidor:', err)
    return res.status(500).json({ error: 'Erro interno no servidor' })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 Server rodando na porta ${PORT}`)
})
