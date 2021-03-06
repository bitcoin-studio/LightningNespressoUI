import express, {NextFunction, Request, Response} from 'express'
import expressStaticGzip from 'express-static-gzip'
import expressWs, {Application} from 'express-ws'
import {createInvoice, getNode, subscribeToInvoices} from 'ln-service'
import axios from 'axios'
import retry from 'async-retry'
import {setIntervalAsync} from 'set-interval-async/dynamic'
// eslint-disable-next-line import/no-extraneous-dependencies
import WebSocket from 'ws' // @types/ws
import bodyParser from 'body-parser'
import {randomBytes} from 'crypto'
import {resolve} from 'path'
import {log} from './logger'
import {env} from './env'
import {initNode, lnd, nodePublicKey} from './node'
import {setLongTermCache, setNoCache} from './httpHeaders'

let wsConnections: { [x: string]: WebSocket }[] = []
const app: Application = expressWs(express(), undefined, {wsOptions: {clientTracking: true}}).app

// Serve brotli pre-compressed static files with cache-control header
app.use(expressStaticGzip(resolve(__dirname, 'ui', 'dist'), {
  enableBrotli: true,
  serveStatic: {
    setHeaders: (res: Response, path: string) => {
      const file = path.split('/').pop()
      if (file === 'service-worker.js.br' || file === 'index.html.br') {
        setNoCache(res)
      } else {
        setLongTermCache(res)
      }
    },
  },
}))
app.use(bodyParser.json())

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
    const invoice: Invoice = await createInvoice({
      lnd: lnd,
      description: memo,
      tokens: (env.TESTING === 'true') ? '1' : String(value),
      expires_at: new Date(new Date().setMinutes(new Date().getMinutes() + 5)).toISOString(), // 5 minutes from now
    })
    res.json({
      data: {
        paymentRequest: invoice.request,
      },
    })
  } catch (err) {
    next(err)
  }
})

app.get('/_/health', (req: Request, res: Response) => {
  res.status(200).send()
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
      const info = await getNode({lnd, public_key: nodePublicKey})
      info.public_key = nodePublicKey
      res.json({data: info})
    }, {retries: 3})
  } catch (err) {
    next(err)
  }
})

app.get('*', (req: Request, res: Response) => {
  res.redirect('/')
})

// gRPC status codes
// https://github.com/grpc/grpc/blob/master/doc/statuscodes.md
// TODO: Check type enforcement error.code
type errorCode = string | undefined
type wsEventType = 'delivery-failure' | 'invoice-settlement' | 'error'
type NotifyClient = (data: { msg: InvoiceEvent | errorCode, wsEventType: wsEventType }, wsClientId: string) => void
const notifyClient: NotifyClient = function (data, wsClientId) {
  wsConnections.forEach((connection) => {
    const id = Object.keys(connection)[0]
    if (wsClientId === id) {
      log.debug('Notify client', id)
      log.debug('Websocket readyState', connection[id].readyState)
      connection[id].send(
        JSON.stringify({
          type: data.wsEventType,
          data: data.msg,
        }), (err) => err && log.error(`Failed to notify client ${id}`, err),
      )
    }
  })
}

// Call ESP8266 - Deliver coffee
const deliverCoffee = function (invoiceEvent: InvoiceEvent, wsClientIdFromInvoice: string): void {
  try {
    const id: string = invoiceEvent?.description?.charAt(1)
    log.info(`Deliver coffee on rail ${id}`)
    const body = {coffee: id}
    retry(async (bail, attemptNum) => {
      log.debug(`Attempt deliver coffee #${attemptNum}`)
      await axios({
        url: env.VENDING_MACHINE,
        method: 'post',
        data: JSON.stringify(body),
        headers: {'Content-Type': 'application/json'},
      })
    }, {retries: 3})
    log.info('Request to vending machine sent')
    notifyClient({msg: invoiceEvent, wsEventType: 'invoice-settlement'}, wsClientIdFromInvoice)
  } catch (err) {
    notifyClient({msg: err, wsEventType: 'delivery-failure'}, wsClientIdFromInvoice)
    log.error(err.message)
  }
}

const createLndInvoiceStream = async function () {
  log.info('Creating LND invoice stream...')
  try {
    // SubscribeInvoices returns a uni-directional stream (server -> client)
    const lndInvoicesStream: NodeJS.EventEmitter = subscribeToInvoices({lnd})
    lndInvoicesStream
      .on('invoice_updated', (invoiceEvent: InvoiceEvent) => {
        // Skip unpaid / irrelevant invoice updates
        // Memo should start with '#'
        if (!invoiceEvent.is_confirmed || !invoiceEvent.description.startsWith('#')) return
        // Handle Invoice Settlement
        log.info(`Invoice settled - ${invoiceEvent.description}`)
        const wsClientIdFromInvoice = invoiceEvent.description.substr(invoiceEvent.description.indexOf('@') + 1, 4)
        deliverCoffee(invoiceEvent, wsClientIdFromInvoice)
      })
      .on('status', (status: { details: string; code: number }) => {
        log.warn(`SubscribeInvoices status: ${status.details} - Code: ${status.code}`)
        // https://github.com/grpc/grpc/blob/master/doc/statuscodes.md
      })
      .on('error', (error: LnServiceError) => {
        log.error(`SubscribeInvoices error code: ${error[0]}`)
        log.error(`SubscribeInvoices error message: ${error[1]}`)
        log.error(`SubscribeInvoices error details: ${JSON.stringify(error[2])}`)
        log.error('')
        // Broadcast to all ws clients
        wsConnections.forEach((connection) => {
          notifyClient({msg: error[1], wsEventType: 'error'}, Object.keys(connection)[0])
        })
        // Terminate the process synchronously, Kubernetes enters CrashLoopBackOff
        process.exit(1)
      })
      .on('end', () => {
        log.error('Stream end event. No more data to be consumed from lndInvoicesStream')
      })
    log.debug('Check connection to LND instance...')
    await getNode({lnd, public_key: nodePublicKey})
    log.debug('LND invoice stream opened successfully')
  } catch (err) {
    log.error(err)
  }
}

// General server initialization
const init: () => void = function () {
  log.info('Connecting to LND...')
  initNode()
    .then(() => {
      log.debug('Check connection to LND...')
      getNode({lnd, public_key: nodePublicKey})
        .then((nodeInfo: any) => {
          log.info('Node info ', nodeInfo)
          log.info('Connected to LND instance!')
        })
        .catch((err: LnServiceError) => log.error(err))
    })
    .then(async () => {
      await createLndInvoiceStream()
      log.info('Starting server...')
      app.listen(env.SERVER_PORT, () => log.info(`API Server started on port ${env.SERVER_PORT}!`))
      // Ping LND to keep stream open
      setIntervalAsync(() => {
        getNode({lnd, public_key: nodePublicKey})
          .then(() => log.info('Ping LND...'))
          .catch((err: LnServiceError) => log.error(err))
      }, (1000 * 60 * 9))
    })
    .catch((err: Error | LnServiceError) => {
      log.error('Server initialization failed ', err)
    })
}

init()
