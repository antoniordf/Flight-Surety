import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
import Config from "./config.json";
import Web3 from "web3";
import express from "express";

let config = Config["localhost"];
let web3 = new Web3(
  new Web3.providers.WebsocketProvider(config.url.replace("http", "ws"))
);
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(
  FlightSuretyApp.abi,
  config.appAddress
);

// Get a list of available accounts
const accounts = await web3.eth.getAccounts();

// Available accounts that can be used
const availableAccounts = [6, 7, 8];

(async () => {
  try {
    // Retrieving registration fee from contract
    const registrationFee = await flightSuretyApp.methods
      .REGISTRATION_FEE()
      .call();

    // Registering Oracles
    const promises = availableAccounts.map(async (accountIndex) => {
      const oracleAddress = accounts[accountIndex];
      await flightSuretyApp.methods.registerOracle().send({
        from: oracleAddress,
        value: registrationFee,
        gas: 200000,
      });
    });

    await Promise.all(promises);
  } catch (error) {
    console.error(error);
  }
})();

flightSuretyApp.events.OracleRequest(
  {
    fromBlock: 0,
  },
  function (error, event) {
    if (error) console.log(error);
    console.log(event);
  }
);

const app = express();
app.get("/api", (req, res) => {
  res.send({
    message: "An API for use with your Dapp!",
  });
});

// const port = 3000;
// app.listen(port, () => console.log(`Listening on port ${port}`));

export default app;
