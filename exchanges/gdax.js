require("dotenv").load();
const btoa = require("btoa");
const crypto = require('crypto');
const axios = require("axios");
const gemini = require("./gemini");
module.exports.btcAddress = "13F8G7QKu8qoMHqw1Z8tW9ATzns7bbte2q";
module.exports.ethAddress = "0xB34f0AaEC983AD5F2D60Ff997127278fb019e309";
module.exports.name = "gdax";
module.exports.withdrawExchange = gemini;

module.exports.signRequest = (method, reqPath, body) => {
  let time = (Date.now()/1000).toString();
  
  if (!body) {
    var prehashString = (time + method + reqPath + body);
  } else {
    var prehashString = (time + method + reqPath + JSON.stringify(body));
  }
  
  let key = Buffer(process.env.GDAX_PRIV, 'base64');
  let hmac = crypto.createHmac('sha256', key);

  return axios.create({
    headers: {
      "Content-Type": "application/json",
      "CB-ACCESS-KEY": process.env.GDAX_PUB,
      "CB-ACCESS-SIGN": hmac.update(prehashString).digest('base64'),
      "CB-ACCESS-PASSPHRASE": process.env.GDAX_PASS,
      "CB-ACCESS-TIMESTAMP": time
    },
    baseURL: 'https://api.gdax.com'
  });
}

module.exports.requestBalances = () => {
  let instance = module.exports.signRequest("GET", "/accounts", "");
  return instance.get('/accounts');
}

module.exports.balanceCheckLoop = (currency, cb) => {
    module.exports.requestBalances()
      .then(balanceArray => {
        const functions = {
          eth: () => {
            if(Number(balanceArray.data[2].available)){
              //console.log(balanceArray.data[2]);
              cb();
            } else {
              //console.log("NO BALANCE RECHECKING");
              setImmediate(() => module.exports.balanceCheckLoop(currency, cb));
            }
          },
          btc: () => {
            if(Number(balanceArray.data[3].available)){
              //console.log(balanceArray.data[3]);
              cb();
            } else {
              //console.log("NO BALANCE RECHECKING");
              setImmediate(() => module.exports.balanceCheckLoop(currency, cb));
            }
          }
        }
        functions[currency]();
      })
      .catch(err => console.log(err.data));
}

module.exports.withdraw = (currency, exchange, price) => {
  module.exports.requestBalances()
    .then(balanceArray => {
      const balances = {
        eth: {
          amount: balanceArray.data[2].available,
          exchangeCurrency: "btc" 
        },
        btc: { 
          amount: balanceArray.data[3].available,
          exchangeCurrency: "eth" 
        }
      };
      const body = {
        amount: Number(balances[currency].amount),
        currency: currency.toUpperCase(),
        crypto_address: exchange[currency + "Address"],
      };
      const signedRequest = module.exports.signRequest("POST", "/withdrawals/crypto", body);

      signedRequest.post("/withdrawals/crypto", body)
        .then(res => {
          //console.log("RES", res.data);
          exchange.balanceCheckLoop(currency, () => { exchange.buy(balances[currency].exchangeCurrency, price) });
        })
        .catch(err => console.log("ERR for signing withdrawal", err.response.data));
    })
    .catch(err => console.log("ERR for signing balances", err));
};



