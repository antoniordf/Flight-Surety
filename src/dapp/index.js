import DOM from "./dom";
import Contract from "./contract";
import "./flightsurety.css";
const Web3 = require("web3");
const web3 = new Web3(window.ethereum);

const accounts = await window.ethereum.request({
  method: "eth_requestAccounts",
});
const account = accounts[0];

(async () => {
  let contract = new Contract("localhost");

  await contract.initialize();

  // Check operational status
  let operationalStatus = await contract.isOperational();
  console.log(operationalStatus);
  display("Operational Status", "Check if contract is operational", [
    { label: "Operational Status", error: null, value: operationalStatus },
  ]);

  // Check if user is registered as a passenger
  const isRegistered = await contract.isRegisteredPassenger(account);

  // Register as Passenger
  DOM.elid("register-passenger").addEventListener("click", async (event) => {
    event.preventDefault();

    // Save current button state
    const button = event.target;
    const originalButtonHTML = button.innerHTML;

    // Show spinner
    button.innerHTML =
      '<img src="https://giphy.com/embed/3oEjI6SIIHBdRxXI40" width="20px" height="20px">';
    button.disabled = true;

    try {
      await contract.registerPassenger(account);

      // Display result to user
      displayMessage("Passenger registered successfully!");

      // Once registered, enable all buy buttons
      const buyButtons = document.querySelectorAll(".btn-primary");
      buyButtons.forEach((button) => {
        button.disabled = false;
      });
    } catch (error) {
      console.error(error);
      displayMessage("Passenger registration failed!");
    } finally {
      // Hide spinner and revert button state
      button.innerHTML = originalButtonHTML;
      button.disabled = false;
    }
  });

  // Submit to Oracle
  DOM.elid("submit-oracle").addEventListener("click", async (event) => {
    event.preventDefault();

    let flight = DOM.elid("flight-number").value;
    // Write transaction
    try {
      await contract.fetchFlightStatus(flight);

      // Wait for the FlightStatusInfo event
      contract.events.once("FlightStatusInfoReceived", async () => {
        // Update flight status
        const flightStatusInfo = await contract.getFlightStatusInfo();
        console.log("I am printing from index.js", flightStatusInfo);

        // Display updated information to browser
        let flight = flightStatusInfo.returnValues.flight;
        let timestamp = displayDate(flightStatusInfo.returnValues.timestamp);
        let status = displayStatusMessage(flightStatusInfo.returnValues.status);
        display("Oracles", "Trigger oracles", [
          {
            label: "Fetch Flight Status",
            value: flight + " " + timestamp + " " + status,
          },
        ]);
      });
    } catch (error) {
      console.error(error);
      display("Oracles", "Trigger oracles", [
        {
          label: "An error has occurred",
          value: error.message,
        },
      ]);
    }
  });

  // Flights
  const flights = [
    {
      airline: "Emirates",
      addressIndex: 0,
      flightNumber: "UAE145",
      timestamp: "06/16/2023 20:00:00 GMT",
    },
    {
      airline: "British Airways",
      addressIndex: 1,
      flightNumber: "BA1885",
      timestamp: "06/20/2023 10:00:00 GMT",
    },
    {
      airline: "KLM",
      addressIndex: 2,
      flightNumber: "KLM1775",
      timestamp: "06/23/2023 11:00:00 GMT",
    },
    {
      airline: "TAP",
      addressIndex: 3,
      flightNumber: "TAP1995",
      timestamp: "06/18/2023 09:00:00 GMT",
    },
  ];

  // Adding the airline addresses to the flight objects in the above array
  flights.forEach((flight) => {
    flight.airlineAddress = contract.airlines[flight.addressIndex];
  });

  // Show spinner
  document.getElementById("spinner").style.display = "block";

  // For each flight, I fund the contract, register the airline and register the flight
  try {
    await Promise.all(
      flights.map(async (flight) => {
        // Get airlines to fund contract.
        let fundResult;
        try {
          fundResult = await contract.fund(flight.addressIndex);
          console.log("I have funded the airline", fundResult);
        } catch (error) {
          console.error(error);
        }

        // Register the airlines
        let registerAirlineResult;
        try {
          registerAirlineResult = await contract.registerAirline(
            flight.addressIndex
          );
          console.log("I have registered the airline", registerAirlineResult);
        } catch (error) {
          console.error("Error generated while registering airline", error);
        }

        // Register the flights
        let registerFlightResult;
        try {
          registerFlightResult = await contract.registerFlight(
            flight.addressIndex,
            flight.flightNumber,
            flight.timestamp
          );
          console.log("I have registered the flight", registerFlightResult);
        } catch (error) {
          console.error("Error generated while registering flight", error);
        }
      })
    );
  } catch (error) {
    console.log(error);
  }

  // Hide spinner
  document.getElementById("spinner").style.display = "none";

  // Generate cards for each flight
  flights.forEach((flight) => {
    const flightCard = DOM.div({ className: "card" });
    const flightInfo = DOM.div({ className: "flight" });

    flightInfo.appendChild(DOM.p({}, flight.airline));
    flightInfo.appendChild(DOM.p({}, flight.flightNumber));

    flightCard.appendChild(flightInfo);

    // Converting the timestamp to Unix format
    let timestampInSeconds = Math.floor(
      new Date(flight.timestamp).getTime() / 1000
    );

    // Create flightKey in the same way as the contract does
    let flightKey = web3.utils.soliditySha3(
      { t: "address", v: flight.airlineAddress }, // assuming flight.airlineAddress is available
      { t: "string", v: flight.flightNumber },
      { t: "uint256", v: timestampInSeconds } // ensure this timestamp is in the right format
    );

    const buyButton = DOM.button(
      { className: "btn btn-primary" },
      "Buy Insurance"
    );

    // Disable button by default
    buyButton.disabled = true;

    buyButton.addEventListener("click", async (event) => {
      event.preventDefault();

      // Save current button state and show spinner
      const originalButtonHTML = buyButton.innerHTML;
      buyButton.innerHTML =
        '<img src="https://giphy.com/embed/3oEjI6SIIHBdRxXI40" width="20px" height="20px">';
      buyButton.disabled = true;

      try {
        // Prompt the user for the value of the insurance they want to purchase
        let valueInEth = prompt(
          "Enter the amount of insurance you want to purchase (in ETH):"
        );
        let valueInWei = web3.utils.toWei(valueInEth, "ether");

        // Purchase the insurance
        await contract.buy(flightKey, account, valueInWei);

        // inform the user of insurance purchase
        buyButton.style.backgroundColor = "green";
        buyButton.innerText = "Purchased";
        displayMessage("Insurance purchased successfully!");
      } catch (error) {
        console.error(error);
        displayMessage("Insurance purchase failed!");

        // Hide spinner and revert button state
        buyButton.innerHTML = originalButtonHTML;
        buyButton.disabled = false;
      }
    });

    flightCard.appendChild(buyButton);

    DOM.elid("flight-card-container").appendChild(flightCard);

    // If user is registered, enable all buy buttons
    if (isRegistered) {
      const buyButtons = document.querySelectorAll(".btn-primary");
      buyButtons.forEach((button) => {
        button.disabled = false;
      });
    }
  });
})();

