import express from 'express'
import expressWs from 'express-ws'
import cors from 'cors'
import bodyParser from 'body-parser'
import {Invoice, GetInfoResponse, Readable} from '@radar/lnrpc'
import {randomBytes} from 'crypto'
import env from './env'
import {node, initNode} from './node'
const globalAny: any = global
globalAny.fetch = require('node-fetch')
const cc = require('cryptocompare')
let wsConnections = []
let retryCreateInvoiceStream = 1
let retryInit = 1

// Configure server
const wsInstance = expressWs(express(), undefined, {wsOptions: {clientTracking: true}})
const app = wsInstance.app
app.use(cors({origin: '*'}))
app.use(bodyParser.json())

// Push invoice to client
const notifyClientPaidInvoice = async function (invoice, clientIdFromInvoice) {
  wsConnections.forEach((connection) => {
    const id = Object.keys(connection)[0]

    if (clientIdFromInvoice === id) {
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

// Call ESP8266 - Deliver coffee
const deliverCoffee = async function (invoice) {
  let id = invoice.memo.charAt(1)
  console.log(`Deliver coffee on rail ${id}`)
  const body = { coffee: id as string};
  globalAny.fetch(env.VENDING_MACHINE, {
    method: 'post',
    body:    JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
    .then(response => {
      if(response.ok){
        console.log('Request to vending machine sent')
      }else{
        throw new Error(response.statusText)
      }
    })
    .catch(error => {
      console.log('Coffee delivering error', error)
      console.log('Try delivery again...')
      deliverCoffee(invoice)
    })
}

// Websocket route
app.ws('/api/ws', (ws) => {
  const clientId: string = randomBytes(2).toString('hex')
  console.log(`New websocket connection open by client ${clientId}`)

  // Send this key to client
  ws.send(JSON.stringify({
    data: clientId,
    type: 'client-id'
  }))

  const pingInterval = setInterval(() => ws.ping(
    "heartbeat",
    false
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
      console.log(`Connection websocket ${clientId} closed normally`)
    } else {
      console.log(`Connection websocket ${clientId} closed abnormally`)
      console.log('Close code', e.code)
    }
    console.log(`Stop pinging client ${clientId}`)
    clearInterval(pingInterval)

    // Remove closed ws
    wsConnections = wsConnections.filter(function(wsConnection){
      // Check if wsConnection is the one clientId is closing, return all the others
      return Object.keys(wsConnection)[0] !== clientId
    })
  })

  // Store client connection
  wsConnections.push({[clientId]: ws})
  console.log(`There ${wsConnections.length === 1 ? 'is' : 'are'} ${wsConnections.length} websocket ` +
    `connection${wsConnections.length === 1 ? '' : 's'} currently`)
})

app.post('/api/generatePaymentRequest', async (req, res, next) => {
  try {
    const {memo, value} = req.body

    if (!memo || !value) {
      throw new Error('Fields "memo" and "value" are required to create an invoice')
    }

    const invoice = await node.addInvoice({
      memo: memo,
      value: env.TESTING === 'true' ? '1' : value,
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

app.get('/api/getPrice', async (req, res, next) => {
  try {
    // CryptoCompare API
    cc.price('BTC', ['USD', 'EUR'])
      .then(prices => {
        return res.json({data: prices})
      })
      .catch(console.error)
  } catch (err) {
    next(err)
  }
})

app.get('/api/getNodeInfo', async (req, res, next) => {
  let retryCount = 1
  ;(async function getInfoFn() {
    try {
      const info = await node.getInfo()
      res.json({data: info})
    } catch (err) {
      console.log('Get node info error: ', err.message)
      console.log(`#${retryCount} - call getInfo again after ${500 * Math.pow(2, retryCount)}`)
      const getInfoTimeout = setTimeout(getInfoFn, 500 * Math.pow(2, retryCount))
      if (retryCount === 15) {
        console.log('Give up call getInfo')
        clearTimeout(getInfoTimeout)
        next(err)
      }
      retryCount++
    }
  })()
})

app.get('/', (req, res) => {
  res.send('You need to load the webpack-dev-server page, not the server page!')
})


const createLndInvoiceStream = async function() {
  console.log('Opening LND invoice stream...')
  // SubscribeInvoices returns a uni-directional stream (server -> client) for notifying the client of newly added/settled invoices
  let lndInvoicesStream = await node.subscribeInvoices() as any as Readable<Invoice>
  lndInvoicesStream
    .on('data', async (invoice: Invoice) => {
      // Skip unpaid / irrelevant invoice updates
      // Memo should start with '#'
      if (!invoice.settled || !invoice.amtPaidSat || !invoice.memo || invoice.memo.charAt(0) !== '#') return

      // Handle Invoice Settlement
      console.log(`Invoice settled - ${invoice.memo}`)
      const clientIdFromInvoice = invoice.memo.substr(invoice.memo.indexOf('@') + 1, 4)
      await notifyClientPaidInvoice(invoice, clientIdFromInvoice)
      await deliverCoffee(invoice)
    })
    .on('status', (status) => {
      console.log(`SubscribeInvoices status: ${JSON.stringify(status)}`)
      // https://github.com/grpc/grpc/blob/master/doc/statuscodes.md
    })
    .on('error', (error) => {
      console.log(`SubscribeInvoices error: ${error}`)
      console.log('Try opening stream again')
      console.log(`#${retryCreateInvoiceStream} - call createLndInvoiceStream again after ${500 * Math.pow(2, retryCreateInvoiceStream)}`)
      const openLndInvoicesStreamTimeout = setTimeout(async () => {
        await createLndInvoiceStream()
        const nodeInfo = await checkLnd()
        if (nodeInfo instanceof Error) {
          retryCreateInvoiceStream++
          console.log('increment retryCreateInvoiceStream', retryCreateInvoiceStream)
        } else {
          console.log('Reset counter retryCreateInvoiceStream')
          retryCreateInvoiceStream = 1
        }
      }, 500 * Math.pow(2, retryCreateInvoiceStream))

      if (retryCreateInvoiceStream === 15) {
        console.log('Give up call createLndInvoiceStream')
        clearTimeout(openLndInvoicesStreamTimeout)
        throw error
      }
    })
    .on('end', async () => {
      // No more data to be consumed from lndInvoicesStream
      console.log('No more data to be consumed from lndInvoicesStream')
    })
}

// Check connection to LND instance or invoice stream
const checkLnd = async function() {
  console.log('Check connection to LND instance...')
  // We check by calling getInfo()
  try {
    const info: GetInfoResponse = await node.getInfo()
    return info
  } catch (err) {
    return err
  }
}

// General server initialization
const init = function () {
  console.log('Connecting to LND instance...')
  initNode()
    .then(async () => {
      const nodeInfo = await checkLnd()

      if (nodeInfo instanceof Error) {
        throw nodeInfo
      } else {
        console.log('Node info ', nodeInfo)
        console.log('Connected to LND instance!')
        console.log('LND invoice stream opened successfully')
      }

      await createLndInvoiceStream()

      console.log('Starting server...')
      await app.listen(env.PORT, () => console.log(`API Server started at http://localhost:${env.PORT}!`))
    })
    .then(() => {
      // Reset counter
      retryInit = 1
    })
    .then(() => {
      // Ping LND to keep stream open
      setInterval(checkLnd, (1000 * 60 * 9))
    })
    .catch((err) => {
      console.log('Server initialization failed ', err)
      console.log('Try server initialization again...')
      console.log(`#${retryInit} - call init() again after ${500 * Math.pow(2, retryInit)}`)
      const initTimeout = setTimeout(init, 500 * Math.pow(2, retryInit))
      if (retryInit === 15) {
        console.log('Give up server initialization')
        clearTimeout(initTimeout)
      }
      retryInit++
    })
}
init()