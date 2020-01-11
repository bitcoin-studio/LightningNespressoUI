import express, {NextFunction, Request, Response} from 'express'
import log from 'loglevel'
import axios from 'axios'
import retry from 'async-retry'
import cors from 'cors'
import {setIntervalAsync} from 'set-interval-async/dynamic'
// eslint-disable-next-line import/no-extraneous-dependencies
import WebSocket from 'ws' // @types/ws
import expressWs, {Application} from 'express-ws'
import bodyParser from 'body-parser'
import {GetInfoResponse, Invoice} from '@radar/lnrpc'
import {randomBytes} from 'crypto'
import {env} from './env'
import {initNode, node} from './node'

// Set log level
log.setLevel('trace')

let wsConnections: { [x: string]: WebSocket }[] = []

// Server configuration
const app: Application = expressWs(express(), undefined, {wsOptions: {clientTracking: true}}).app
app.use(cors({origin: ['https://www.bitcoin-studio.com']}))
app.use(bodyParser.json())
// Security headers should be set at reverse proxy level

// Websocket route
app.ws('/api/ws', (ws: WebSocket) => {
  const wsClientId: string = randomBytes(2).toString('hex')
  log.info(`New websocket connection open by client ${wsClientId}`)

  // Send this key to client
  ws.send(JSON.stringify({
    data: wsClientId,
    type: 'client-id',
  }))

  // Ping / Pong
  const pingInterval = setInterval(() => ws.ping('heartbeat', false), 10000)
  ws.on('pong', (pingData) => {
    if (pingData.toString() !== 'heartbeat') {
      log.error('Websocket pong not received')
    }
  })

  ws.addEventListener('error', (ErrorEvent) => {
    log.error('Websocket error', ErrorEvent.error)
  })

  ws.addEventListener('close', (e) => {
    if (e.wasClean) {
      log.info(`Connection websocket ${wsClientId} closed normally`)
    } else {
      log.warn(`Connection websocket ${wsClientId} closed abnormally`)
      log.warn('Close code', e.code)
    }
    log.debug(`Stop pinging client ${wsClientId}`)
    clearInterval(pingInterval)

    // Remove closing ws, return all the others
    wsConnections = wsConnections.filter((wsConnection) => Object.keys(wsConnection)[0] !== wsClientId)
  })

  // Store client connection
  wsConnections.push({[wsClientId]: ws})
  log.info(`There ${wsConnections.length === 1 ? 'is' : 'are'} ${wsConnections.length} websocket `
    + `connection${wsConnections.length === 1 ? '' : 's'} currently`)
})

app.post('/api/generatePaymentRequest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {memo, value} = req.body
    if (!memo || !value) {
      log.error('Fields "memo" and "value" are required to create an invoice')
      return
    }
    const invoice: Invoice = await node.addInvoice({
      memo: memo,
      value: (env.TESTING === 'true') ? '1' : String(value),
      expiry: '300', // 5 minutes
    })
    res.json({
      data: {
        paymentRequest: invoice.paymentRequest,
      },
    })
  } catch (err) {
    next(err)
  }
})

app.get('/api/getPrice', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const price = await axios('https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=EUR')
    res.json({data: price.data})
  } catch (err) {
    next(err)
  }
})

app.get('/api/getNodeInfo', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await retry(async (bail, attemptNum) => {
      log.debug(`Attempt getNodeInfo #${attemptNum}`)
      const info = await node.getInfo()
      res.json({data: info})
    }, {retries: 3})
  } catch (err) {
    next(err)
  }
})

app.get('/', (req: Request, res: Response) => {
  res.send('You need to load the webpack-dev-server page, not the server page!')
})

// Push invoice to client
type notifyClientPaidInvoice = (invoice: Invoice, wsClientIdFromInvoice: string) => void
const notifyClientPaidInvoice: notifyClientPaidInvoice = function (invoice, wsClientIdFromInvoice) {
  wsConnections.forEach((connection) => {
    const id = Object.keys(connection)[0]
    if (wsClientIdFromInvoice === id) {
      log.info('Notify client', id)
      log.debug('Websocket readyState', connection[id].readyState)
      connection[id].send(
        JSON.stringify({
          type: 'invoice-settlement',
          data: invoice,
        }), (error) => {
          if (error) {
            log.error(`Error when sending "invoice-settlement" to client ${id}`, error)
          }
        },
      )
    }
  })
}

