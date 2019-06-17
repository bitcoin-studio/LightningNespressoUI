/**
 * Get price BTC eur, convert
 */

const https = require('https');

export let priceManager = {
  getPrice: getPrice()
}

function getPrice() {
  console.log('getPric////////////////////////////e')
  let options = {
    "method": "GET",
    "hostname": "rest.coinapi.io",
    "path": "/v1/quotes/current",
    "headers": {'X-CoinAPI-Key': '73034021-0EBC-493D-8A00-E0F138111F41'}
  };

  let request = https.request(options, function (response: { on: (arg0: string, arg1: (chunk: any) => void) => void; }) {
    let chunks: any[] | never[] = [];
    response.on("data", function (chunk) {
      // @ts-ignore
      chunks.push(chunk);
      console.log('chunks', chunks)
    });
  });

  let data = request.end();
  console.log('data', data)

}