import express from 'express'
import expressWs from 'express-ws'
import cors from 'cors'
import bodyParser from 'body-parser'
import {Invoice, GetInfoResponse, Readable, WalletBalanceResponse} from '@radar/lnrpc'
import env from './env'
import {node, initNode} from './node'
// import { priceManager } from './priceManager';
import manager from './manager'

// Configure server
const app = expressWs(express()).app
app.use(cors({origin: '*'}))
app.use(bodyParser.json())


// API Routes
app.ws('/api/coffees', (ws) => {
  // Send all the posts we have initially
  ws.send(JSON.stringify({
    type: 'hello',
  }));

  // Listen for Invoice Settlement
  const coffeeInvoiceSettledListener = (invoice: Invoice) => {
    // Send event to client
    ws.send(JSON.stringify({
      type: 'invoice-settlement',
      data: invoice,
    }));

    // TODO
    // Call ESP8266 - Deliver coffee

  };
  manager.addListener('invoice-settlement', coffeeInvoiceSettledListener);

  // Keep-alive by pinging every 10s
  const pingInterval = setInterval(() => {
    ws.send(JSON.stringify({ type: 'ping' }));
    }, 10000);

  // Stop listening if they close the connection
  ws.addEventListener('close', () => {
    console.log('Connection ws closed, stop listening')
    manager.removeListener('coffee', coffeeInvoiceSettledListener);
    clearInterval(pingInterval);
  });
});

app.post('/api/generatePaymentRequest', async (req, res, next) => {
  try {
    const {name} = req.body

    if (!name) {
      throw new Error('Fields name and content are required')
    }

    const invoice = await node.addInvoice({
      memo: name,
      value: '10',
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

    //const balanceResponse: WalletBalanceResponse = await node.walletBalance();
    //console.log('Confirmed Balance ', balanceResponse.confirmedBalance);

    // Listen to events

    /*
       // Subscribe to LND server events
    const subscriber = await node.subscribeInvoices();
    subscriber.on('data', (invoice: Invoice) => {
      console.log('Pouetttttt  ', invoice); // do something with invoice event
    });
    */

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