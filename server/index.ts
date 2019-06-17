import express from 'express';
import expressWs from 'express-ws';
import cors from 'cors';
import bodyParser from 'body-parser';
import { Invoice, Readable } from '@radar/lnrpc';
import env from './env';
import { node, initNode } from './node';
// import { priceManager } from './priceManager';
import CoffeeManager from './coffeeManager';

console.log('CoffeeManager', CoffeeManager)

// Configure server
const app = expressWs(express()).app;
app.use(cors({ origin: '*' }));
app.use(bodyParser.json());


// API Routes
app.post('/api/generatePaymentRequest', async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name) {
      throw new Error('Fields name and content are required');
    }

    const invoice = await node.addInvoice({
      memo: name,
      value: "10",
      expiry: '300', // 5 minutes
    });

    res.json({
      data: {
        paymentRequest: invoice.paymentRequest,
      },
    });
  } catch(err) {
    next(err);
  }
});

app.get('/api/getNodeInfo', async (req, res, next) => {
  try {
    const info = await node.getInfo()
    res.json({data: {info}})
  } catch(err) {
    next(err)
  }
});

app.get('/', (req, res) => {
  res.send('You need to load the webpack-dev-server page, not the server page!');
});


// Initialize node & server
console.log('Initializing Lightning node...');
initNode().then(() => {
  console.log('Lightning node initialized!');
  console.log('Starting server...');
  app.listen(env.PORT, () => {
    console.log(`API Server started at http://localhost:${env.PORT}!`);
  })


  // Subscribe to all invoices, mark posts as paid
  const stream = node.subscribeInvoices() as any as Readable<Invoice>;
  stream.on('data', chunk => {
    // Skip unpaid / irrelevant invoice updates
    if (!chunk.settled || !chunk.amtPaidSat || !chunk.memo) return;

    // Mark the invoice as paid!
    console.log('Invoice Paid!', chunk.memo)
    CoffeeManager.markCoffeePaid(0);
  })
})
