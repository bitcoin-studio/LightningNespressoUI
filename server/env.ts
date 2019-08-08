import dotenv from 'dotenv';

const result = dotenv.config()
if (result.error) throw result.error

const env = {
  PORT: process.env.PORT as string,
  LND_GRPC_URL: process.env.LND_GRPC_URL as string,
  LND_MACAROON: process.env.LND_MACAROON as string,
  LND_TLS_CERT: process.env.LND_TLS_CERT as string,
  VENDING_MACHINE: process.env.VENDING_MACHINE as string,
  TESTING: process.env.TESTING as string
};

// Ensure all keys exist
Object.entries(env).forEach(([key, value]) => {
  if (!value) {
    throw new Error(`Required environment variable '${key}' is missing!`);
  }
});

export default env;