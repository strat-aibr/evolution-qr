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

app.use(cors())              // para permitir fetch do browser
app.use(express.static('public'))

const headers = { apikey: API_KEY }

app.get('/api/qr', async (req, res) => {
  const instance = req.query.instance
  if (!instance) {
    return res.status(400).json({ error: 'Parâmetro "instance" é obrigatório' })
  }

  try {
    console.log(`→ Checando estado da instância ${instance}`)
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

    let qr = null, pairingCode = null
    if (state !== 'open') {
      console.log('→ Instância desconectada, buscando QR')
      const qrResp = await fetch(`${API_URL}/instance/connect/${instance}`, { headers })
      if (!qrResp.ok) {
        const txt = await qrResp.text()
        console.error('Erro InstanceConnect:', qrResp.status, txt)
        return res.status(500).json({ error: 'Falha ao buscar QR', details: txt })
      }
      const qrJson = await qrResp.json()
      // limpa quebras de linha
      qr = qrJson.code?.replace(/\r?\n|\r/g, '') ?? null
      pairingCode = qrJson.pairingCode ?? null
      console.log('→ pairingCode:', pairingCode, ' – qr (str slice):', qr?.slice(0,30))
    }

    return res.json({ state, qr, pairingCode })
  } catch (err) {
    console.error('Erro interno no servidor:', err)
    return res.status(500).json({ error: 'Erro interno no servidor' })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 Server rodando na porta ${PORT}`)
})
