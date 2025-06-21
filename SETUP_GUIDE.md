# ADS-B Blockchain Setup Guide

## Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- MetaMask browser extension

## Quick Start

### 1. Install Dependencies
```bash
npm install
cd web-interface && npm install
```

### 2. Start the Blockchain Network
```bash
npx hardhat node
```
This starts a local Ethereum network on `http://127.0.0.1:8545`

### 3. Deploy the Smart Contract
```bash
npx hardhat run scripts/deploy.js --network localhost
```
This deploys the AdsbData contract and updates the web interface configuration.

### 4. Start the Web Interface
```bash
cd web-interface
npm start
```
The application will be available at `http://localhost:3000`

## MetaMask Configuration

### Step 1: Add Local Network to MetaMask
1. Open MetaMask
2. Click on the network dropdown (usually shows "Ethereum Mainnet")
3. Click "Add Network" → "Add Network Manually"
4. Fill in the following details:
   - **Network Name**: Localhost 8545
   - **New RPC URL**: http://127.0.0.1:8545
   - **Chain ID**: 1337
   - **Currency Symbol**: ETH
   - **Block Explorer URL**: (leave empty)
5. Click "Save"

### Step 2: Import Test Account
1. In MetaMask, click on the account dropdown
2. Click "Import Account"
3. Use one of these private keys (from the Hardhat node output):
   ```
   0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
   0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
   ```
4. Click "Import"

### Step 3: Connect to Website
1. Open http://localhost:3000 in your browser
2. Click "Connect Wallet" or similar button
3. Approve the connection in MetaMask

## Testing the Connection

### Automated Test
Run the connection test:
```bash
node test-blockchain-connection.js
```

### Manual Test
1. Open the web interface
2. Navigate to the "Blockchain Info" tab
3. Verify that you see:
   - Wallet address
   - Network: Localhost 8545 (Chain ID: 1337)
   - Current block number
   - ETH balance

## Troubleshooting

### Issue: "Failed to connect to blockchain"
**Solution**: 
1. Make sure MetaMask is installed and unlocked
2. Ensure you're connected to the "Localhost 8545" network
3. Check that the Hardhat node is running (`npx hardhat node`)

### Issue: "No accounts found"
**Solution**:
1. Import a test account using the private keys above
2. Make sure you're on the correct network

### Issue: "Contract not found"
**Solution**:
1. Redeploy the contract: `npx hardhat run scripts/deploy.js --network localhost`
2. Check that the contract address in `web-interface/src/config.json` is correct

### Issue: "Transaction failed"
**Solution**:
1. Check that you have sufficient ETH balance
2. Ensure the Hardhat node is running
3. Try refreshing the page and reconnecting

## Network Information

- **RPC URL**: http://127.0.0.1:8545
- **Chain ID**: 1337
- **Currency**: ETH
- **Block Time**: ~1 second
- **Gas Limit**: 30,000,000
- **Accounts**: 20 pre-funded accounts with 10,000 ETH each

## Contract Information

- **Contract Name**: AdsbData
- **Address**: Automatically updated in config.json after deployment
- **Functions**: 
  - `updateFlight()` - Add single flight data
  - `updateFlightBatch()` - Add multiple flights at once
  - `getFlightCount()` - Get total number of flights
  - `getFlight(index)` - Get flight data by index
  - `getLatestFlights(count)` - Get recent flights

## Features

### Flight Data Management
- Real-time flight data from OpenSky Network
- Blockchain-secured storage
- Batch processing for efficiency

### Attack Simulation
- Replay Attack: Reuse old flight data
- Spoofing Attack: Inject false position data
- Tampering Attack: Modify legitimate data

### Security Features
- Immutable flight records
- Timestamp validation
- Position change validation
- Cryptographic verification

## Development

### Adding New Features
1. Modify the smart contract in `contracts/AdsbData.sol`
2. Update the web interface components
3. Test with the provided test scripts

### Running Tests
```bash
npx hardhat test
```

### Compiling Contracts
```bash
npx hardhat compile
```

## Support

If you encounter issues:
1. Check the console for error messages
2. Verify all services are running
3. Ensure MetaMask is properly configured
4. Try the automated tests to isolate the issue 