# ADS-B Blockchain Security System

## What is This Project?

This project is a demonstration of how **blockchain technology** can be used to make flight data more secure. It is designed so that even people without a technical background can understand the benefits and see how it works in action.

### What is ADS-B?
- **ADS-B** stands for **Automatic Dependent Surveillance–Broadcast**.
- It is a system used by airplanes to broadcast their position, speed, and other flight data so that air traffic controllers and other planes can know where they are.
- This data is public and can be received by anyone with the right equipment.

### Why is Security Important?
- Because ADS-B data is not encrypted, it is possible for attackers to send false data ("spoofing"), replay old data, or tamper with real data.
- This can cause confusion or even danger in air traffic management.

### How Does Blockchain Help?
- **Blockchain** is a technology that stores data in a way that is very hard to change or fake.
- By putting flight data on a blockchain, we can make sure that once data is recorded, it cannot be changed or deleted.
- This helps prevent attacks and makes it easy to check if the data is real.

### What is a Smart Contract?
- A **smart contract** is a special computer program that runs on the blockchain.
- It automatically follows rules that cannot be changed once the contract is deployed.
- In this project, the smart contract is responsible for:
  - Storing flight data securely on the blockchain
  - Making sure data cannot be changed or deleted after being recorded
  - Checking for suspicious or invalid flight data (such as impossible altitude changes)
  - Rejecting any data that does not follow the rules
- This means the smart contract acts like a digital security guard, making sure all flight data is safe, real, and trustworthy.

## What Does This Project Do?

This project shows two main ways to secure ADS-B flight data using blockchain:

1. **Relay System** (Seamless, No User Action Needed)
   - The system automatically sends flight data to the blockchain using a server.
   - Users do not need to do anything or confirm transactions.
   - This is fast and easy for demonstrations or real-world use.

2. **MetaMask System** (User-Controlled, Educational)
   - Users must confirm every transaction using MetaMask (a popular crypto wallet browser extension).
   - This gives users full control and helps them learn how blockchain works.
   - Best for teaching and showing how blockchain security works in detail.

There is also an **Unprotected System** for comparison, which does not use blockchain and is vulnerable to attacks.

## What Can You Do With This Project?
- **See real flight data** from the OpenSky Network.
- **Store flight data on the blockchain** and see how it cannot be changed.
- **Simulate attacks** (replay, spoofing, tampering) and see how the blockchain prevents or detects them.
- **Compare** a secure system (blockchain) with an insecure one (traditional).

## How Does It Work?
- The system fetches real flight data from the internet.
- It stores this data on a blockchain using a smart contract.
- You can view the data, simulate attacks, and see the results in a web interface.
- You can choose between a seamless experience (Relay System) or a user-controlled one (MetaMask System).

## How to Use This Project

### 🚀 Quick Start

#### Option 1: Complete System (Recommended)
```bash
node start-complete-system.js
```
This starts everything automatically:
- Blockchain node
- Smart contract deployment
- Relay server
- Web interface

#### Option 2: Manual Setup
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

### 1. Relay System (`/relay-blockchain`)
- No MetaMask required
- No user confirmations
- Instant transactions
- Great for demos and real-world use

### 2. MetaMask System (`/blockchain`)
- Requires MetaMask browser extension
- User confirms each transaction
- Great for learning and transparency

### 3. Unprotected System (`/unprotected`)
- No blockchain security
- For comparison only

## 📋 Features
- Real-time flight data
- Blockchain-secured storage
- Simulate attacks and see how blockchain protects data
- Compare secure and insecure systems

## 🔧 How It's Built
- **Smart Contract**: Stores flight data on the blockchain
- **Relay Server**: Handles transactions for the seamless system
- **Web Interface**: Lets you view data, simulate attacks, and compare systems

## 📖 Documentation
- [Setup Guide](SETUP_GUIDE.md) - Step-by-step instructions
- [System Comparison](SYSTEM_COMPARISON.md) - Compare all systems
- [MetaMask Setup](setup-metamask.js) - How to set up MetaMask

## 🛠️ Project Structure
```
ADS-B-Blockchain/
├── contracts/           # Smart contracts
├── server/             # Relay server
├── web-interface/      # Web interface
├── scripts/            # Deployment scripts
└── test/               # Test files
```

## 🚨 Troubleshooting
- If you have issues, see the troubleshooting section below for common problems and solutions.

## 🎉 Success!
You can now see how blockchain can protect flight data, simulate attacks, and compare different security approaches—all in one easy-to-use demo!

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
