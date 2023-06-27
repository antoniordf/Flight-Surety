import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
import FlightSuretyData from "../../build/contracts/FlightSuretyData.json";
import Config from "./config.json";
import Web3 from "web3";
import { EventEmitter } from "events";

export default class Contract {
  constructor(network) {
    let config = Config[network];
    this.web3 = new Web3(
      new Web3.providers.WebsocketProvider(config.url.replace("http", "ws"))
    );

    // Keeps track of the latest information returned from the event emitted by the contract.
    this.flightStatusInfo = null;

    // Creates a new instance of event emitter.
    this.events = new EventEmitter();

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

      // Start listening for FlightStatusInfo events
      this.listenToFlightStatusInfoEvent((err, event) => {
        if (err) {
          console.error("Error in FlightStatusInfo event: ", err);
          return;
        }
        console.log("Received a FlightStatusInfo event: ", event);
      });
    } catch (error) {
      console.error("Failed to initialize:", error);
    }
  }

  async isOperational() {
    let self = this;
    try {
      const result = await self.flightSuretyApp.methods
        .isOperational()
        .call({ from: self.owner });
      return result;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async fetchFlightStatus(flight) {
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
      return result;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async fund(addressIndex) {
    let self = this;
    try {
      const result = await self.flightSuretyApp.methods.fund().send({
        value: self.web3.utils.toWei("10", "ether"), // Convert to Wei
        from: self.airlines[addressIndex],
      });
      return result;
    } catch (error) {
      throw error;
    }
  }

  async registerPassenger(passengerAddress) {
    let self = this;
    try {
      const result = await self.flightSuretyApp.methods
        .registerPassenger(passengerAddress)
        .send({ from: passengerAddress, gas: 200000 });
      return result;
    } catch (error) {
      throw error;
    }
  }

  async registerAirline(addressIndex) {
    let self = this;
    try {
      const registered = await self.flightSuretyData.methods
        .isRegisteredAirline(self.airlines[addressIndex])
        .call({ from: self.airlines[addressIndex] });

      if (registered) {
        return;
      } else {
        const result = await self.flightSuretyApp.methods
          .registerAirline(self.airlines[addressIndex])
          .send({ from: self.airlines[0], gas: 200000 });
        return result;
      }
    } catch (error) {
      throw error;
    }
  }

  async registerFlight(addressIndex, flightNumber, timestamp) {
    let self = this;
    try {
      const registered = await self.flightSuretyData.methods
        .isRegisteredAirline(self.airlines[addressIndex])
        .call({ from: self.airlines[addressIndex] });

      let payload = {
        airline: self.airlines[addressIndex],
        flight: flightNumber,
        timestamp: convertTimestamp(timestamp),
      };

      if (registered) {
        const result = await self.flightSuretyApp.methods
          .registerFlight(payload.flight, payload.timestamp)
          .send({ from: self.airlines[addressIndex], gas: 200000 });
        return result;
      } else {
        console.log("The account is not a registered airline");
      }
    } catch (error) {
      throw error;
    }
  }

  async buy(flightKey, account, value) {
    let self = this;
    try {
      const result = await self.flightSuretyApp.methods
        .buy(flightKey)
        .send({ from: account, value: value, gas: 200000 });
      return result;
    } catch (error) {
      throw error;
    }
  }

  async isRegisteredPassenger(account) {
    let self = this;
    try {
      const result = await self.flightSuretyApp.methods
        .checkPassengerRegistered(account)
        .call();
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Event listener for updated flight details emitted by contract.
  listenToFlightStatusInfoEvent(callback) {
    this.flightSuretyApp.events
      .FlightStatusInfo({
        fromBlock: 0,
      })
      .on("data", (event) => {
        this.flightStatusInfo = event;
        this.events.emit("FlightStatusInfoReceived", event);
      })
      .on("changed", (event) => {
        this.flightStatusInfo = event;
        this.events.emit("FlightStatusInfoReceived", event);
      })
      .on("error", callback);
  }

  // getter method to retrieve flight status info.
  getFlightStatusInfo() {
    return this.flightStatusInfo;
  }
}

//******************************************************************************
//                             HELPER FUNCTIONS
//******************************************************************************

function convertTimestamp(timestamp) {
  const convertedTimestamp = new Date(timestamp);
  const unixTimestamp = Math.floor(convertedTimestamp.getTime() / 1000);
  return unixTimestamp;
}
