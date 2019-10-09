import express from 'express'
import expressWs from 'express-ws'
import cors from 'cors'
import bodyParser from 'body-parser'
import {Invoice, GetInfoResponse, Readable} from '@radar/lnrpc'
import env from './env'
import {node, initNode} from './node'
import manager from './manager'
const globalAny: any = global
globalAny.fetch = require('node-fetch')
const cc = require('cryptocompare')
//
let retryOpenInvoiceStream = 1
let retryInit = 1

// Configure server
const app = expressWs(express()).app
app.use(cors({origin: '*'}))
app.use(bodyParser.json())

// Push invoice to client
const notifyClientPaidInvoice = async function (invoice, ws) {
  console.log('Notify client')
  console.log('readyState ', ws.readyState)
  ws.send(JSON.stringify({
    type: 'invoice-settlement',
    data: invoice,
  }), (error) => {
    if (error) {
      console.log('Error when sending "invoice-settlement" to client  ', error)
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
        throw Error(response.statusText)
      }
    })
    .catch(error => {
      console.log(error)
    })
}

// Websocket route
app.ws('/api/coffees', (ws) => {
  // Lock to avoid being called twice
  let lock = true

  // AddListener for 'invoice-settlement' event
  // Notify client and deliver coffee
  const coffeeInvoiceSettledListener = async (invoice: Invoice) => {
    console.log('Try to enter lock...')
    if (lock) {
      console.log('Enter lock')
      await notifyClientPaidInvoice(invoice, ws)
      await deliverCoffee(invoice)
    }
    lock = false
    setTimeout(() => {
      lock = true;
    }, 1000)
  }
  // Add listener
  manager.addListener('invoice-settlement', coffeeInvoiceSettledListener)

  // Keep-alive by pinging every 20s
  const pingInterval = setInterval(() => {
    ws.send(JSON.stringify({type: 'ping'}))
  }, 20000)

  // Stop listening if client close the connection
  ws.addEventListener('close', () => {
    console.log('Connection ws closed, stop listening')
    manager.removeListener('invoice-settlement', coffeeInvoiceSettledListener)
    clearInterval(pingInterval)
  })
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


const openLndInvoicesStream = async function() {
  console.log('Opening LND invoice stream...')
  // SubscribeInvoices returns a uni-directional stream (server -> client) for notifying the client of newly added/settled invoices
  let lndInvoicesStream = await node.subscribeInvoices() as any as Readable<Invoice>
  lndInvoicesStream
    .on('data', (invoice: Invoice) => {
      // Skip unpaid / irrelevant invoice updates
      // Memo should start with '#'
      if (!invoice.settled || !invoice.amtPaidSat || !invoice.memo || invoice.memo.charAt(0) !== '#') return
      // Handle paid invoice
      console.log(`Invoice - ${invoice.memo} - Paid!`)
      manager.handleInvoiceSettlement(invoice)
    })
    .on('status', (status) => {
      console.log(`SubscribeInvoices status: ${JSON.stringify(status)}`)
      // https://github.com/grpc/grpc/blob/master/doc/statuscodes.md
    })
    .on('error', (error) => {
      console.log(`SubscribeInvoices error: ${error}`)
      console.log('Try opening stream again')
      console.log(`#${retryOpenInvoiceStream} - call openLndInvoicesStream again after ${500 * Math.pow(2, retryOpenInvoiceStream)}`)
      const openLndInvoicesStreamTimeout = setTimeout(async () => {
        await openLndInvoicesStream()
        const nodeInfo = await checkLnd()
        if (nodeInfo instanceof Error) {
          retryOpenInvoiceStream++
          console.log('increment retryOpenInvoiceStream', retryOpenInvoiceStream)
        } else {
          console.log('Reset counter retryOpenInvoiceStream')
          retryOpenInvoiceStream = 1
        }
      }, 500 * Math.pow(2, retryOpenInvoiceStream))

      if (retryOpenInvoiceStream === 15) {
        console.log('Give up call openLndInvoicesStream')
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

      await openLndInvoicesStream()

      console.log('Starting server...')
      await app.listen(env.PORT, () => console.log(`API Server started at http://localhost:${env.PORT}!`))
    })
    .then(() => {
      // Reset counter
      retryInit = 1
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