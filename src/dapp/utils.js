import web3 from "./web3";

//******************************************************************************
//                             HELPER FUNCTIONS
//******************************************************************************

export function displayStatusMessage(statusCode) {
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

export function displayDate(timestamp) {
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

export function createFlightKey(airlineAddress, flightNumber, timestamp) {
  let flightKey = web3.utils.soliditySha3(
    { t: "address", v: airlineAddress }, // assuming flight.airlineAddress is available
    { t: "string", v: flightNumber },
    { t: "uint256", v: timestamp } // ensure this timestamp is in the right format
  );
  return flightKey;
}

// Converting the timestamp to Unix format
export function unixTimestamp(timestamp) {
  return Math.floor(new Date(timestamp).getTime() / 1000);
}
