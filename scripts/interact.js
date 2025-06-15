const { ethers } = require("hardhat");

async function main() {
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  // Get the network information
  const provider = ethers.provider;
  const network = await provider.getNetwork();
  console.log("Connected to network:", {
    name: network.name,
    chainId: Number(network.chainId)
  });

  // Get the signer's (your) address and balance
  const [signer] = await ethers.getSigners();
  const balance = await provider.getBalance(signer.address);
  console.log("Your address:", signer.address);
  console.log("Your balance:", ethers.utils.formatEther(balance), "ETH");

  const AdsbData = await ethers.getContractFactory("AdsbData");
  const adsbData = AdsbData.attach(contractAddress).connect(signer);

  const flightData = {
    icao24: "ABC123",
    callsign: "XYZ789",
    latitude: 5678900, // 5.6789 degrees (multiplied by 10^6)
    longitude: -2345600, // -2.3456 degrees (multiplied by 10^6)
    altitude: 1234, // 12.34 meters (multiplied by 10^2)
    onGround: false,
    isSpoofed: false
  };

  try {
    // First, let's check how many flights are stored
    const flightCount = await adsbData.getFlightCount();
    console.log("\n📊 Current flight count:", flightCount.toString());

    console.log("\n📡 Sending data to blockchain...");
    console.log("Data being sent:", {
      ...flightData,
      latitude: flightData.latitude / 1000000,
      longitude: flightData.longitude / 1000000,
      altitude: flightData.altitude / 100
    });

    // Get gas estimate first
    const gasEstimate = await adsbData.estimateGas.updateFlight(
      flightData.icao24,
      flightData.callsign,
      flightData.latitude,
      flightData.longitude,
      flightData.altitude,
      flightData.onGround,
      flightData.isSpoofed
    );
    
    console.log("\n⛽ Gas info:");
    console.log("- Estimated gas:", gasEstimate.toString(), "units");
    
    // Get current gas price
    const gasPrice = await provider.getGasPrice();
    console.log("- Gas price:", ethers.utils.formatUnits(gasPrice, "gwei"), "Gwei");
    
    // Calculate estimated cost
    const estimatedCost = gasEstimate.mul(gasPrice);
    console.log("- Estimated cost:", ethers.utils.formatEther(estimatedCost), "ETH");

    console.log("\n🔄 Sending transaction...");
    const tx = await adsbData.updateFlight(
      flightData.icao24,
      flightData.callsign,
      flightData.latitude,
      flightData.longitude,
      flightData.altitude,
      flightData.onGround,
      flightData.isSpoofed,
      {
        gasLimit: gasEstimate.mul(11).div(10) // Add 10% buffer
      }
    );
    
    console.log("Transaction hash:", tx.hash);
    
    console.log("\n⏳ Waiting for confirmation...");
    const receipt = await tx.wait();
    console.log("✅ Transaction successful!");
    console.log("- Block number:", receipt.blockNumber);
    console.log("- Gas used:", receipt.gasUsed.toString(), "units");
    
    // Calculate actual cost
    const actualCost = receipt.gasUsed.mul(gasPrice);
    console.log("- Total cost:", ethers.utils.formatEther(actualCost), "ETH");

    // Get updated balance
    const newBalance = await provider.getBalance(signer.address);
    console.log("\nRemaining balance:", ethers.utils.formatEther(newBalance), "ETH");
    console.log("Change:", ethers.utils.formatEther(newBalance.sub(balance)), "ETH");

    // Read back the data
    console.log("\n📡 Reading data from blockchain...");
    
    // Get the latest flights
    const latestFlightCount = Math.min(5, flightCount.toNumber());
    console.log(`\nFetching latest ${latestFlightCount} flights:`);
    const [
      icao24s,
      callsigns,
      latitudes,
      longitudes,
      altitudes,
      onGrounds,
      timestamps,
      spoofedFlags
    ] = await adsbData.getLatestFlights(latestFlightCount);
    
    for (let i = 0; i < icao24s.length; i++) {
      console.log(`\nFlight #${i + 1}:`);
      console.log({
        icao24: icao24s[i],
        callsign: callsigns[i],
        latitude: ethers.utils.formatUnits(latitudes[i], 6),
        longitude: ethers.utils.formatUnits(longitudes[i], 6),
        altitude: ethers.utils.formatUnits(altitudes[i], 2),
        onGround: onGrounds[i],
        timestamp: new Date(timestamps[i].toNumber() * 1000).toISOString(),
        isSpoofed: spoofedFlags[i]
      });
    }

  } catch (error) {
    console.error("❌ Interaction failed:", error.message);
    if (error.transaction) {
      console.error("Transaction data:", error.transaction);
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  });
