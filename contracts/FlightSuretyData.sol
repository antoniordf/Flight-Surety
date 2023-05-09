// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

// import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    // using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner; // Account used to deploy contract
    bool private operational = true; // Blocks all state changes throughout the contract if false
    uint256 airlineCounter = 0; // Counter to keep track of how many airlines were added.

    struct Passenger {
        address passengerAddress;
        uint256 credit;
    }
    mapping(address => Passenger) private passengers;

    struct Airline {
        address airlineAddress;
        bool isRegistered;
        bool hasFunded;
    }
    mapping(address => Airline) private airlines;

    // Mapping flightKey to the list of passengers who bought insurance for that flight
    mapping(bytes32 => address[]) private flightInsurees;

    // Mapping flightKey and passenger to the amount they insured for that flight
    mapping(bytes32 => mapping(address => uint256))
        private flightInsuranceAmounts;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Constructor
     *      The deploying account becomes contractOwner
     */
    constructor() {
        contractOwner = msg.sender;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
     * @dev Modifier that requires the "operational" boolean variable to be "true"
     *      This is used on all state changing functions to pause the contract in
     *      the event there is an issue that needs to be fixed
     */
    modifier requireIsOperational() {
        require(operational, "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /**
     * @dev Modifier that requires the function caller to be an existing airline
     */
    modifier requireExistingAirline(address _caller) {
        require(
            airlines[_caller].airlineAddress != address(0),
            "Caller is not an existing airline"
        );
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Get operating status of contract
     *
     * @return A bool that is the current operating status
     */
    function isOperational() public view returns (bool) {
        return operational;
    }

    /**
     * @dev Sets contract operations on/off
     *
     * When operational mode is disabled, all write transactions except for this one will fail
     */
    function setOperatingStatus(bool mode) external requireContractOwner {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *      Can only be called from FlightSuretyApp contract
     *
     */
    function registerAirline(
        address airline
    ) external requireIsOperational requireExistingAirline(msg.sender) {
        require(
            airlines[airline].airlineAddress == address(0),
            "Airline already exists"
        );
        airlines[airline] = Airline({
            airlineAddress: airline,
            isRegistered: true,
            hasFunded: false
        });
        airlineCounter++;
    }

    /**
     * @dev Buy insurance for a flight
     *
     */
    function buy() external payable {}

    /**
     *  @dev Credits payouts to insurees
     */
    function creditInsurees() external pure {}

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
     */
    function pay() external pure {}

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */
    function fund() public payable {}

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
     * @dev Fallback function for funding smart contract.
     *
     */
    receive() external payable {
        fund();
    }
}
