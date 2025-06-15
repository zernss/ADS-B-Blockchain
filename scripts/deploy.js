// scripts/deploy.js

const hre = require("hardhat");
const updateWebConfig = require('./update-web-config');

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Get the network
  const network = await hre.ethers.provider.getNetwork();
  
  // Deploy the contract
  const AdsbData = await hre.ethers.getContractFactory("AdsbData");
  const adsbData = await AdsbData.deploy();
  await adsbData.deployed();

  console.log("AdsbData deployed to:", adsbData.address);

  // Update web interface config
  await updateWebConfig(adsbData.address, network.chainId.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
