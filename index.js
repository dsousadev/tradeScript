require("dotenv").load();
const axios = require("axios");
const gemini = require("./exchanges/gemini");
const gdax = require("./exchanges/gdax");
const poloniex = require("./exchanges/poloniex");
let cryptoSocket = require("crypto-socket");
let flag = true;
let threshold = .01; 

// Starts socket connections
cryptoSocket = require("crypto-socket");
cryptoSocket.start("gemini");
cryptoSocket.start("gdax");

// Uncomment to view streaming price data
// setInterval(()=>{console.lsog(cryptoSocket.Exchanges)}, 200);

const loopConditional = (exchange, currency) => {
  flag = true;
  while (flag) {
    checkArbitrage(exchange, currency);
  }
};

const checkArbitrage = (exchange, currency) => {
  let btcSpread = cryptoSocket.Exchanges[exchange.withdrawExchange.name].BTCUSD - cryptoSocket.Exchanges[exchange.name].BTCUSD;
  let ethSpread = cryptoSocket.Exchanges[exchange.withdrawExchange.name].ETHUSD - cryptoSocket.Exchanges[exchange.name].ETHUSD;
  let functions = {
    btc: () => {
      // Price to buy ETH with all BTC is 1 ETH converted to BTC + 10 cents in BTC
      var price = (cryptoSocket.Exchanges[exchange].ETHBTC + 0.10 / cryptoSocket.Exchanges[exchange].BTCUSD).toFixed(5);
      setTimeout(() => exchange.buy("eth", price), 0);
    },
    eth: () => {
      // Price to sell all ETH for BTC is 1 ETH converted to BTC - 10 cents in BTC
      var price = (cryptoSocket.Exchanges[exchange].ETHBTC - 0.10 / cryptoSocket.Exchanges[exchange].BTCUSD).toFixed(5);
      setTimeout(() => {() => exchange.buy("btc", price)}, 0);
    }
  }
  
  if (btcSpread > 10 && btcSpread > ethSpread ) {
    flag = false;
    if (currency === "btc") {
      setTimeout(() => exchange.withdraw(currency, exchange.withdrawExchange, (cryptoSocket.Exchanges[exchange.withdrawExchange.name].ETHBTC + 0.10 / cryptoSocket.Exchanges[exchange.withdrawExchange.name].BTCUSD).toFixed(5)), 0);
    } else {
      functions[currency]();
    }
  } else if (ethSpread > 10) {
    flag = false;
    if (currency === 'eth') {
      setTimeout(() => exchange.withdraw(currency, exchange.withdrawExchange, (cryptoSocket.Exchanges[exchange.withdrawExchange.name].ETHBTC - 0.10 / cryptoSocket.Exchanges[exchange.withdrawExchange.name].BTCUSD).toFixed(5)), 0);
    } else {
      functions[currency]();
    }
  }
};

// Kicks off the arbitration check
setTimeout(() => { gdax.balanceCheckLoop("btc") }, 30000);
 