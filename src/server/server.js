import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
import FlightSuretyData from "../../build/contracts/FlightSuretyData.json";
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

let flightSuretyData = new web3.eth.Contract(
  FlightSuretyData.abi,
  config.dataAddress
);

// Get a list of available accounts
const accounts = await web3.eth.getAccounts();

// Available accounts that can be used
const oracles = accounts.slice(0, 20);

//******************************************************************************
//                           ORACLE REGISTRATION
//******************************************************************************

async function registerOracles() {
  try {
    // Retrieving registration fee from contract
    const registrationFee = await flightSuretyApp.methods
      .REGISTRATION_FEE()
      .call();
    console.log("Here is the registration fee", registrationFee);

    // Registering Oracles
    const promises = oracles.map(async (account) => {
      console.log("Here is the oracle address", account);
      const result = await flightSuretyApp.methods.registerOracle().send({
        from: account,
        value: registrationFee,
        gas: 200000,
      });
      console.log("Here is the result of registering the Oracle", result);
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

//******************************************************************************
//                             EVENT LISTENERS
//******************************************************************************

flightSuretyApp.events.OracleRequest(
  {
    fromBlock: 0,
  },
  (error, event) => {
    if (error) console.log(error);
    console.log(event);

    // Retrieve index and flight information from the event
    const index = event.returnValues.index;
    console.log("Here is the index", index);
    const airline = event.returnValues.airline;
    console.log("Here is the airline", airline);
    const flight = event.returnValues.flight;
    console.log("Here is the flight", flight);
    const timestamp = event.returnValues.timestamp;
    console.log("Here is the timestamp", timestamp);

    // Generate a random status code for the flight
    const statusCode = generateRandomStatus();
    console.log("Here is the status code", statusCode);

    // Process the oracle responses
    console.log("I'm about to call processOracleResponse");
    processOracleResponse(index, airline, flight, timestamp, statusCode);
  }
);

flightSuretyData.events.InsuranceBought(
  {
    fromBlock: 0,
  },
  (error, event) => {
    if (error) console.log(error);
    console.log(event);
  }
);

flightSuretyData.events.InsureesCredited(
  {
    fromBlock: 0,
  },
  (error, event) => {
    if (error) console.log(error);
    console.log(event);
  }
);

//******************************************************************************
//                             HELPER FUNCTIONS
//******************************************************************************

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
    console.log("Here are the oracle addresses", oracleAddresses);

    // Loop through each registered oracle
    for (let oracleAddress of oracleAddresses) {
      // Get the indexes of the oracle
      console.log("Before getMyIndexes");
      let oracleIndexes = await flightSuretyApp.methods
        .getMyIndexes()
        .call({ from: oracleAddress });
      oracleIndexes = oracleIndexes.map((index) => parseInt(index));
      console.log("Here are the oracle indexes", oracleIndexes);

      // Check if the oracle is eligible to respond
      const isEligible = oracleIndexes.includes(parseInt(index));
      console.log("isEligible", isEligible);

      if (isEligible) {
        // Submit oracle response
        const result = await flightSuretyApp.methods
          .submitOracleResponse(index, airline, flight, timestamp, statusCode)
          .send({ from: oracleAddress, gas: 200000 });

        console.log(
          "Here is the result of calling submitOracleResponse",
          result
        );
      }
    }
  } catch (error) {
    console.error(error);
  }
}

function generateRandomStatus() {
  const statusCodes = [0, 10, 20, 30, 40, 50];
  const randomIndex = Math.floor(Math.random() * statusCodes.length);
  return 20; // statusCodes[randomIndex];
}

//******************************************************************************
//                                   APP
//******************************************************************************

const app = express();
app.get("/api", (req, res) => {
  res.send({
    message: "An API for use with your Dapp!",
  });
});

// const port = 3000;
// app.listen(port, () => console.log(`Listening on port ${port}`));

export default app;
