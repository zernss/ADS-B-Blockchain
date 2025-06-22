# ADS-B Blockchain Security System

A comprehensive demonstration of blockchain-based security for ADS-B flight data, featuring **two different implementation approaches** for comparison.

## 🚀 Quick Start

### Option 1: Complete System (Recommended)
```bash
node start-complete-system.js
```
This starts everything automatically:
- Hardhat blockchain node
- Smart contract deployment
- Transaction relay server
- Web interface

### Option 2: Manual Setup
```bash
# 1. Start blockchain
npx hardhat node

# 2. Deploy contract
npx hardhat run scripts/deploy.js --network localhost

# 3. Start relay server
cd server && npm start

# 4. Start web interface
cd web-interface && npm start
```

## 🌐 Available Systems

### 1. Relay System (`/relay-blockchain`) - **Seamless Experience**
- **No MetaMask required**
- **No user confirmations**
- **Instant transactions**
- **Perfect for demonstrations**

### 2. MetaMask System (`/blockchain`) - **Full Control**
- **Requires MetaMask setup**
- **User confirms each transaction**
- **Educational experience**
- **Full transparency**

### 3. Unprotected System (`/unprotected`) - **Comparison**
- **Traditional system**
- **No blockchain security**
- **For comparison purposes**

## 📋 System Features

### Flight Data Management
- Real-time flight data from OpenSky Network
- Blockchain-secured storage
- Batch processing capabilities
- Immutable flight records

### Attack Simulation
- **Replay Attack**: Reuse old flight data
- **Spoofing Attack**: Inject false position data
- **Tampering Attack**: Modify legitimate data

### Security Features
- Cryptographic verification
- Timestamp validation
- Position change validation
- Immutable audit trail

## 🔧 Architecture

### Relay System Architecture
```
User Browser → Relay Server → Smart Contract → Blockchain
     ↑              ↑              ↑            ↑
No user action   Server signs   Contract      Network
required         transaction    executes      validates
```

### MetaMask System Architecture
```
User Browser → MetaMask → Smart Contract → Blockchain
     ↑              ↑            ↑            ↑
User confirms   Wallet signs  Contract     Network
each transaction  transaction  executes     validates
```

## 📊 System Comparison

| Feature | Relay System | MetaMask System |
|---------|--------------|-----------------|
| **Setup Time** | Instant | 5-10 minutes |
| **User Experience** | Seamless | Interactive |
| **Transaction Speed** | 1-2 seconds | 2-5 seconds |
| **User Control** | Server controlled | User controlled |
| **Learning Curve** | None | Steep |
| **Best For** | Production | Education |

## 🎯 Use Cases

### Choose Relay System When:
- Building production applications
- Demonstrating to non-technical audiences
- Providing seamless user experience
- Enterprise solutions

### Choose MetaMask System When:
- Teaching blockchain concepts
- Demonstrating user control
- Educational environments
- Security-focused demonstrations

## 📖 Documentation

- [Setup Guide](SETUP_GUIDE.md) - Detailed setup instructions
- [System Comparison](SYSTEM_COMPARISON.md) - Comprehensive comparison
- [MetaMask Setup](setup-metamask.js) - Quick MetaMask configuration

## 🛠️ Development

### Project Structure
```
ADS-B-Blockchain/
├── contracts/           # Smart contracts
├── server/             # Transaction relay server
├── web-interface/      # React frontend
├── scripts/            # Deployment scripts
└── test/              # Test files
```

### Key Components
- **Smart Contract**: `contracts/AdsbData.sol`
- **Relay Server**: `server/transaction-relay.js`
- **MetaMask System**: `web-interface/src/components/BlockchainPage.js`
- **Relay System**: `web-interface/src/components/RelayBlockchainPage.js`

## 🔍 Testing

### Automated Tests
```bash
# Test blockchain connection
node test-blockchain-connection.js

# Test complete system
node test-complete-system.js
```

### Manual Testing
1. Open http://localhost:3000/relay-blockchain (Relay System)
2. Open http://localhost:3000/blockchain (MetaMask System)
3. Compare user experience and functionality
4. Test attack simulations on both systems

## 🚨 Troubleshooting

### Relay System Issues
- **Server not starting**: Check if port 3001 is available
- **Connection failed**: Ensure relay server is running
- **Transaction errors**: Check blockchain node status

### MetaMask System Issues
- **Connection failed**: Configure MetaMask network settings
- **Wrong network**: Switch to Localhost 8545 (Chain ID 1337)
- **No accounts**: Import test account with private key

### General Issues
- **Port conflicts**: Check if ports 3000, 3001, 8545 are available
- **Contract errors**: Redeploy contract with `npx hardhat run scripts/deploy.js --network localhost`
- **Node issues**: Restart Hardhat node with `npx hardhat node`

## 📈 Performance

### Relay System Performance
- **Setup**: Instant
- **Transactions**: 1-2 seconds
- **Batch Processing**: Single confirmation
- **User Experience**: Seamless

### MetaMask System Performance
- **Setup**: 5-10 minutes
- **Transactions**: 2-5 seconds
- **Batch Processing**: Multiple confirmations
- **User Experience**: Interactive

## 🎉 Success!

Both systems provide the same blockchain security benefits but offer different user experiences:

- **Relay System** = Production + Seamless Experience
- **MetaMask System** = Educational + Full Control

Choose the system that best fits your use case and audience!
