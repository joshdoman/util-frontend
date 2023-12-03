export const PeerFedLibraryExternalABI = [
  {
    "inputs": [],
    "name": "LibraryExcessiveInputAmount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "LibraryExcessiveOutputAmount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "LibraryInsufficientInputAmount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "LibraryInsufficientOutputAmount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "LibraryInsufficientOutputSupply",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "x",
        "type": "uint256"
      }
    ],
    "name": "PRBMathUD60x18__SqrtOverflow",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amountOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "supplyIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "supplyOut",
        "type": "uint256"
      }
    ],
    "name": "getAmountIn",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amountIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "supplyIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "supplyOut",
        "type": "uint256"
      }
    ],
    "name": "getAmountOut",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "supply0",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "supply1",
        "type": "uint256"
      }
    ],
    "name": "interestRate",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "supply0",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "supply1",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "invariantIssuance",
        "type": "uint256"
      }
    ],
    "name": "issuanceAmounts",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "newAmount0",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "newAmount1",
        "type": "uint256"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amountA",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "supplyA",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "supplyB",
        "type": "uint256"
      }
    ],
    "name": "quote",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  }
]