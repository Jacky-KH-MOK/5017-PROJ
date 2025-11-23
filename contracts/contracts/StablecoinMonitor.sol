// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Centralized Exchange AML Audit Trail
/// @notice Minimal append-only ledger that lets a trusted backend emit compliance events on-chain.
contract CexAmlAuditTrail {
    address public immutable CEX_BACKEND;
    uint256 public eventId;

    event SuspiciousActivity(
        uint256 indexed eventId,
        bytes32 indexed userId,
        bytes32 internalTxId,
        string reason,
        uint256 timestamp
    );

    event DepositTrace(
        uint256 indexed eventId,
        bytes32 indexed userId,
        bytes32 originalDepositTxHash,
        uint16 chainId,
        address sender,
        uint256 blockNumber
    );

    event AmlResolution(
        uint256 indexed eventId,
        bytes32 indexed userId,
        bytes32 internalTxId,
        string action,
        bool strFiled,
        uint256 timestamp
    );

    constructor() {
        CEX_BACKEND = msg.sender;
    }

    modifier onlyCex() {
        require(msg.sender == CEX_BACKEND, "Only CEX");
        _;
    }

    function logSuspicious(bytes32 userId, bytes32 internalTxId, string calldata reason) external onlyCex {
        emit SuspiciousActivity(++eventId, userId, internalTxId, reason, block.timestamp);
    }

    function logDepositTrace(
        bytes32 userId,
        bytes32 depositTxHash,
        uint16 chainId,
        address sender,
        uint256 blockNum
    ) external onlyCex {
        emit DepositTrace(++eventId, userId, depositTxHash, chainId, sender, blockNum);
    }

    function logResolution(bytes32 userId, bytes32 internalTxId, string calldata action, bool strFiled)
        external
        onlyCex
    {
        emit AmlResolution(++eventId, userId, internalTxId, action, strFiled, block.timestamp);
    }
}

