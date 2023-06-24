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

async function registerOracles() {
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
}

(async () => {
  // Register oracles when server starts
  await registerOracles();
})();

flightSuretyApp.events.OracleRequest(
  {
    fromBlock: 0,
  },
  function (error, event) {
    if (error) console.log(error);
    console.log(event);

    // Retrieve index and flight information from the event
    const index = event.returnValues.index;
    const airline = event.returnValues.airline;
    const flight = event.returnValues.flight;
    const timestamp = event.returnValues.timestamp;

    // Generate a random status code for the flight
    const statusCode = generateRandomStatus();

    // Process the oracle responses
    processOracleResponse(index, airline, flight, timestamp, statusCode);
  }
);

async function processOracleResponse(
  index,
  airline,
  flight,
  timestamp,
  statusCode
) {
  try {
    // Get registered oracle addresses
    const oracleAddresses = await flightSuretyApp.methods
      .getRegisteredOracles()
      .call();

    // Loop through each registered oracle
    for (let oracleAddress of oracleAddresses) {
      // Get the indexes of the oracle
      const oracleIndexes = await flightSuretyApp.methods
        .getMyIndexes()
        .call({ from: oracleAddress });

      for (let i = 0; i < oracleIndexes.length; i++) {
        const oracleIndex = oracleIndexes[i];

        // Check if oracle is eligible to respond
        const oracleResponses = await flightSuretyApp.methods
          .getOracleResponse(oracleIndex, flight, timestamp, statusCode)
          .call();
        const isEligible = oracleResponses.length > 0;

        if (isEligible) {
          // Submit oracle response
          await flightSuretyApp.methods
            .submitOracleResponse(index, airline, flight, timestamp, statusCode)
            .send({ from: oracleAddress });
        }
      }
    }
  } catch (error) {
    console.error(error);
  }
}

function generateRandomStatus() {
  const statusCodes = [0, 10, 20, 30, 40, 50];
  const randomIndex = Math.floor(Math.random() * statusCodes.length);
  return statusCodes[randomIndex];
}

const app = express();
app.get("/api", (req, res) => {
  res.send({
    message: "An API for use with your Dapp!",
  });
});

// const port = 3000;
// app.listen(port, () => console.log(`Listening on port ${port}`));

export default app;
