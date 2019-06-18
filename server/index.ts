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
//cc.setApiKey('<your-api-key>')

// Configure server
const app = expressWs(express()).app
app.use(cors({origin: '*'}))
app.use(bodyParser.json())


// API Routes
app.ws('/api/coffees', (ws) => {
  // Send all the posts we have initially
  ws.send(JSON.stringify({
    type: 'hello',
  }))

  // Listen for Invoice Settlement
  const coffeeInvoiceSettledListener = (invoice: Invoice) => {
    // Send event to client
    ws.send(JSON.stringify({
      type: 'invoice-settlement',
      data: invoice,
    }))

    // TODO
    // Call ESP8266 - Deliver coffee

  }
  manager.addListener('invoice-settlement', coffeeInvoiceSettledListener)

  // Keep-alive by pinging every 10s
  const pingInterval = setInterval(() => {
    ws.send(JSON.stringify({type: 'ping'}))
  }, 10000)

  // Stop listening if they close the connection
  ws.addEventListener('close', () => {
    console.log('Connection ws closed, stop listening')
    manager.removeListener('coffee', coffeeInvoiceSettledListener)
    clearInterval(pingInterval)
  })
})

app.post('/api/generatePaymentRequest', async (req, res, next) => {
  try {
    const {name, value} = req.body
    //console.log('name', name, 'value', value)

    if (!name || !value) {
      throw new Error('Fields name and value are required')
    }

    const invoice = await node.addInvoice({
      memo: `${name} - The Block`,
      value: value,
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
  try {
    const info = await node.getInfo()
    res.json({data: {info}})
  } catch (err) {
    next(err)
  }
})

app.get('/', (req, res) => {
  res.send('You need to load the webpack-dev-server page, not the server page!')
})


// Initialize node & server
console.log('Initializing Lightning node...')
initNode()
  .then(() => {
    console.log('Lightning node initialized!')
    console.log('Starting server...')
    app.listen(env.PORT, () => console.log(`API Server started at http://localhost:${env.PORT}!`))
  })
  .then(async () => {
    const infoResponse: GetInfoResponse = await node.getInfo()
    console.log('Node info ', infoResponse)

    // Subscribe to all invoices
    const stream = await node.subscribeInvoices() as any as Readable<Invoice>
    stream
      .on('data', (invoice: Invoice) => {
        // Skip unpaid / irrelevant invoice updates
        if (!invoice.settled || !invoice.amtPaidSat || !invoice.memo) return
        console.log(`Invoice - ${invoice.memo} - Paid!`)
        manager.handleInvoiceSettlement(invoice)
      })
      .on('status', (status: string) => {
        console.debug(`invoice status: ${JSON.stringify(status)}`)
      })
      .on('error', async (error) => {
        console.error(`invoice error: ${error}`)
      })
  })
  .catch((err) => {
    console.log(err)
  })