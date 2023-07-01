import DOM from "./dom";
import web3 from "./web3";
import Contract from "./contract";
import "./flightsurety.css";
import { displayStatusMessage, displayDate, createFlightKey } from "./utils.js";

const accounts = await window.ethereum.request({
  method: "eth_requestAccounts",
});
const account = accounts[0];

function registerEventListeners(contract) {
  // Register as Passenger
  DOM.elid("register-passenger").addEventListener("click", async (event) => {
    event.preventDefault();

    // Save current button state
    const button = event.target;
    const originalButtonHTML = button.innerHTML;

    // Show spinner
    DOM.showSpinner(button);
    button.disabled = true;

    try {
      await contract.registerPassenger(account);

      // Display result to user
      DOM.displayMessage("Passenger registered successfully!");

      // Once registered, enable all buy buttons
      const buyButtons = document.querySelectorAll(".btn-primary");
      buyButtons.forEach((button) => {
        button.disabled = false;
      });
    } catch (error) {
      console.error(error);
      DOM.displayMessage("Passenger registration failed!");
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
        DOM.display("Oracles", "Trigger oracles", [
          {
            label: "Fetch Flight Status",
            value: flight + " " + timestamp + " " + status,
          },
        ]);
      });

      // Listen for the CreditInsureesInfoReceived event
      contract.events.once("CreditInsureesInfoReceived", async () => {
        // Get the credit information
        const creditInsureesInfo = await contract.getCreditInsureesInfo();
        console.log("I am printing from index.js", creditInsureesInfo);

        // Retrieve credit information from the event
        const flightKey = creditInsureesInfo.returnValues.flightKey;

        // Find the flight card
        const flightCards = document.querySelectorAll(".card");

        flightCards.forEach((flightCard) => {
          const flightKeyCard = flightCard.dataset.flightKey;

          if (flightKey === flightKeyCard) {
            // Create "withdraw credit" button
            const withdrawButton = DOM.button(
              { className: "btn btn-warning" },
              "withdraw-credit"
            );

            // Click event listener
            withdrawButton.addEventListener("click", async (event) => {
              event.preventDefault();

              try {
                await contract.pay(flightKey, account);
                withdrawButton.disabled = true;
                DOM.displayMessage("A payment has been made to your wallet");
              } catch (error) {
                console.error(error);
              }
            });

            // Insert the "withdraw credit" button before the "buy insurance" button
            flightCard.insertBefore(withdrawButton, flightCard.lastChild);
          }
        });
      });
    } catch (error) {
      console.error(error);
      DOM.display("Oracles", "Trigger oracles", [
        {
          label: "An error has occurred",
          value: error.message,
        },
      ]);
    }
  });
}

(async () => {
  let contract = new Contract("localhost");

  await contract.initialize();

  // Check operational status
  let operationalStatus = await contract.isOperational();
  console.log(operationalStatus);
  DOM.display("Operational Status", "Check if contract is operational", [
    { label: "Operational Status", error: null, value: operationalStatus },
  ]);

  // Check if user is registered as a passenger
  const isRegistered = await contract.isRegisteredPassenger(account);

  // Register as passenger and submit to oracles event listeners
  registerEventListeners(contract);

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
    for (const flight of flights) {
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
    }
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
    const flightKey = createFlightKey(
      flight.airlineAddress,
      flight.flightNumber,
      timestampInSeconds
    );

    // Assign the flightKey as a data attribute of the card
    flightCard.dataset.flightKey = flightKey;

    // Create the buy button
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
      DOM.showSpinner(buyButton);
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
        DOM.displayMessage("Insurance purchased successfully!");
      } catch (error) {
        console.error(error);
        DOM.displayMessage("Insurance purchase failed!");

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
