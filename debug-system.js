const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function debugSystem() {
  console.log("🔍 ADS-B Blockchain System Debug Report");
  console.log("=======================================\n");

  try {
    // 1. Check Hardhat configuration
    console.log("1. 📋 Checking Hardhat Configuration...");
    const hardhatConfig = require('./hardhat.config.js');
    console.log("   ✅ Hardhat config loaded successfully");
    console.log("   • Solidity version:", hardhatConfig.solidity.version);
    console.log("   • Networks configured:", Object.keys(hardhatConfig.networks).join(', '));

    // 2. Check contract compilation
    console.log("\n2. 🔧 Checking Contract Compilation...");
    try {
      const { execSync } = require('child_process');
      execSync('npx hardhat compile', { stdio: 'pipe' });
      console.log("   ✅ Contracts compiled successfully");
    } catch (error) {
      console.log("   ❌ Contract compilation failed:", error.message);
      return;
    }

    // 3. Check contract deployment
    console.log("\n3. 🚀 Checking Contract Deployment...");
    try {
      const AdsbData = await ethers.getContractFactory("AdsbData");
      console.log("   ✅ Contract factory created successfully");
      
      // Check if contract is already deployed
      const configPath = path.join(__dirname, 'web-interface/src/config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log("   • Contract address in config:", config.contractAddress);
        console.log("   • Network ID:", config.networkId);
      }
    } catch (error) {
      console.log("   ❌ Contract deployment check failed:", error.message);
    }

    // 4. Check network connectivity
    console.log("\n4. 🌐 Checking Network Connectivity...");
    try {
      const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
      const network = await provider.getNetwork();
      console.log("   ✅ Hardhat network accessible");
      console.log("   • Chain ID:", network.chainId);
      console.log("   • Network name:", network.name);
      
      const accounts = await provider.listAccounts();
      console.log("   • Available accounts:", accounts.length);
      console.log("   • First account:", accounts[0]);
    } catch (error) {
      console.log("   ❌ Network connectivity failed:", error.message);
      console.log("   💡 Make sure Hardhat node is running: npx hardhat node");
    }

    // 5. Check relay server
    console.log("\n5. 🔄 Checking Relay Server...");
    try {
      const fetch = require('node-fetch');
      const response = await fetch('http://localhost:3001/health');
      const data = await response.json();
      console.log("   ✅ Relay server is running");
      console.log("   • Status:", data.status);
      console.log("   • Contract address:", data.contractAddress);
    } catch (error) {
      console.log("   ❌ Relay server not accessible:", error.message);
      console.log("   💡 Start relay server: cd server && npm start");
    }

    // 6. Check web interface
    console.log("\n6. 🌐 Checking Web Interface...");
    try {
      const fetch = require('node-fetch');
      const response = await fetch('http://localhost:3000');
      console.log("   ✅ Web interface is running");
    } catch (error) {
      console.log("   ❌ Web interface not accessible:", error.message);
      console.log("   💡 Start web interface: cd web-interface && npm start");
    }

    // 7. Check dependencies
    console.log("\n7. 📦 Checking Dependencies...");
    const packageFiles = [
      'package.json',
      'web-interface/package.json',
      'server/package.json'
    ];
    
    for (const pkgFile of packageFiles) {
      if (fs.existsSync(pkgFile)) {
        const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
        console.log(`   ✅ ${pkgFile}: ${pkg.name} v${pkg.version}`);
      } else {
        console.log(`   ❌ ${pkgFile}: Not found`);
      }
    }

    // 8. Check configuration files
    console.log("\n8. ⚙️ Checking Configuration Files...");
    const configFiles = [
      'web-interface/src/config.json',
      'web-interface/src/contracts/AdsbData.json'
    ];
    
    for (const configFile of configFiles) {
      if (fs.existsSync(configFile)) {
        console.log(`   ✅ ${configFile}: Found`);
      } else {
        console.log(`   ❌ ${configFile}: Missing`);
      }
    }

    // 9. Check for common issues
    console.log("\n9. 🔍 Checking for Common Issues...");
    
    // Check if node_modules exists
    if (!fs.existsSync('node_modules')) {
      console.log("   ⚠️ node_modules not found - run: npm install");
    } else {
      console.log("   ✅ node_modules found");
    }
    
    // Check if web-interface/node_modules exists
    if (!fs.existsSync('web-interface/node_modules')) {
      console.log("   ⚠️ web-interface/node_modules not found - run: cd web-interface && npm install");
    } else {
      console.log("   ✅ web-interface/node_modules found");
    }
    
    // Check if server/node_modules exists
    if (!fs.existsSync('server/node_modules')) {
      console.log("   ⚠️ server/node_modules not found - run: cd server && npm install");
    } else {
      console.log("   ✅ server/node_modules found");
    }

    // 10. System recommendations
    console.log("\n10. 💡 System Recommendations...");
    console.log("   • Use 'node start-complete-system.js' to start all services");
    console.log("   • Check browser console for JavaScript errors");
    console.log("   • Monitor relay server logs for transaction errors");
    console.log("   • Ensure MetaMask is configured for localhost:8545");
    console.log("   • Verify contract address in config.json matches deployed contract");

    console.log("\n✅ Debug report completed successfully!");

  } catch (error) {
    console.error("❌ Debug report failed:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

// Run the debug function
debugSystem().catch(console.error); 