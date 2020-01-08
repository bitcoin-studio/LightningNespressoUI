import express, {NextFunction, Request, Response} from 'express'
import axios from 'axios'
import retry from 'async-retry'
import cors from 'cors'
import ws from 'ws'
import expressWs, {Application} from 'express-ws'
import bodyParser from 'body-parser'
import {GetInfoResponse, Invoice} from '@radar/lnrpc'
import {randomBytes} from 'crypto'
import {env} from './env'
import {initNode, node} from './node'

let wsConnections: { [x: string]: ws }[] = []

// Server configuration
const app: Application = expressWs(express(), undefined, {wsOptions: {clientTracking: true}}).app
app.use(cors({origin: ['https://www.bitcoin-studio.com']}))
app.use(bodyParser.json())
// Security headers should be set at reverse proxy level

// Websocket route
app.ws('/api/ws', (ws: ws) => {
  const wsClientId: string = randomBytes(2).toString('hex')
  console.log(`New websocket connection open by client ${wsClientId}`)

  // Send this key to client
  ws.send(JSON.stringify({
    data: wsClientId,
    type: 'client-id',
  }))

  const pingInterval = setInterval(() => ws.ping(
    'heartbeat',
    false,
  ), 10000)

  ws.on('pong', function heartbeat(pingData) {
    if (pingData.toString() !== 'heartbeat') {
      console.log('Websocket pong not received')
    }
  })

  ws.addEventListener('error', (ErrorEvent) => {
    console.log('Websocket error', ErrorEvent.error)
  })

  ws.addEventListener('close', (e) => {
    if (e.wasClean) {
      console.log(`Connection websocket ${wsClientId} closed normally`)
    } else {
      console.log(`Connection websocket ${wsClientId} closed abnormally`)
      console.log('Close code', e.code)
    }
    console.log(`Stop pinging client ${wsClientId}`)
    clearInterval(pingInterval)

    // Remove closed ws
    wsConnections = wsConnections.filter(function (wsConnection) {
      // Check if wsConnection is the one wsClientId is closing, return all the others
      return Object.keys(wsConnection)[0] !== wsClientId
    })
  })

  // Store client connection
  wsConnections.push({[wsClientId]: ws})
  console.log(`There ${wsConnections.length === 1 ? 'is' : 'are'} ${wsConnections.length} websocket ` +
    `connection${wsConnections.length === 1 ? '' : 's'} currently`)
})

