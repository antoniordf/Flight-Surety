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
      addressIndex: 1,
      flightNumber: "UAE145",
      timestamp: "06/16/2023 20:00:00 GMT",
    },
    {
      airline: "British Airways",
      addressIndex: 2,
      flightNumber: "BA1885",
      timestamp: "06/20/2023 10:00:00 GMT",
    },
    {
      airline: "KLM",
      addressIndex: 3,
      flightNumber: "KLM1775",
      timestamp: "06/23/2023 11:00:00 GMT",
    },
    {
      airline: "TAP",
      addressIndex: 4,
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
        const fundResult = await new Promise((resolve, reject) => {
          contract.fund(flight.addressIndex, (error, result) => {
            if (error) reject(error);
            else resolve(result);
          });
        });

        // Register the airlines
        const registerAirlineResult = await new Promise((resolve, reject) => {
          contract.registerAirline(flight.addressIndex, (error, result) => {
            if (error) reject(error);
            else resolve(result);
          });
        });

        // Register the flights
        const registerFlightResult = await new Promise((resolve, reject) => {
          contract.registerFlight(
            flight.addressIndex,
            flight.flightNumber,
            flight.timestamp,
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
        });

        return { fundResult, registerAirlineResult, registerFlightResult };
      })
    );
  } catch (error) {
    console.log(error);
  }

  // Hide spinner
  document.getElementById("spinner").style.display = "none";

  // Generate cards for each flight
  console.log(flights);
  flights.forEach((flight) => {
    console.log(flight);
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
