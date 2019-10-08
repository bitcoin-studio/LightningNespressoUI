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

// Lock for coffeeInvoiceSettledListener callback to avoid being called twice
let lock = true

// Configure server
const app = expressWs(express()).app
app.use(cors({origin: '*'}))
app.use(bodyParser.json())

// API Routes
app.ws('/api/coffees', (ws) => {
  // Reply hello because you are polite
  ws.send(JSON.stringify({
    type: 'hello',
  }))

  /**
   * AddListener Function for 'invoice-settlement' event
   * Listen for Invoice Settlement
   */
  const coffeeInvoiceSettledListener = (invoice: Invoice) => {
    if (lock) {
      console.log('Invoice paid (server)')
      // Notify client
      console.log('readyState ', ws.readyState)
      ws.send(JSON.stringify({
        type: 'invoice-settlement',
        data: invoice,
      }), (error) => {
        if (error) {
          console.log('Error when sending "invoice-settlement" to client  ', error)
        }
      })

      // Call ESP8266 - Deliver coffee
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
    lock = false
    // Reset to true after 500ms
    setTimeout(() => {
      lock = true;
    }, 500)
  }

  // Listener
  manager.addListener('invoice-settlement', coffeeInvoiceSettledListener)

  // Keep-alive by pinging every 10s
  const pingInterval = setInterval(() => {
    ws.send(JSON.stringify({type: 'ping'}))
  }, 10000)

  // Stop listening if they close the connection
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
  let retryCount = 0
  ;(async function getInfoFn() {
    try {
      const info = await node.getInfo()
      res.json({data: info})
    } catch (err) {
      retryCount++
      console.log(err.message)
      console.log(`#${retryCount} - call getInfo again after ${500 * Math.pow(2, retryCount)}`)
      const getInfoTimeout = setTimeout(getInfoFn, 500 * Math.pow(2, retryCount))

      if (retryCount === 10) {
        console.log('give up call getInfo')
        clearTimeout(getInfoTimeout)
        next(err)
      }
    }
  })()
})

app.get('/', (req, res) => {
  res.send('You need to load the webpack-dev-server page, not the server page!')
})


// Initialize node & server
let lndInvoicesStream = null

const openLndInvoicesStream = async function() {
  if (lndInvoicesStream) {
    console.log('Lnd invoices subscription stream already opened')
  } else {
    console.log('Opening lnd invoices subscription stream...')
    // Subscribe to all invoices
    lndInvoicesStream = await node.subscribeInvoices() as any as Readable<Invoice>
    lndInvoicesStream
      .on('data', (invoice: Invoice) => {
        // Skip unpaid / irrelevant invoice updates
        // Memo should start with '#'
        if (!invoice.settled || !invoice.amtPaidSat || !invoice.memo || invoice.memo.charAt(0) !== '#') return
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
        lndInvoicesStream = null
        openLndInvoicesStream()
      })
      .on('end', () => {
        console.log('SubscribeInvoices stream ended')
        console.log('Try opening stream again')
        lndInvoicesStream = null
        openLndInvoicesStream()
      })
  }
}

console.log('Initializing Lightning node...')
initNode()
  .then(() => {
    console.log('Lightning node initialized!')
    console.log('Starting server...')
    app.listen(env.PORT, () => console.log(`API Server started at http://localhost:${env.PORT}!`))
  })
  .then(async () => {
    const info: GetInfoResponse = await node.getInfo()
    console.log('Node info ', info)
  })
  .then(async () => {
    // open lnd invoices stream on start
    await openLndInvoicesStream()
  })
  .catch((err) => {
    console.log('catch err initNode', err)
  })