import dotenv from 'dotenv'

const result = dotenv.config()
if (result.error instanceof Error) throw new Error(result.error.message)

export const env = {
  SERVER_PORT: process.env.SERVER_PORT,
  LND_GRPC_URL: process.env.LND_GRPC_URL,
  LND_MACAROON: process.env.LND_MACAROON,
  LND_TLS_CERT: process.env.LND_TLS_CERT,
  VENDING_MACHINE: process.env.VENDING_MACHINE,
  TESTING: process.env.TESTING,
}

// Ensure all env vars exist
Object.entries(env).forEach(([key, value]) => {
  if (!value) {
    throw new Error(`Required environment variable '${key}' is missing!`)
  }
})