app.post('/api/generatePaymentRequest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {memo, value} = req.body
    if (!memo || !value) {
      console.error('Fields "memo" and "value" are required to create an invoice')
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
      console.log(`Attempt getNodeInfo #${attemptNum}`)
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

// Check connection to LND instance or invoice stream by calling getInfo()
type checkLnd = () => Promise<GetInfoResponse | Error>
const checkLnd: checkLnd = async () => {
  console.log('Check connection to LND instance...')
  try {
    return await node.getInfo()
  } catch (err) {
    return err
  }
}

// Push invoice to client
type notifyClientPaidInvoice = (invoice: Invoice, wsClientIdFromInvoice: string) => void
const notifyClientPaidInvoice: notifyClientPaidInvoice = function (invoice, wsClientIdFromInvoice) {
  wsConnections.forEach((connection) => {
    const id = Object.keys(connection)[0]
    if (wsClientIdFromInvoice === id) {
      console.log('Notify client', id)
      console.log('Websocket readyState', connection[id].readyState)
      connection[id].send(
        JSON.stringify({
          type: 'invoice-settlement',
          data: invoice,
        }), (error) => {
          if (error) {
            console.log(`Error when sending "invoice-settlement" to client ${id}`, error)
          }
        })
    }
  })
}

type notifyClientDeliveryFailure = (error: { message: string }, wsClientIdFromInvoice: string) => void
const notifyClientDeliveryFailure: notifyClientDeliveryFailure = function (error, wsClientIdFromInvoice) {
  wsConnections.forEach((connection) => {
    const id = Object.keys(connection)[0]
    if (wsClientIdFromInvoice === id) {
      console.log('Notify client delivery failure', id)
      console.log('Websocket readyState', connection[id].readyState)
      connection[id].send(
        JSON.stringify({
          type: 'delivery-failure',
          data: error.message,
        }), (error) => {
          if (error) {
            console.error(`Error notify delivery failure to client ${id}`, error)
          }
        })
    }
  })
}

// Call ESP8266 - Deliver coffee
type deliverCoffee = (invoice: Invoice, wsClientIdFromInvoice: string) => Promise<void>
const deliverCoffee: deliverCoffee = async (invoice: Invoice, wsClientIdFromInvoice: string) => {
  const id = invoice?.memo?.charAt(1)
  console.log(`Deliver coffee on rail ${id}`)
  const body = {coffee: id as string}
  try {
    await retry(async (bail, attemptNum) => {
      console.log(`Attempt deliver coffee #${attemptNum}`)
      await axios({
        url: env.VENDING_MACHINE,
        method: 'post',
        data: JSON.stringify(body),
        headers: {'Content-Type': 'application/json'},
      })
    }, {
      retries: 5,
    })
    console.log('Request to vending machine sent')
    notifyClientPaidInvoice(invoice, wsClientIdFromInvoice)
  } catch (error) {
    notifyClientDeliveryFailure(error, wsClientIdFromInvoice)
    console.error(error.message)
  }
}

const createLndInvoiceStream: () => void = async function () {
  console.log('Opening LND invoice stream...')

  // SubscribeInvoices returns a uni-directional stream (server -> client) for notifying the client of newly added/settled invoices
  const subscribe: () => void = async function () {
    const lndInvoicesStream = await node.subscribeInvoices()
    lndInvoicesStream
      .on('data', (invoice: Invoice) => {
        // Skip unpaid / irrelevant invoice updates
        // Memo should start with '#'
        if (!invoice.settled || !invoice.amtPaidSat || !invoice.memo || invoice.memo.charAt(0) !== '#') return

        // Handle Invoice Settlement
        console.log(`Invoice settled - ${invoice.memo}`)
        const wsClientIdFromInvoice = invoice.memo.substr(invoice.memo.indexOf('@') + 1, 4)
        deliverCoffee(invoice, wsClientIdFromInvoice)
      })
      .on('status', (status) => {
        console.log(`SubscribeInvoices status: ${JSON.stringify(status)}`)
        // https://github.com/grpc/grpc/blob/master/doc/statuscodes.md
      })
      .on('error', (error: Error) => {
        console.error(`SubscribeInvoices error: ${error}`)
        createLndInvoiceStream()
      })
      .on('end', () => {
        console.log('Stream end event. No more data to be consumed from lndInvoicesStream')
        createLndInvoiceStream()
      })
  }

  await retry(async (bail, attemptNum) => {
    console.log(`Attempt createLndInvoiceStream #${attemptNum}`)
    await subscribe()
    const nodeInfo = await checkLnd()
    if (nodeInfo instanceof Error) {
      throw new Error(nodeInfo.message)
    } else {
      console.log('LND invoice stream opened successfully')
    }
  }, {retries: 5})
}

// General server initialization
const init: () => void = function () {
  console.log('Connecting to LND instance...')
  initNode()
    .then(async () => {
      const nodeInfo = await checkLnd()
      if (nodeInfo instanceof Error) {
        throw new Error(nodeInfo.message)
      } else {
        console.log('Node info ', nodeInfo)
        console.log('Connected to LND instance!')
      }
      await createLndInvoiceStream()
      console.log('Starting server...')
      await app.listen(env.SERVER_PORT, () => console.log(`API Server started at http://localhost:${env.SERVER_PORT}!`))
    })
    .catch((err) => {
      console.error('Server initialization failed ', err)
    })
}
init()