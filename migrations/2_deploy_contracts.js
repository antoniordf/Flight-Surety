const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const fs = require("fs");

module.exports = async function (deployer, network, accounts) {
  let firstAirline = accounts[1]; // replace with the actual address if you're not using the local network

  // deploy FlightSuretyData first with an empty address
  await deployer.deploy(FlightSuretyData);
  let flightSuretyData = await FlightSuretyData.deployed();

  // then deploy FlightSuretyApp
  await deployer.deploy(
    FlightSuretyApp,
    flightSuretyData.address,
    firstAirline
  );
  let flightSuretyApp = await FlightSuretyApp.deployed();

  // set FlightSuretyApp address in FlightSuretyData
  await flightSuretyData.setAppContract(flightSuretyApp.address);

  let config = {
    localhost: {
      url: "http://localhost:8545",
      dataAddress: flightSuretyData.address,
      appAddress: flightSuretyApp.address,
    },
  };

  fs.writeFileSync(
    __dirname + "/../src/dapp/config.json",
    JSON.stringify(config, null, "\t"),
    "utf-8"
  );

  fs.writeFileSync(
    __dirname + "/../src/server/config.json",
    JSON.stringify(config, null, "\t"),
    "utf-8"
  );
};
