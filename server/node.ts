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
      cert: env.LND_TLS_CERT as string,
      macaroon: env.LND_MACAROON as string,
      socket: env.LND_GRPC_URL as string,
    }).lnd
    nodePublicKey = (await getWalletInfo({lnd})).public_key
  } catch (err) {
    log.error(err)
  }
}
