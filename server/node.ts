import createLnRpc, {LnRpc} from '@radar/lnrpc'
import {env} from './env'

export let node: LnRpc

export const initNode: () => Promise<void> = async function () {
  try {
    node = await createLnRpc({
      server: env.LND_GRPC_URL as string,
      cert: Buffer.from(env.LND_TLS_CERT as string, 'base64').toString('ascii'),
      macaroon: Buffer.from(env.LND_MACAROON as string, 'base64').toString('hex'),
    })
  } catch (err) {
    console.error(err)
  }
}