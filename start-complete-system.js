const { spawn } = require('child_process');
const { ethers } = require("hardhat");
const fs = require('fs');
const kill = require('kill-port');

console.log("🚀 Starting Complete ADS-B Blockchain System");
console.log("============================================\n");

let processes = [];

// Function to kill all processes on exit
const cleanup = () => {
  console.log("\n🛑 Shutting down all processes...");
  processes.forEach(process => {
    if (process && !process.killed) {
      process.kill('SIGTERM');
    }
  });
  process.exit(0);
};

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

async function startCompleteSystem() {
  try {
    // Step 0: Kill processes on required ports
    console.log("0. 🧹 Clearing network ports...");
    const ports = [3000, 3001, 8545];
    for (const port of ports) {
      try {
        await kill(port, 'tcp');
        console.log(`   ✅ Port ${port} cleared.`);
      } catch (e) {
        console.log(`   ℹ️ Port ${port} was not in use.`);
      }
    }

    // Step 1: Check if Hardhat node is running
    console.log("\n1. 🔍 Starting Hardhat node...");
    
    const hardhatProcess = spawn('npx', ['hardhat', 'node'], {
      stdio: 'pipe',
      shell: true
    });
    
    hardhatProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Started HTTP and WebSocket JSON-RPC server at')) {
        console.log(`   ✅ Hardhat node started successfully.`);
      }
    });
    
    hardhatProcess.stderr.on('data', (data) => {
      console.log(`   ❌ Hardhat Error: ${data.toString().trim()}`);
    });
    
    processes.push(hardhatProcess);
    
    // Wait for Hardhat to start
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 2: Deploy contract
    console.log("\n2. 📋 Deploying smart contract...");
    const deployProcess = spawn('npx', ['hardhat', 'run', 'scripts/deploy.js', '--network', 'localhost'], {
      stdio: 'pipe',
      shell: true
    });
    
    deployProcess.stdout.on('data', (data) => {
      console.log(`   📝 Deploy: ${data.toString().trim()}`);
    });
    
    deployProcess.stderr.on('data', (data) => {
      console.log(`   ❌ Deploy Error: ${data.toString().trim()}`);
    });
    
    await new Promise((resolve, reject) => {
      deployProcess.on('close', (code) => {
        if (code === 0) {
          console.log("   ✅ Contract deployed successfully");
          resolve();
        } else {
          reject(new Error(`Deploy failed with code ${code}`));
        }
      });
    });

    // Step 3: Start relay server
    console.log("\n3. 🔧 Starting transaction relay server...");
    const relayProcess = spawn('npm', ['start'], {
      cwd: './server',
      stdio: 'pipe',
      shell: true
    });
    
    relayProcess.stdout.on('data', (data) => {
      console.log(`   🔄 Relay: ${data.toString().trim()}`);
    });
    
    relayProcess.stderr.on('data', (data) => {
      console.log(`   ❌ Relay Error: ${data.toString().trim()}`);
    });
    
    processes.push(relayProcess);
    
    // Wait for relay server to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 4: Start web interface
    console.log("\n4. 🌐 Starting web interface...");
    const webProcess = spawn('npm', ['start'], {
      cwd: './web-interface',
      stdio: 'pipe',
      shell: true
    });
    
    webProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output.includes('Local:')) {
        console.log("   ✅ Web interface started successfully");
      }
      console.log(`   🌐 Web: ${output}`);
    });
    
    webProcess.stderr.on('data', (data) => {
      console.log(`   ❌ Web Error: ${data.toString().trim()}`);
    });
    
    processes.push(webProcess);

    // Step 5: Wait for all services to be ready
    console.log("\n5. ⏳ Waiting for all services to be ready...");
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Step 6: Display system status
    console.log("\n" + "=".repeat(60));
    console.log("🎉 COMPLETE SYSTEM STARTED SUCCESSFULLY!");
    console.log("=".repeat(60));
    
    // Read current configuration
    const config = JSON.parse(fs.readFileSync('./web-interface/src/config.json', 'utf8'));
    
    console.log("\n📋 System Information:");
    console.log("   • Contract Address:", config.contractAddress);
    console.log("   • Network ID:", config.networkId);
    console.log("   • Hardhat Node: http://localhost:8545");
    console.log("   • Relay Server: http://localhost:3001");
    console.log("   • Web Interface: http://localhost:3000");
    
    console.log("\n🌐 Available Systems:");
    console.log("   1. MetaMask System (http://localhost:3000/blockchain)");
    console.log("      - Requires MetaMask configuration");
    console.log("      - User confirms each transaction");
    console.log("      - Full user control and transparency");
    
    console.log("\n   2. Relay System (http://localhost:3000/relay-blockchain)");
    console.log("      - No MetaMask confirmations required");
    console.log("      - Seamless user experience");
    console.log("      - Automatic transaction processing");
    
    console.log("\n   3. Unprotected System (http://localhost:3000/unprotected)");
    console.log("      - Traditional system for comparison");
    console.log("      - No blockchain security");
    
    console.log("\n🔧 MetaMask Setup (for MetaMask System):");
    console.log("   • Network Name: Localhost 8545");
    console.log("   • RPC URL: http://127.0.0.1:8545");
    console.log("   • Chain ID: 1337");
    console.log("   • Currency Symbol: ETH");
    
    console.log("\n💡 Usage Tips:");
    console.log("   • Use Relay System for seamless experience");
    console.log("   • Use MetaMask System for full control");
    console.log("   • Compare security between systems");
    console.log("   • Monitor transactions in Network Logger");
    
    console.log("\n⚠️  Press Ctrl+C to stop all services");
    console.log("=".repeat(60));

  } catch (error) {
    console.error("❌ Failed to start complete system:", error.message);
    cleanup();
  }
}

startCompleteSystem(); 