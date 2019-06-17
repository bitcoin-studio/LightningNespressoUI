import createLnRpc, {
  GetInfoResponse,
  LnRpc,
  Invoice,
  WalletBalanceResponse } from '@radar/lnrpc';
import env from './env';

export let node: LnRpc;

export async function initNode() {
  node = await createLnRpc({
    server: env.LND_GRPC_URL,
    cert: new Buffer(env.LND_TLS_CERT, 'base64').toString('ascii'),
    macaroon: new Buffer(env.LND_MACAROON, 'base64').toString('hex'),
  });

  const infoResponse: GetInfoResponse = await node.getInfo();
  console.log('Node info ', infoResponse)

  const balanceResponse: WalletBalanceResponse = await node.walletBalance();
  console.log('Confirmed Balance ', balanceResponse.confirmedBalance);

  // subscribe to LND server events
  const subscriber = await node.subscribeInvoices();
  subscriber.on('data', (invoice: Invoice) => {
    console.log(invoice); // do something with invoice event
  });
}