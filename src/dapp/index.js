import DOM from "./dom";
import Contract from "./contract";
import "./flightsurety.css";

(async () => {
  let result = null;

  let contract = new Contract("localhost");

  await contract.initialize();

  // Read transaction
  contract.isOperational((error, result) => {
    console.log(error, result);
    display("Operational Status", "Check if contract is operational", [
      { label: "Operational Status", error: error, value: result },
    ]);
  });

  // User-submitted transaction
  DOM.elid("submit-oracle").addEventListener("click", () => {
    let flight = DOM.elid("flight-number").value;
    // Write transaction
    contract.fetchFlightStatus(flight, (error, result) => {
      display("Oracles", "Trigger oracles", [
        {
          label: "Fetch Flight Status",
          error: error,
          value: result.flight + " " + result.timestamp,
        },
      ]);
    });
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
          console.log(fundResult);
        } catch (error) {
          console.error(error);
        }

        // Register the airlines
        console.log("I'll now try to register airlines");
        let registerAirlineResult;
        try {
          registerAirlineResult = await contract.registerAirline(
            flight.addressIndex
          );
          console.log("Result of registering airline", registerAirlineResult);
        } catch (error) {
          console.error("Error generated while registering airline", error);
        }

        // Register the flights
        console.log("I will now start to register flights");
        let registerFlightResult;
        try {
          registerFlightResult = await contract.registerFlight(
            flight.addressIndex,
            flight.flightNumber,
            flight.timestamp
          );
          console.log("Result of registering flight", registerFlightResult);
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

    buyButton.addEventListener("click", () => {
      // contract.buy(contract.getFlightKey(...));
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
