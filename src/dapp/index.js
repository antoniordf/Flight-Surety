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
  let result = null;

  let contract = new Contract("localhost");

  await contract.initialize();

  let operationalStatus = await contract.isOperational();
  console.log(operationalStatus);
  display("Operational Status", "Check if contract is operational", [
    { label: "Operational Status", error: null, value: operationalStatus },
  ]);

  // Register as Passenger
  DOM.elid("register-passenger").addEventListener("click", async () => {
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
    }
  });

  // Submit to Oracle
  DOM.elid("submit-oracle").addEventListener("click", async () => {
    let flight = DOM.elid("flight-number").value;
    // Write transaction
    try {
      let result = await contract.fetchFlightStatus(flight);
      display("Oracles", "Trigger oracles", [
        {
          label: "Fetch Flight Status",
          error: null,
          value: result.flight + " " + result.timestamp,
        },
      ]);
    } catch (error) {
      console.error(error);
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
        } catch (error) {
          console.error(error);
        }

        // Register the airlines
        let registerAirlineResult;
        try {
          registerAirlineResult = await contract.registerAirline(
            flight.addressIndex
          );
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
        } catch (error) {
          console.error("Error generated while registering flight", error);
        }

        return { fundResult, registerAirlineResult, registerFlightResult };
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

    const buyButton = DOM.button(
      { className: "btn btn-primary" },
      "Buy Insurance"
    );

    // Disable button by default
    buyButton.disabled = true;

    buyButton.addEventListener("click", async () => {
      try {
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
      }
    });

    flightCard.appendChild(buyButton);

    DOM.elid("flight-card-container").appendChild(flightCard);
  });
})();

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
  DOM.elid("message-box").style.display = "block";
  DOM.elid("message-box").innerHTML = message;
}