//******************************************************************************
//                             HELPER FUNCTIONS
//******************************************************************************

function display(title, description, results) {
  let displayDiv = DOM.elid("display-wrapper");
  let section = DOM.section();
  section.appendChild(DOM.h2(title));
  section.appendChild(DOM.h5(description));
  results.map((result) => {
    let row = section.appendChild(DOM.div({ className: "row" }));
    row.appendChild(DOM.div({ className: "col-sm-4 field" }, result.label));
    row.appendChild(
      DOM.div(
        { className: "col-sm-8 field-value" },
        result.error ? String(result.error) : String(result.value)
      )
    );
    section.appendChild(row);
  });
  displayDiv.append(section);
}

function displayMessage(message) {
  const messageBox = DOM.elid("message-box");
  messageBox.style.display = "block";
  messageBox.innerHTML = message;
  setTimeout(() => {
    messageBox.style.display = "none";
  }, 3000); // Hide the message box after 3 seconds
}

function displayStatusMessage(statusCode) {
  const statusCodes = {
    0: "STATUS_CODE_UNKNOWN",
    10: "ON TIME",
    20: "AIRLINE DELAYED",
    30: "DELAYED DUE TO WEATHER",
    40: "DELAYED DUE TO TECHNICAL ISSUES",
    50: "DELAYED DUE TO OTHER",
  };

  return statusCodes[statusCode];
}

function displayDate(timestamp) {
  let date = new Date(timestamp * 1000);

  let day = date.getDate();
  let month = date.getMonth() + 1; // Javascript months are 0-based indexing
  let year = date.getFullYear();

  // Getting the hours and minutes
  let hours = date.getHours();
  let minutes = date.getMinutes();

  // Ensure leading zero if day or month or hours or minutes is less than 10
  day = day < 10 ? "0" + day : day;
  month = month < 10 ? "0" + month : month;
  hours = hours < 10 ? "0" + hours : hours;
  minutes = minutes < 10 ? "0" + minutes : minutes;

  let formattedTime =
    day + "/" + month + "/" + year + " " + hours + ":" + minutes;

  return formattedTime;
}
