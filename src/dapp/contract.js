import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
import FlightSuretyData from "../../build/contracts/FlightSuretyData.json";
import Config from "./config.json";
import Web3 from "web3";

export default class Contract {
  constructor(network) {
    let config = Config[network];
    this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
    this.flightSuretyApp = new this.web3.eth.Contract(
      FlightSuretyApp.abi,
      config.appAddress
    );
    this.flightSuretyData = new this.web3.eth.Contract(
      FlightSuretyData.abi,
      config.dataAddress
    );

    this.owner = null;
    this.airlines = [];
    this.passengers = [];
  }

  async initialize() {
    try {
      const accts = await this.web3.eth.getAccounts();
      this.owner = accts[0];

      let counter = 1;

      while (this.airlines.length < 5) {
        this.airlines.push(accts[counter++]);
      }

      while (this.passengers.length < 5) {
        this.passengers.push(accts[counter++]);
      }
    } catch (error) {
      console.error("Failed to initialize:", error);
    }
  }

  async isOperational(callback) {
    let self = this;
    const result = await self.flightSuretyApp.methods
      .isOperational()
      .call({ from: self.owner });
    callback(null, result);
  }

  async fetchFlightStatus(flight, callback) {
    let self = this;
    let payload = {
      airline: self.airlines[0],
      flight: flight,
      timestamp: Math.floor(Date.now() / 1000),
    };
    try {
      const result = await self.flightSuretyApp.methods
        .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
        .send({ from: self.owner });
      callback(null, result);
    } catch (error) {
      callback(error, null);
    }
  }

  async registerFlight(addressIndex, flightNumber, timestamp, callback) {
    let self = this;
    const registered = await self.flightSuretyData.methods
      .isRegisteredAirline(self.airlines[addressIndex])
      .call({ from: self.owner });

    let payload = {
      airline: self.airlines[addressIndex],
      flight: flightNumber,
      timestamp: timestamp,
    };

    if (registered) {
      try {
        const result = await self.flightSuretyApp.methods
          .registerFlight(payload.flight, payload.timestamp)
          .send({ from: self.airlines[addressIndex] });
        callback(null, result);
      } catch (err) {
        callback(err, null);
      }
    } else {
      console.log("The account is not a registered airline");
    }
  }
}
