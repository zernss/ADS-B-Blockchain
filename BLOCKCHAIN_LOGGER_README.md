# Blockchain Logger System

I've created a comprehensive blockchain logging system for your ADS-B Blockchain project that will provide detailed visibility into your blockchain network activity.

## 🚀 Quick Start

### 1. Start the Blockchain Network

```bash
# Start Hardhat network and deploy contract
npx hardhat node

# In another terminal, deploy the contract
node start-blockchain.js
```

### 2. Start the Web Interface

```bash
cd web-interface
npm start
```

### 3. Connect MetaMask

1. Open MetaMask
2. Add network: `localhost:8545` (Chain ID: 1337)
3. Import the contract address shown in the console
4. Connect your wallet to the web interface

## 📊 What the Logger Shows

### Network Status
- **Connection Status**: Whether your wallet is connected to the blockchain
- **Network Information**: Chain ID, network name, current block number
- **Gas Price**: Current gas price in gwei
- **Last Update**: When the network info was last refreshed

### Log Statistics
- **Total Logs**: Number of log entries captured
- **Recent Activity**: Logs from the last minute
- **Logs by Level**: Breakdown of logs by type (info, success, warning, error, etc.)

### Real-time Activity Logs
The logger captures and displays:

#### 🔄 **Info Logs**
- Blockchain initialization
- Flight data updates
- Network status changes

#### ✅ **Success Logs**
- Successful transactions
- Contract deployments
- Data verifications

#### ⚠️ **Warning Logs**
- Network changes
- Potential issues

#### ❌ **Error Logs**
- Failed transactions
- Connection errors
- Contract errors

#### 📝 **Transaction Logs**
- Transaction submissions
- Gas usage
- Block confirmations
- Transaction costs

#### 📦 **Block Logs**
- New block mining
- Block details (transactions, gas used)

#### 🎯 **Event Logs**
- Contract events (FlightUpdated, FlightBatchUpdated)
- Flight data changes

## 🎮 How to Use

### 1. Access the Logger
- Go to the "Network Logger" tab in your web interface
- The logger will automatically start capturing blockchain activity

### 2. Filter Logs
- Use the "Filter Level" dropdown to show only specific types of logs
- Choose from: All, Info, Success, Warning, Error, Transaction, Block, Event

### 3. View Details
- Click on any log entry to expand and see detailed information
- View transaction hashes, gas usage, block numbers, and more

### 4. Auto-scroll
- Toggle auto-scroll to automatically follow new log entries
- Useful for monitoring real-time activity

### 5. Clear Logs
- Use the "Clear" button to reset the log display
- Useful when you want to start fresh

## 🔧 Technical Details

### Logger Service (`BlockchainLogger.js`)
- **Singleton Pattern**: Single instance manages all logging
- **Event Listeners**: Listens to blockchain events in real-time
- **Log Levels**: 7 different log levels for categorization
- **Data Persistence**: Keeps last 100 log entries in memory
- **Network Monitoring**: Updates network info every 5 seconds

### Integration Points
- **FlightDataService**: Logs all blockchain operations
- **Contract Events**: Captures FlightUpdated and FlightBatchUpdated events
- **Transaction Monitoring**: Tracks all contract interactions
- **Network Status**: Monitors connection and network changes

### Log Format
Each log entry contains:
```javascript
{
  id: "unique_id",
  timestamp: Date,
  level: "info|success|warning|error|transaction|block|event",
  message: "Human readable message",
  data: { /* Additional data */ },
  formatted: "Formatted display string"
}
```

## 🐛 Troubleshooting

### No Logs Appearing?
1. **Check Connection**: Ensure MetaMask is connected to localhost:8545
2. **Verify Contract**: Make sure the contract is deployed and address is correct
3. **Check Console**: Look for errors in browser console
4. **Restart Network**: Restart Hardhat network and redeploy contract

### Transaction Failures?
1. **Check Gas**: Ensure you have enough ETH for gas fees
2. **Network Issues**: Verify you're on the correct network (Chain ID: 1337)
3. **Contract State**: Check if contract is properly deployed

### Performance Issues?
1. **Clear Logs**: Use the clear button to free memory
2. **Reduce Log Level**: Filter to show only important logs
3. **Restart Browser**: Refresh the page if logs become sluggish

## 📈 Monitoring Best Practices

### For Development
- Keep the Network Logger tab open while testing
- Monitor transaction success/failure rates
- Watch for gas price fluctuations
- Check for contract event emissions

### For Testing Attacks
- Clear logs before running attack simulations
- Monitor both traditional and blockchain system responses
- Compare detection rates between systems
- Track gas costs for blockchain operations

### For Production
- Set up log persistence (currently logs are in-memory only)
- Implement log rotation and archiving
- Add alerting for critical errors
- Monitor network health metrics

## 🔮 Future Enhancements

Potential improvements for the logger system:
- **Log Persistence**: Save logs to database or file
- **Advanced Filtering**: Filter by time range, transaction type, etc.
- **Export Functionality**: Export logs to CSV/JSON
- **Alert System**: Notifications for critical events
- **Performance Metrics**: Track gas usage trends, transaction throughput
- **Visual Charts**: Graph network activity over time

## 📞 Support

If you encounter issues with the blockchain logger:
1. Check the browser console for JavaScript errors
2. Verify your Hardhat network is running
3. Ensure MetaMask is properly configured
4. Check that the contract address in `config.json` is correct

The logger will help you understand exactly what's happening with your blockchain network and why blocks might not be updating as expected! 