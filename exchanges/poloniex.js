require("dotenv").load();
const Poloniex = require("poloniex.js");
const axios = require("axios");
const poloniex = new Poloniex(process.env.POLO_PUB, process.env.POLO_PRIV);

module.exports.btcAddress = "1Mq2vRnyWnsL2DMKbeDsYbbv3npKHCxiVK";
module.exports.ethAddress = "0xc9d1d6bdfc14837ab576e24a7fcba6e624768583";

module.exports.requestBalances = () => {
  return new Promise((resolve, reject) => {
    poloniex.returnBalances((err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

module.exports.buy = (currency, price) => {
  currency = currency.toUpperCase();
  module.exports.requestBalances().then(balancesObj => {
    const pairs = {
      ETH: {
        buy: () =>
          poloniex.buy("BTC", currency, price, balancesObj.BTC / price, (err, data) => {
              if (err) {
                console.log(err);
              } else {
                console.log(data);
              }
            })
      },
      BTC: {
        buy: () => poloniex.sell(currency, "ETH", price, balancesObj.ETH, (err, data) => {
              if (err) {
                console.log(err);
              } else {
                console.log(data);
              }
            })
      }
    };
    pairs[currency].buy();
  });
};

module.exports.withdraw = (currency, exchange) => {
  currency = currency.toUpperCase();
  module.exports.requestBalances().then(balancesObj => {
    poloniex.withdraw(currency, balancesObj[currency], exchange[currency.toLowerCase() + "Address"], (err, data) => {
        if (err) {
          console.log(err);
        } else {
          console.log(data);
        }
      });
  });
};
