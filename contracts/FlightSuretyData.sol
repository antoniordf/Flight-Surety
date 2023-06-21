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
    uint airlineCounter = 0; // Counter to keep track of how many airlines were added.
    uint public voteDuration = 1 hours; // Set the vote duration (e.g., 1 hour)
    IFlightSuretyApp private flightSuretyApp; // Address of the FlightSuretyApp contract.
    mapping(address => bool) private authorizedCallers; // Tracks who is authorized to call this contract

    struct Passenger {
        address passengerAddress;
        uint256 credit;
        bool isRegistered;
    }
    mapping(address => Passenger) private passengers;

    struct Airline {
        address airlineAddress;
        bool isRegistered;
        bool hasFunded;
    }
    mapping(address => Airline) private airlines;

    struct Proposal {
        uint votes;
        uint timestamp;
        mapping(address => bool) voters;
    }
    mapping(bytes32 => Proposal) private proposals;

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
    constructor(address _firstAirline) {
        contractOwner = msg.sender;
        authorizeCaller(msg.sender);
        registerFirstAirline(_firstAirline);
    }

    // events
    event ProposalCreated(bytes32 indexed proposalId);
    event ProposalPassed(bytes32 indexed proposalId);
    event ProposalExpired(bytes32 indexed proposalId);
    event InsuranceBought(bytes32 indexed flightKey);
    event PassengerRegistered(address indexed passengerAddress);
    event AirlineRegistered(address indexed airline);
    event InsureesCredited(bytes32 indexed flightKey);
    event PaymentMade(bytes32 indexed flightKey, address indexed caller);
    event AccountFunded(address indexed caller);

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

    // Modifier to ensure that only FlightSuretyApp contract can call the function
    modifier isAuthorized() {
        require(
            authorizedCallers[msg.sender] == true,
            "Caller is not authorised to call this contract"
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

    /**
     * @dev Sets address for the App contract once that contract is deployed
     */
    function setAppContract(
        address _flightSuretyApp
    ) external requireContractOwner {
        flightSuretyApp = IFlightSuretyApp(_flightSuretyApp);
    }

    /**
     * @dev re-usable function to implement multi-party consensus voting
     */
    function vote(
        bytes32 _proposalId,
        address _voter
    ) internal requireIsOperational returns (bool) {
        Proposal storage proposal = proposals[_proposalId];
        require(
            !proposal.voters[_voter],
            "Caller has already voted on this proposal"
        );
        proposal.voters[_voter] = true;
        proposal.votes++;

        if (proposal.votes >= airlineCounter / 2) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * @dev function so that we can check if a passenger is registered from the app contract
     */
    function isRegisteredPassenger(
        address _passenger
    ) external view returns (bool) {
        return passengers[_passenger].isRegistered;
    }

    /**
     * @dev function so that we can check if an airline is registered from the app contract
     */
    function isRegisteredAirline(
        address _airline
    ) external view returns (bool) {
        return airlines[_airline].isRegistered;
    }

    function isPassenger(address _passenger) public view returns (bool) {
        if (passengers[_passenger].passengerAddress != address(0)) {
            return true;
        }
        return false;
    }

    /**
     * @dev function to add authorized callers of this contract
     */
    function authorizeCaller(address _caller) public requireContractOwner {
        authorizedCallers[_caller] = true;
    }

    /**
     * @dev internal function to add authorized callers of this contract.
     *      This can only be called from within the contract itself.
     */
    function internalAuthorizeCaller(address _caller) internal {
        authorizedCallers[_caller] = true;
    }

    /**
     * @dev function to remove an address from the authorized callers list
     */
    function deauthorizeCaller(address _caller) public requireContractOwner {
        delete authorizedCallers[_caller];
    }

    /**
     * @dev function to check if the address calling the contract is authorized
     */
    function isAuthorizedCaller() public view returns (bool) {
        return authorizedCallers[msg.sender];
    }

    function registerFirstAirline(address _airline) internal {
        airlines[_airline] = Airline({
            airlineAddress: _airline,
            isRegistered: true,
            hasFunded: false
        });
        airlineCounter++;
        internalAuthorizeCaller(_airline);
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add a passenger to the passengers mapping. This function is called by registerPassenger function in the App
     * contract, which in turn is called by the user in the client dapp.
     */
    function registerPassenger(
        address _passengerAddress
    ) external isAuthorized {
        passengers[_passengerAddress] = Passenger({
            passengerAddress: _passengerAddress,
            credit: 0,
            isRegistered: true
        });
        emit PassengerRegistered(_passengerAddress);
    }

    /**
     * @dev Add an airline to the registration queue
     *      Can only be called from FlightSuretyApp contract
     *      The function needs to be called once to create the proposal to add the airline, and then again after
     *      other airlines have voted and the threshold was reached.
     */
    function registerAirline(
        address _airline,
        address _caller
    )
        public
        requireIsOperational
        isAuthorized
        returns (bool success, uint256 votes)
    {
        require(
            airlines[_airline].airlineAddress == address(0),
            "Airline already exists"
        );
        require(
            airlines[_caller].hasFunded == true,
            "Caller has not funded account"
        );
        if (airlineCounter <= 4) {
            airlines[_airline] = Airline({
                airlineAddress: _airline,
                isRegistered: true,
                hasFunded: true
            });
            airlineCounter++;
            internalAuthorizeCaller(_airline);
            success = true;
            votes = 0; // No votes required if there are less than or equal to 4 airlines
            emit AirlineRegistered(_airline);
            return (success, votes);
        } else {
            require(
                airlines[_caller].isRegistered == true,
                "Caller is not an existing airline"
            );
            bytes32 proposalId = keccak256(
                abi.encodePacked("registerAirline", _airline)
            );
            Proposal storage proposal = proposals[proposalId];

            // Check if the proposal has expired
            if (
                proposal.timestamp != 0 &&
                (block.timestamp - proposal.timestamp) > voteDuration
            ) {
                emit ProposalExpired(proposalId);
                success = false;
                votes = proposal.votes;
                return (success, votes);
            }

            // If the proposal doesn't exist, create it
            if (proposal.timestamp == 0) {
                proposal.timestamp = block.timestamp;
                emit ProposalCreated(proposalId);
            }

            // Now we simply record the vote without checking for consensus here
            vote(proposalId, msg.sender);
            votes = proposal.votes;

            // Instead, we check for consensus here
            if (votes >= airlineCounter / 2) {
                airlines[_airline] = Airline({
                    airlineAddress: _airline,
                    isRegistered: true,
                    hasFunded: true
                });
                airlineCounter++;
                emit ProposalPassed(proposalId);
                internalAuthorizeCaller(_airline);
                success = true;
                emit AirlineRegistered(_airline);
                return (success, votes);
            } else {
                success = false; // Not enough votes yet
                return (success, votes);
            }
        }
    }

    /**
     * @dev Buy insurance for a flight
     *
     */
    function buy(
        bytes32 _flightKey,
        address _caller
    ) external payable isAuthorized {
        require(
            flightSuretyApp.isRegisteredFlight(_flightKey),
            "Flight not found!"
        );
        require(
            flightInsuranceAmounts[_flightKey][_caller] == 0,
            "You already bought insurance."
        );
        require(msg.value <= 1 ether, "You can only insure up to 1 ether");
        flightInsurees[_flightKey].push(_caller);
        flightInsuranceAmounts[_flightKey][_caller] = msg.value;
        emit InsuranceBought(_flightKey);
    }

    /**
     *  @dev Credits payouts to insurees. Credit is equal to 1.5 x the insurance amount bought.
     */
    function creditInsurees(bytes32 _flightKey) external isAuthorized {
        for (uint i = 0; i < flightInsurees[_flightKey].length; i++) {
            address passengerAddress = flightInsurees[_flightKey][i];
            passengers[passengerAddress].credit =
                (flightInsuranceAmounts[_flightKey][passengerAddress] * 3) /
                2;
        }
        emit InsureesCredited(_flightKey);
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
     */
    function pay(bytes32 _flightKey, address _caller) external isAuthorized {
        require(
            passengers[_caller].passengerAddress != address(0),
            "You are not a passenger."
        );
        require(
            flightSuretyApp.isRegisteredFlight(_flightKey),
            "Flight is not registered"
        );
        require(
            flightSuretyApp.isDelayedFlight(_flightKey),
            "This flight is not delayed"
        );
        uint totalCredit = passengers[_caller].credit;
        passengers[_caller].credit = 0;
        payable(_caller).transfer(totalCredit);
        emit PaymentMade(_flightKey, _caller);
    }

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */
    function fund(address _caller) external payable isAuthorized {
        require(msg.value >= 10 ether, "You should fund at least 10 ether");
        airlines[_caller].hasFunded = true;
        emit AccountFunded(_caller);
    }

    /**
     * @dev Helper function to get the flight key
     */
    function getFlightKey(
        address _airline,
        string memory _flight,
        uint256 _timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_airline, _flight, _timestamp));
    }

    /**
     * @dev Fallback function.
     *
     */
    fallback() external {
        revert("Something went wrong");
    }
}

interface IFlightSuretyApp {
    function isRegisteredFlight(
        bytes32 _flightKey
    ) external view returns (bool);

    function isDelayedFlight(bytes32 _flightKey) external view returns (bool);
}
