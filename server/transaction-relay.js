const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Root endpoint for basic server status
app.get('/', (req, res) => {
  res.json({
    message: 'ADS-B Transaction Relay Server is running.',
    status: 'healthy',
    documentation: 'See SYSTEM_COMPARISON.md for more details.',
    healthCheck: 'GET /health for detailed status.'
  });
});

// Load contract configuration
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../web-interface/src/config.json'), 'utf8'));
const contractABI = JSON.parse(fs.readFileSync(path.join(__dirname, '../web-interface/src/contracts/AdsbData.json'), 'utf8'));

// Initialize blockchain connection
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
const accounts = provider.listAccounts();

// Use the first account as the transaction sender
const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // First Hardhat account
const wallet = new ethers.Wallet(privateKey, provider);
const contract = new ethers.Contract(config.contractAddress, contractABI.abi, wallet);

console.log("🔧 Transaction Relay Server Starting...");
console.log("📋 Contract Address:", config.contractAddress);
console.log("👤 Sender Address:", wallet.address);
console.log("🌐 Network:", config.networkId);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    contractAddress: config.contractAddress,
    senderAddress: wallet.address,
    networkId: config.networkId
  });
});

// Get current flight count
app.get('/flight-count', async (req, res) => {
  try {
    const count = await contract.getFlightCount();
    res.json({ count: count.toString() });
  } catch (error) {
    console.error('Error getting flight count:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add single flight data (no user confirmation needed)
app.post('/add-flight', async (req, res) => {
  try {
    const { icao24, callsign, latitude, longitude, altitude, onGround, isSpoofed } = req.body;
    
    console.log(`✈️ Adding flight: ${callsign} (${icao24})`);
    
    // Fetch the latest nonce
    const nonce = await provider.getTransactionCount(wallet.address, 'latest');

    const tx = await contract.updateFlight(
      icao24,
      callsign || '',
      Math.floor(latitude * 1e6),
      Math.floor(longitude * 1e6),
      Math.floor(altitude),
      onGround || false,
      isSpoofed || false,
      { nonce }
    );
    
    const receipt = await tx.wait();
    
    console.log(`✅ Flight added successfully!`);
    console.log(`   Transaction: ${tx.hash}`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
    
    res.json({
      success: true,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      flight: { icao24, callsign, latitude, longitude, altitude, onGround, isSpoofed }
    });
    
  } catch (error) {
    console.error('Error adding flight:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Add multiple flights in batch (no user confirmation needed)
app.post('/add-flights-batch', async (req, res) => {
  try {
    const { flights } = req.body;
    
    if (!Array.isArray(flights) || flights.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Flights array is required and must not be empty' 
      });
    }
    
    console.log(`📦 Adding ${flights.length} flights in batch...`);
    
    const icao24s = flights.map(f => f.icao24);
    const callsigns = flights.map(f => f.callsign || '');
    const latitudes = flights.map(f => Math.floor(f.latitude * 1e6));
    const longitudes = flights.map(f => Math.floor(f.longitude * 1e6));
    const altitudes = flights.map(f => Math.floor(f.altitude));
    const onGrounds = flights.map(f => f.onGround || false);
    const isSpoofedFlags = flights.map(f => f.isSpoofed || false);

    // Fetch the latest nonce
    const nonce = await provider.getTransactionCount(wallet.address, 'latest');
    
    const tx = await contract.updateFlightBatch(
      icao24s,
      callsigns,
      latitudes,
      longitudes,
      altitudes,
      onGrounds,
      isSpoofedFlags,
      { nonce }
    );
    
    const receipt = await tx.wait();
    
    console.log(`✅ Batch transaction successful!`);
    console.log(`   Transaction: ${tx.hash}`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`   Flights added: ${flights.length}`);
    
    res.json({
      success: true,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      flightsCount: flights.length,
      flights: flights
    });
    
  } catch (error) {
    console.error('Error adding flights batch:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Get all flights from blockchain
app.get('/flights', async (req, res) => {
  try {
    const flightCount = await contract.getFlightCount();
    const flights = [];
    
    for (let i = 0; i < flightCount; i++) {
      const flight = await contract.getFlight(i);
      flights.push({
        icao24: flight[0],
        callsign: flight[1],
        latitude: flight[2].toNumber() / 1e6,
        longitude: flight[3].toNumber() / 1e6,
        altitude: flight[4].toNumber(),
        onGround: flight[5],
        timestamp: new Date(flight[6].toNumber() * 1000),
        isSpoofed: flight[7],
        isVerified: true
      });
    }
    
    res.json({ flights, count: flights.length });
    
  } catch (error) {
    console.error('Error getting flights:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get latest flights
app.get('/flights/latest/:count', async (req, res) => {
  try {
    const count = parseInt(req.params.count) || 10;
    const flightCount = await contract.getFlightCount();
    const actualCount = Math.min(count, flightCount);
    const flights = [];
    
    // Get the latest flights
    for (let i = flightCount - actualCount; i < flightCount; i++) {
      const flight = await contract.getFlight(i);
      flights.push({
        icao24: flight[0],
        callsign: flight[1],
        latitude: flight[2].toNumber() / 1e6,
        longitude: flight[3].toNumber() / 1e6,
        altitude: flight[4].toNumber(),
        onGround: flight[5],
        timestamp: new Date(flight[6].toNumber() * 1000),
        isSpoofed: flight[7],
        isVerified: true
      });
    }
    
    res.json({ flights, count: flights.length });
    
  } catch (error) {
    console.error('Error getting latest flights:', error);
    res.status(500).json({ error: error.message });
  }
});

// Simulate attack (no user confirmation needed)
app.post('/simulate-attack', async (req, res) => {
  // Print ABI fragment for updateFlight immediately
  console.log('ABI for updateFlight:', contract.interface.fragments.find(f => f.name === 'updateFlight'));
  try {
    const { attackType, targetFlight } = req.body;
    
    console.log(`⚠️ Simulating ${attackType} attack on ${targetFlight.callsign}`);
    console.log('Received targetFlight from frontend:', targetFlight);
    
    // Initialize attackedFlight with default values for required properties
    const attackedFlight = { 
      ...targetFlight,
      onGround: targetFlight.onGround || false,
      isSpoofed: targetFlight.isSpoofed || false,
      velocity: Number(targetFlight.velocity) || 0,
      timestamp: targetFlight.timestamp ? new Date(targetFlight.timestamp) : new Date()
    };
    console.log('Constructed attackedFlight for contract:', attackedFlight);
    console.log('Velocity field check:', attackedFlight.velocity);
    
    // Defensive check: Ensure all required fields are present
    const requiredFields = [
      'icao24', 'callsign', 'latitude', 'longitude', 'altitude', 'onGround', 'isSpoofed'
    ];
    for (const field of requiredFields) {
      if (attackedFlight[field] === undefined || attackedFlight[field] === null) {
        return res.status(400).json({
          success: false,
          error: `Missing required field: ${field}`
        });
      }
    }
    
    // Defensive: Ensure numeric fields are valid numbers before mutation
    attackedFlight.latitude = Number(attackedFlight.latitude) || 0;
    attackedFlight.longitude = Number(attackedFlight.longitude) || 0;
    attackedFlight.altitude = Number(attackedFlight.altitude) || 0;
    
    console.log('About to start attack simulation for type:', attackType);
    
    switch (attackType) {
      case 'replay':
        attackedFlight.timestamp = new Date(new Date(attackedFlight.timestamp).getTime() - 3600000);
        attackedFlight.latitude = Number(attackedFlight.latitude) + (Math.random() * 0.5 - 0.25);
        attackedFlight.longitude = Number(attackedFlight.longitude) + (Math.random() * 0.5 - 0.25);
        console.log('Replay attack - mutated values:', {
          latitude: attackedFlight.latitude,
          longitude: attackedFlight.longitude,
          timestamp: attackedFlight.timestamp
        });
        break;
      
      case 'spoofing':
        attackedFlight.latitude = Number(attackedFlight.latitude) + (Math.random() * 10 - 5);
        attackedFlight.longitude = Number(attackedFlight.longitude) + (Math.random() * 10 - 5);
        attackedFlight.altitude = Number(attackedFlight.altitude) + Math.floor(Math.random() * 10000);
        attackedFlight.isSpoofed = true;
        console.log('Spoofing attack - mutated values:', {
          latitude: attackedFlight.latitude,
          longitude: attackedFlight.longitude,
          altitude: attackedFlight.altitude,
          isSpoofed: attackedFlight.isSpoofed
        });
        break;
        
      case 'tampering':
        console.log('Starting tampering attack simulation...');
        attackedFlight.altitude = Number(attackedFlight.altitude) + (Math.floor(Math.random() * 30000) - 15000);
        attackedFlight.velocity = Number(attackedFlight.velocity) + Math.floor(Math.random() * 200);
        console.log('Tampering attack - mutated values:', {
          altitude: attackedFlight.altitude,
          velocity: attackedFlight.velocity
        });
        break;
        
      default:
        return res.status(400).json({ success: false, error: 'Unknown attack type' });
    }
    // Final defensive check for NaN after all mutations
    attackedFlight.latitude = Number(attackedFlight.latitude) || 0;
    attackedFlight.longitude = Number(attackedFlight.longitude) || 0;
    attackedFlight.altitude = Number(attackedFlight.altitude) || 0;
    
    console.log('Final attackedFlight after mutations:', {
      icao24: attackedFlight.icao24,
      callsign: attackedFlight.callsign,
      latitude: attackedFlight.latitude,
      longitude: attackedFlight.longitude,
      altitude: attackedFlight.altitude,
      onGround: attackedFlight.onGround,
      isSpoofed: attackedFlight.isSpoofed
    });
    
    // Ensure timestamp is always valid
    if (!attackedFlight.timestamp) {
      attackedFlight.timestamp = new Date();
    }
    
    // Pre-validate using the smart contract's validation function
    let timestamp = Math.floor(new Date(attackedFlight.timestamp).getTime() / 1000);
    let [valid, reason] = await contract.validateFlightUpdate(
      attackedFlight.icao24,
      Math.floor(attackedFlight.latitude * 1e6),
      Math.floor(attackedFlight.longitude * 1e6),
      Math.floor(attackedFlight.altitude),
      timestamp
    );
    if (!valid) {
      const response = {
        success: true,
        attackType,
        targetFlight,
        attackedFlight,
        detectedByBlockchain: true,
        reason,
        message: `Attack Prevented (pre-validation): ${reason}`,
        eventLogs: []
      };
      console.log('🛡️ Attack blocked by pre-validation:', response);
      return res.status(200).json(response);
    }
    
    try {
      // Log argument values and types before contract call
      const updateFlightArgs = [
        attackedFlight.icao24,
        attackedFlight.callsign || '',
        Math.floor(attackedFlight.latitude * 1e6),
        Math.floor(attackedFlight.longitude * 1e6),
        Math.floor(attackedFlight.altitude),
        attackedFlight.onGround,
        attackedFlight.isSpoofed
      ];
      console.log('updateFlight args:', updateFlightArgs);
      console.log('updateFlight arg types:', updateFlightArgs.map(x => typeof x));
      console.log('updateFlight arg values (detailed):', {
        icao24: updateFlightArgs[0],
        callsign: updateFlightArgs[1],
        latitude: updateFlightArgs[2],
        longitude: updateFlightArgs[3],
        altitude: updateFlightArgs[4],
        onGround: updateFlightArgs[5],
        isSpoofed: updateFlightArgs[6]
      });
      // Defensive check for NaN or undefined
      for (let i = 0; i < updateFlightArgs.length; i++) {
        if (updateFlightArgs[i] === undefined || updateFlightArgs[i] === null || (typeof updateFlightArgs[i] === 'number' && isNaN(updateFlightArgs[i]))) {
          console.error(`Invalid argument at position ${i}:`, updateFlightArgs[i]);
          return res.status(400).json({
            success: false,
            error: `Invalid argument at position ${i}: ${updateFlightArgs[i]}`
          });
        }
      }

      // Add the attacked flight to blockchain
      const tx = await contract.updateFlight(
        attackedFlight.icao24,
        attackedFlight.callsign || '',
        Math.floor(attackedFlight.latitude * 1e6),
        Math.floor(attackedFlight.longitude * 1e6),
        Math.floor(attackedFlight.altitude),
        attackedFlight.onGround,
        attackedFlight.isSpoofed
      );
      
      const receipt = await tx.wait();
      
      // Parse event logs (FlightUpdated, etc.)
      const eventLogs = [];
      if (receipt && receipt.logs && receipt.logs.length > 0) {
        for (const log of receipt.logs) {
          try {
            const parsed = contract.interface.parseLog(log);
            eventLogs.push({
              name: parsed.name,
              values: parsed.args
            });
          } catch (e) {
            // Not a contract event we care about
          }
        }
      }

      const response = {
        success: true,
        attackType,
        targetFlight,
        attackedFlight,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        detectedByBlockchain: false,
        message: "Attack Succeeded: The malicious data was accepted by the blockchain.",
        eventLogs
      };
      console.log('✅ Attack accepted by blockchain:', response);
      res.status(200).json(response);

    } catch (error) {
      // Try to parse event logs from the error receipt if available
      let eventLogs = [];
      if (error.receipt && error.receipt.logs && error.receipt.logs.length > 0) {
        for (const log of error.receipt.logs) {
          try {
            const parsed = contract.interface.parseLog(log);
            eventLogs.push({
              name: parsed.name,
              values: parsed.args
            });
          } catch (e) {
            // Not a contract event we care about
          }
        }
      }
      const response = {
        success: true,
        attackType,
        targetFlight,
        attackedFlight,
        detectedByBlockchain: true,
        reason: error.reason || "Transaction reverted by smart contract.",
        message: "Attack Prevented: The smart contract rejected the malicious transaction.",
        eventLogs
      };
      console.log('🛡️ Attack blocked by blockchain:', response);
      res.status(200).json(response);
    }
    
  } catch (error) {
    console.error('Error in /simulate-attack endpoint:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Transaction Relay Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`✈️ Ready to handle flight data transactions without user confirmations!`);
});

module.exports = app; 