type notifyClientDeliveryFailure = (error: { message: string }, wsClientIdFromInvoice: string) => void
const notifyClientDeliveryFailure: notifyClientDeliveryFailure = function (error, wsClientIdFromInvoice) {
  wsConnections.forEach((connection) => {
    const id = Object.keys(connection)[0]
    if (wsClientIdFromInvoice === id) {
      log.error('Notify client delivery failure', id)
      log.debug('Websocket readyState', connection[id].readyState)
      connection[id].send(
        JSON.stringify({
          type: 'delivery-failure',
          data: error.message,
        }), (err) => {
          if (err) {
            log.error(`Error notify delivery failure to client ${id}`, err)
          }
        },
      )
    }
  })
}

// Call ESP8266 - Deliver coffee
type deliverCoffee = (invoice: Invoice, wsClientIdFromInvoice: string) => void
const deliverCoffee: deliverCoffee = (invoice: Invoice, wsClientIdFromInvoice: string) => {
  const id = invoice?.memo?.charAt(1)
  log.info(`Deliver coffee on rail ${id}`)
  const body = {coffee: id as string}
  retry(async (bail, attemptNum) => {
    log.debug(`Attempt deliver coffee #${attemptNum}`)
    await axios({
      url: env.VENDING_MACHINE,
      method: 'post',
      data: JSON.stringify(body),
      headers: {'Content-Type': 'application/json'},
    })
  }, {retries: 5})
    .then(() => {
      log.info('Request to vending machine sent')
      notifyClientPaidInvoice(invoice, wsClientIdFromInvoice)
    })
    .catch((err) => {
      notifyClientDeliveryFailure(err, wsClientIdFromInvoice)
      log.error(err.message)
    })
}

const createLndInvoiceStream: () => void = function () {
  log.info('Opening LND invoice stream...')

  // SubscribeInvoices returns a uni-directional stream (server -> client)
  const subscribe: () => void = () => {
    const lndInvoicesStream = node.subscribeInvoices()
    lndInvoicesStream
      .on('data', (invoice: Invoice) => {
        // Skip unpaid / irrelevant invoice updates
        // Memo should start with '#'
        if (!invoice.settled || !invoice.amtPaidSat || !invoice.memo || !invoice.memo.startsWith('#')) return

        // Handle Invoice Settlement
        log.info(`Invoice settled - ${invoice.memo}`)
        const wsClientIdFromInvoice = invoice.memo.substr(invoice.memo.indexOf('@') + 1, 4)
        deliverCoffee(invoice, wsClientIdFromInvoice)
      })
      .on('status', (status) => {
        log.warn(`SubscribeInvoices status: ${status.details} - Code: ${status.code}`)
        // https://github.com/grpc/grpc/blob/master/doc/statuscodes.md
      })
      .on('error', (error: Error) => {
        log.error(`SubscribeInvoices error: ${error}`)
        createLndInvoiceStream()
      })
      .on('end', () => {
        log.error('Stream end event. No more data to be consumed from lndInvoicesStream')
        createLndInvoiceStream()
      })
  }

  retry(async (bail, attemptNum) => {
    log.debug(`Attempt createLndInvoiceStream #${attemptNum}`)
    subscribe()
    log.debug('Check connection to LND instance...')
    await node.getInfo()
  }, {retries: 5})
    .then(() => log.debug('LND invoice stream opened successfully'))
    .catch((err) => log.error(err))
}

// General server initialization
const init: () => void = function () {
  log.info('Connecting to LND...')
  initNode()
    .then(() => {
      log.debug('Check connection to LND...')
      node.getInfo()
        .then((nodeInfo: GetInfoResponse) => {
          log.info('Node info ', nodeInfo)
          log.info('Connected to LND instance!')
        })
        .catch((err) => log.error(err))
    })
    .then(() => {
      createLndInvoiceStream()
      log.info('Starting server...')
      app.listen(env.SERVER_PORT, () => log.info(`API Server started at http://localhost:${env.SERVER_PORT}!`))
    })
    .then(() => {
      // Ping LND to keep stream open
      setIntervalAsync(() => {
        node.getInfo()
          .then(() => log.info('Ping LND...'))
          .catch((err) => log.error(err))
      }, (1000 * 60 * 9))
    })
    .catch((err) => {
      log.error('Server initialization failed ', err)
    })
}
init()
