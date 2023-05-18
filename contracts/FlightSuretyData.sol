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
    constructor(address _flightSuretyApp) {
        contractOwner = msg.sender;
        flightSuretyApp = IFlightSuretyApp(_flightSuretyApp);
    }

    // events
    event ProposalCreated(bytes32 indexed proposalId);
    event ProposalPassed(bytes32 indexed proposalId);
    event ProposalExpired(bytes32 indexed proposalId);
    event InsuranceBought(bytes32 indexed flightKey);

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
            airlines[_caller].isRegistered == true,
            "Caller is not an existing airline"
        );
        _;
    }

    // Modifier to ensure that only FlightSuretyApp contract can call the function
    modifier onlyFlightSuretyApp() {
        require(
            msg.sender == address(flightSuretyApp),
            "Caller is not the FlightSuretyApp contract"
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
        bytes32 proposalId,
        address voter
    )
        public
        requireIsOperational
        requireExistingAirline(msg.sender)
        returns (bool)
    {
        Proposal storage proposal = proposals[proposalId];
        require(
            !proposal.voters[voter],
            "Caller has already voted on this proposal"
        );
        proposal.voters[voter] = true;
        proposal.votes++;

        if (proposal.votes >= airlineCounter / 2) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * @dev function so that we can check if an airline is registered from the app contract
     */
    function isRegisterredAirline(
        address _airline
    ) external view returns (bool) {
        return airlines[_airline].isRegistered;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *      Can only be called from FlightSuretyApp contract
     *      The function needs to be called once to create the proposal to add the airline, and then again after
     *      other airlines have voted and the threshold was reached.
     */
    function registerAirline(
        address airline
    )
        external
        requireIsOperational
        onlyFlightSuretyApp
        requireExistingAirline(msg.sender)
        returns (bool success, uint256 votes)
    {
        require(
            airlines[airline].airlineAddress == address(0),
            "Airline already exists"
        );
        if (airlineCounter <= 4) {
            airlines[airline] = Airline({
                airlineAddress: airline,
                isRegistered: true,
                hasFunded: false
            });
            airlineCounter++;
            success = true;
            votes = 0; // No votes required if there are less than or equal to 4 airlines
            return (success, votes);
        } else {
            bytes32 proposalId = keccak256(
                abi.encodePacked("registerAirline", airline)
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
                airlines[airline] = Airline({
                    airlineAddress: airline,
                    isRegistered: true,
                    hasFunded: false
                });
                airlineCounter++;
                emit ProposalPassed(proposalId);
                success = true;
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
    function buy(bytes32 _flightKey) external payable {
        require(
            flightSuretyApp.isRegisteredFlight(_flightKey),
            "Flight not found!"
        );
        require(
            flightInsuranceAmounts[_flightKey][msg.sender] == 0,
            "You already bought insurance."
        );
        require(msg.value <= 1 ether, "You can only insure up to 1 ether");
        flightInsurees[_flightKey].push(msg.sender);
        flightInsuranceAmounts[_flightKey][msg.sender] = msg.value;
        emit InsuranceBought(_flightKey);
    }

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
    function fund() public payable requireExistingAirline(msg.sender) {
        require(msg.value >= 10 ether, "You should fund at least 10 ether");
        airlines[msg.sender].hasFunded = true;
    }

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

interface IFlightSuretyApp {
    function isRegisteredFlight(
        bytes32 _flightKey
    ) external view returns (bool);
}
