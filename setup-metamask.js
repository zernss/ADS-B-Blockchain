const fs = require('fs');

console.log("🔧 MetaMask Setup Helper");
console.log("========================\n");

// Read the current contract address
const config = JSON.parse(fs.readFileSync('./web-interface/src/config.json', 'utf8'));

console.log("📋 Current Configuration:");
console.log(`   Contract Address: ${config.contractAddress}`);
console.log(`   Network ID: ${config.networkId}`);
console.log("   RPC URL: http://127.0.0.1:8545\n");

console.log("🚀 Quick Setup Instructions:");
console.log("============================\n");

console.log("1. 📱 Open MetaMask in your browser");
console.log("2. 🌐 Click on the network dropdown (top of MetaMask)");
console.log("3. ➕ Click 'Add Network' → 'Add Network Manually'");
console.log("4. 📝 Fill in these details:");
console.log("   • Network Name: Localhost 8545");
console.log("   • New RPC URL: http://127.0.0.1:8545");
console.log("   • Chain ID: 1337");
console.log("   • Currency Symbol: ETH");
console.log("   • Block Explorer URL: (leave empty)");
console.log("5. 💾 Click 'Save'\n");

console.log("6. 👤 Import a test account:");
console.log("   • Click on the account dropdown");
console.log("   • Click 'Import Account'");
console.log("   • Use one of these private keys:\n");

// Hardhat default private keys
const privateKeys = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  "0x7c852118e8d7e3bdf7524789c918dc3cc22f6e024f1b3e337d4ecfdbec7f83e2",
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a"
];

privateKeys.forEach((key, index) => {
  console.log(`   Account ${index + 1}: ${key}`);
});

console.log("\n7. 🌐 Open http://localhost:3000 in your browser");
console.log("8. 🔗 Connect your MetaMask wallet to the website");
console.log("9. ✅ You should now see your wallet address and network info\n");

console.log("🔍 Verification:");
console.log("===============");
console.log("• Check that you're on 'Localhost 8545' network");
console.log("• Verify your balance shows ~10,000 ETH");
console.log("• The web interface should show 'Connected' status\n");

console.log("❓ Troubleshooting:");
console.log("===================");
console.log("• If you see 'Wrong Network' error, make sure you're on Chain ID 1337");
console.log("• If you see 'Contract Error', run: npx hardhat run scripts/deploy.js --network localhost");
console.log("• If the Hardhat node isn't running, start it with: npx hardhat node");
console.log("• If MetaMask asks for permission, click 'Connect' or 'Approve'\n");

console.log("🎉 Once configured, you can:");
console.log("• View real-time flight data on the map");
console.log("• Simulate various attack scenarios");
console.log("• See how blockchain provides security");
console.log("• Monitor transactions in the Network Logger tab"); 