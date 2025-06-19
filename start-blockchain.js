const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting ADS-B Blockchain Network...");
  
  try {
    // Get the contract factory
    const AdsbData = await ethers.getContractFactory("AdsbData");
    console.log("📋 Contract factory loaded successfully");

    // Deploy the contract
    console.log("⛏️  Deploying AdsbData contract...");
    const adsbData = await AdsbData.deploy();
    
    // Wait for deployment
    await adsbData.deployed();
    console.log("✅ AdsbData deployed to:", adsbData.address);
    
    // Get network info
    const network = await ethers.provider.getNetwork();
    const blockNumber = await ethers.provider.getBlockNumber();
    const gasPrice = await ethers.provider.getGasPrice();
    
    console.log("\n📊 Network Information:");
    console.log("   Network Name:", network.name);
    console.log("   Chain ID:", network.chainId);
    console.log("   Current Block:", blockNumber);
    console.log("   Gas Price:", ethers.utils.formatUnits(gasPrice, "gwei"), "gwei");
    console.log("   Contract Address:", adsbData.address);
    
    // Update the config file
    const fs = require('fs');
    const configPath = './web-interface/src/config.json';
    const config = {
      contractAddress: adsbData.address,
      networkId: network.chainId.toString()
    };
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log("\n📝 Updated config.json with new contract address");
    
    console.log("\n🎉 Setup complete! You can now:");
    console.log("   1. Start your web interface: cd web-interface && npm start");
    console.log("   2. Connect MetaMask to localhost:8545");
    console.log("   3. Import the contract address:", adsbData.address);
    console.log("   4. View blockchain activity in the Network Logger tab");
    
    // Keep the script running to maintain the network
    console.log("\n🔗 Keeping network alive... (Press Ctrl+C to stop)");
    
    // Listen for new blocks
    ethers.provider.on("block", (blockNumber) => {
      console.log(`📦 New block mined: #${blockNumber}`);
    });
    
    // Listen for contract events
    adsbData.on("FlightUpdated", (icao24, callsign, latitude, longitude, altitude, onGround, timestamp, isSpoofed) => {
      console.log(`✈️  Flight updated: ${callsign} (${icao24})`);
      console.log(`   Position: ${latitude/1e6}°, ${longitude/1e6}°`);
      console.log(`   Altitude: ${altitude}m, On Ground: ${onGround}`);
      console.log(`   Timestamp: ${new Date(timestamp * 1000).toLocaleString()}`);
      console.log(`   Spoofed: ${isSpoofed}`);
    });
    
    adsbData.on("FlightBatchUpdated", (count, timestamp) => {
      console.log(`📦 Flight batch updated: ${count} flights at ${new Date(timestamp * 1000).toLocaleString()}`);
    });
    
  } catch (error) {
    console.error("❌ Error during deployment:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down blockchain network...');
  process.exit(0);
});

main()
  .then(() => {
    // Keep the process alive
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 