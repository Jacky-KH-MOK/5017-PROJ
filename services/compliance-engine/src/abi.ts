export const auditTrailAbi = [
  {
    inputs: [
      { internalType: "bytes32", name: "userId", type: "bytes32" },
      { internalType: "bytes32", name: "internalTxId", type: "bytes32" },
      { internalType: "string", name: "reason", type: "string" },
    ],
    name: "logSuspicious",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "userId", type: "bytes32" },
      { internalType: "bytes32", name: "depositTxHash", type: "bytes32" },
      { internalType: "uint16", name: "chainId", type: "uint16" },
      { internalType: "address", name: "sender", type: "address" },
      { internalType: "uint256", name: "blockNum", type: "uint256" },
    ],
    name: "logDepositTrace",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "userId", type: "bytes32" },
      { internalType: "bytes32", name: "internalTxId", type: "bytes32" },
      { internalType: "string", name: "action", type: "string" },
      { internalType: "bool", name: "sarFiled", type: "bool" },
    ],
    name: "logResolution",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "eventId", type: "uint256" },
      { indexed: true, internalType: "bytes32", name: "userId", type: "bytes32" },
      { indexed: false, internalType: "bytes32", name: "internalTxId", type: "bytes32" },
      { indexed: false, internalType: "string", name: "reason", type: "string" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "SuspiciousActivity",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "eventId", type: "uint256" },
      { indexed: true, internalType: "bytes32", name: "userId", type: "bytes32" },
      { indexed: false, internalType: "bytes32", name: "originalDepositTxHash", type: "bytes32" },
      { indexed: false, internalType: "uint16", name: "chainId", type: "uint16" },
      { indexed: false, internalType: "address", name: "sender", type: "address" },
      { indexed: false, internalType: "uint256", name: "blockNumber", type: "uint256" },
    ],
    name: "DepositTrace",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "eventId", type: "uint256" },
      { indexed: true, internalType: "bytes32", name: "userId", type: "bytes32" },
      { indexed: false, internalType: "bytes32", name: "internalTxId", type: "bytes32" },
      { indexed: false, internalType: "string", name: "action", type: "string" },
      { indexed: false, internalType: "bool", name: "sarFiled", type: "bool" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "AmlResolution",
    type: "event",
  },
];

