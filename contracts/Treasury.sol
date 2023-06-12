// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import "./TreasuryToken.sol";

contract Treasury is TreasuryToken {
    event FundsStored(address indexed from, uint256 amount);
    event NewWithdrawalRequest(
        address indexed from,
        uint256 amount,
        string description,
        uint256 expiresAt
    );
    event VoteCasted(
        address indexed from,
        uint256 withdrawalId,
        string voteType,
        uint256 voteAmount
    );
    event WithdrawalExecuted(
        address indexed from,
        uint256 withdrawalId,
        uint256 amount
    );

    struct WithdrawalRequest {
        address owner;
        uint256 amount;
        string description;
        uint256 expiresAt;
        uint256 createdAt;
        bool approved;
    }

    struct Vote {
        uint256 withdrawalId;
        uint256 yesVotes;
        uint256 noVotes;
    }

    struct Stakeholder {
        address owner;
        uint256 tokens;
    }

    uint256 public totalBalance;
    uint256 private counter = 0;
    bool internal locked;

    mapping(uint256 => Stakeholder) public stakeholderVotes;
    mapping(uint256 => WithdrawalRequest) public withdrawalRequests;
    mapping(uint256 => Vote) public votes;

    modifier _noReentrant() {
        require(!locked, "No re-entrancy");
        locked = true;
        _;
        locked = false;
    }

    function storeFunds() public payable {
        require(msg.value > 0, "Value must be greater than 0");
        totalBalance += msg.value;
        mint(msg.sender, msg.value);
        emit FundsStored(msg.sender, msg.value);
    }

    // duration is in days
    function initiateWithdrawal(
        uint256 amount,
        string calldata description,
        uint256 duration
    ) public {
        require(totalBalance >= amount, "Insufficient funds");
        require(duration <= 30, "Duration cannot be more than 30 days");
        require(duration >= 1, "Duration cannot be less than 1 day");
        uint256 expiresAt = block.timestamp + duration * 24 * 60 * 60;

        totalBalance -= amount;
        withdrawalRequests[counter] = WithdrawalRequest(
            msg.sender,
            amount,
            description,
            expiresAt,
            block.timestamp,
            false
        );
        counter++;
        emit NewWithdrawalRequest(msg.sender, amount, description, expiresAt);
    }

    function vote(
        uint256 withdrawalId,
        string calldata voteType,
        uint256 voteAmount
    ) public {
        require(balanceOf(msg.sender) >= voteAmount, "Insufficient tokens");
        require(
            block.timestamp < withdrawalRequests[withdrawalId].expiresAt,
            "Voting period has expired"
        );

        approve(msg.sender, voteAmount);
        transferFrom(msg.sender, address(this), voteAmount);
        stakeholderVotes[withdrawalId] = Stakeholder(msg.sender, voteAmount);
        if (keccak256(bytes(voteType)) == keccak256(bytes("yes"))) {
            votes[withdrawalId].yesVotes += voteAmount;
        } else if (keccak256(bytes(voteType)) == keccak256(bytes("no"))) {
            votes[withdrawalId].noVotes += voteAmount;
        }
        emit VoteCasted(msg.sender, withdrawalId, voteType, voteAmount);
    }

    function executeWithdrawal(
        uint256 withdrawalId,
        address to
    ) public _noReentrant {
        require(
            block.timestamp > withdrawalRequests[withdrawalId].expiresAt,
            "Voting period has not yet expired"
        );
        require(
            !withdrawalRequests[withdrawalId].approved,
            "Withdrawal has already been executed"
        );
        require(
            votes[withdrawalId].yesVotes > votes[withdrawalId].noVotes,
            "Withdrawal has not been approved"
        );
        require(
            msg.sender == withdrawalRequests[withdrawalId].owner,
            "Only the owner can execute the withdrawal"
        );

        (bool success, ) = payable(to).call{
            value: withdrawalRequests[withdrawalId].amount
        }("");
        require(success, "Transaction failed");

        withdrawalRequests[withdrawalId].approved = true;
        emit WithdrawalExecuted(
            msg.sender,
            withdrawalId,
            withdrawalRequests[withdrawalId].amount
        );
    }

    function withdrawTokens(uint256 withdrawalId, address to) public {
        require(
            block.timestamp > withdrawalRequests[withdrawalId].expiresAt,
            "Voting period has not yet expired"
        );
        Stakeholder memory stakeholder = stakeholderVotes[withdrawalId];
        transferFrom(address(this), to, stakeholder.tokens);
    }
}
