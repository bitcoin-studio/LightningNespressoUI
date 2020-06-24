import {authenticatedLndGrpc, getWalletInfo} from 'ln-service'
import log from 'loglevel'
import {env} from './env'

// eslint-disable-next-line import/no-mutable-exports
export let lnd: any
// eslint-disable-next-line import/no-mutable-exports
export let nodePublicKey: string

export const initNode: () => Promise<void> = async function () {
  try {
    lnd = await authenticatedLndGrpc({
      cert: env.LND_TLS_CERT,
      macaroon: env.LND_MACAROON,
      socket: env.LND_GRPC_URL,
    }).lnd
    nodePublicKey = (await getWalletInfo({lnd})).public_key
  } catch (err) {
    log.error(err)
  }
}
