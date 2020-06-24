import dotenv from 'dotenv'
import fs from 'fs'

const config = fs.readFileSync('/var/openfaas/secrets/lightning-nespresso-api-config', 'utf8')
const {SERVER_PORT, LND_GRPC_URL, LND_MACAROON, LND_TLS_CERT, VENDING_MACHINE, TESTING} = dotenv.parse(config)

export const env = {
  SERVER_PORT: SERVER_PORT,
  LND_GRPC_URL: LND_GRPC_URL,
  LND_MACAROON: LND_MACAROON,
  LND_TLS_CERT: LND_TLS_CERT,
  VENDING_MACHINE: VENDING_MACHINE,
  TESTING: TESTING,
}

// Ensure all env vars exist
Object.entries(env).forEach(([key, value]) => {
  if (!value) {
    throw new Error(`Required environment variable '${key}' is missing!`)
  }
})
