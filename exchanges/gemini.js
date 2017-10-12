require("dotenv").load();
const gemPub = process.env.GEMINI_PUB;
const gemPriv = process.env.GEMINI_PRIV;
const btoa = require("btoa");
const createHmac = require("create-hmac");
const n = require("nonce")();
const axios = require("axios");
const gdax = require("./gdax");
let flag = true;

module.exports.btcAddress = "15bejgpogRqDKLBDkesaJQCscZ2RvYKotC";
module.exports.ethAddress = "0xB75E1A4bA6CE337696812f7c3D941680B86C3F7F";
module.exports.name = "gemini";
module.exports.withdrawExchange = gdax;

module.exports.signRequest = request => {
  let base = btoa(JSON.stringify(request));
  let hmac = createHmac("sha384", gemPriv);
  hmac.update(base);
  let signature = hmac.digest("hex");
  return { base, signature };
};

module.exports.requestBalances = () => {
  let balanceRequest = module.exports.signRequest({
    request: "/v1/balances",
    nonce: n()
  });

  let config = {
    headers: {
      "Content-Type": "text/plain",
      "Content-Length": 0,
      "X-GEMINI-APIKEY": gemPub,
      "X-GEMINI-PAYLOAD": balanceRequest.base,
      "X-GEMINI-SIGNATURE": balanceRequest.signature
    }
  };

  return axios.post("https://api.gemini.com/v1/balances", "", config);
};

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
            if(Number(balanceArray.data[0].available)){
              //console.log(balanceArray.data[0]);
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


module.exports.buy = (currency, price, isDone) => {
  module.exports
    .requestBalances()
    .then(balanceArray => {
      if (currency === "eth") {
        // Buy as much ETH we can afford with our full BTC balance
        var amount = balanceArray.data[0].available / price;
        var side = "buy";
      } else {
        // Sell complete ETH balance for BTC
        var amount = balanceArray.data[2].available;
        var side = "sell";
      }
      let order = module.exports.signRequest({
        request: "/v1/order/new",
        nonce: n(),
        client_order_id: "uniqueID",
        symbol: "ethbtc",
        amount,
        price,
        side,
        type: "exchange limit"
      });

      let config = {
        headers: {
          "Content-Type": "text/plain",
          "Content-Length": 0,
          "X-GEMINI-APIKEY": gemPub,
          "X-GEMINI-PAYLOAD": order.base,
          "X-GEMINI-SIGNATURE": order.signature
        }
      };

      axios
        .post("https://api.gemini.com/v1/order/new", "", config)
        .then(res => {
          console.log(res);
          if (!isDone) {
            module.exports.balanceCheckLoop(currency, () => {
              module.exports.withdraw(currency, module.exports.withdrawExchange, )
            });
          } else {

          }
        })
        .catch(err => console.log(err));
    })
    .catch(err => console.log(err));
};

module.exports.withdraw = (currency, exchange, price) => {
  module.exports
    .requestBalances()
    .then(balanceArray => {
      if (currency === "eth") {
        var amount = balanceArray.data[0].available;
        var exchangeCurrency = "btc";
      }
      if (currency === "btc") {
        var amount = balanceArray.data[2].available;
        var exchangeCurrency = "eth";
      }

      let withdrawRequest = signRequest({
        request: "/v1/withdraw/" + currency,
        nonce: n(),
        address: exchange[currency + "Address"],
        amount
      });

      let config = {
        headers: {
          "Content-Type": "text/plain",
          "Content-Length": 0,
          "X-GEMINI-APIKEY": gemPub,
          "X-GEMINI-PAYLOAD": withdrawRequest.base,
          "X-GEMINI-SIGNATURE": withdrawRequest.signature
        }
      };

      axios
        .post("https://api.gemini.com/v1/withdraw/" + currency, "", config)
        .then(res => {
          //console.log(res);
          exchange.balanceCheckLoop(currency, () => { exchange.buy(exchangeCurrency, price) });
        });
    })
    .catch(err => console.log(err));
};
