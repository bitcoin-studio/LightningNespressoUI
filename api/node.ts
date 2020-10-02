import {authenticatedLndGrpc, getWalletInfo} from 'ln-service'
import {env} from './env'

// eslint-disable-next-line import/no-mutable-exports
export let lnd: any
// eslint-disable-next-line import/no-mutable-exports
export let nodePublicKey: string

export const initNode = async function (): Promise<void> {
  lnd = await authenticatedLndGrpc({
    cert: env.LND_TLS_CERT,
    macaroon: env.LND_MACAROON,
    socket: env.LND_GRPC_URL,
  }).lnd
  const walletInfo = await getWalletInfo({lnd})
  nodePublicKey = walletInfo.public_key
}
