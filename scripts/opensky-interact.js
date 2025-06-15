const { ethers } = require("hardhat");
const axios = require("axios");

async function fetchOpenSkyData() {
  try {
    const response = await axios.get('https://old.opensky-network.org/api/states/all');
    return response.data.states;
  } catch (error) {
    console.error('Error fetching OpenSky data:', error.message);
    return [];
  }
}

function processADSBData(flight) {
  if (!flight || flight.length < 17) return null;

  const callsign = (flight[1] || "UNKNOWN").trim();
  if (!callsign) return null;

  return {
    icao24: flight[0],
    callsign: callsign,
    latitude: Math.round(flight[6] * 1000000),
    longitude: Math.round(flight[5] * 1000000),
    altitude: Math.round(flight[7] * 100),
    onGround: flight[8] || false,
    isSpoofed: flight[16] || false
  };
}

async function main() {
  try {
    // Get the contract instance
    const [signer] = await ethers.getSigners();
    const provider = ethers.provider;
    const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const AdsbData = await ethers.getContractFactory("AdsbData");
    const adsbData = AdsbData.attach(contractAddress).connect(signer);

    console.log("Fetching data from OpenSky Network...");
    const flights = await fetchOpenSkyData();
    console.log(`Retrieved ${flights.length} flights from OpenSky Network\n`);

    // Process only the first 5 flights for testing
    const processLimit = 5;
    let processedCount = 0;

    for (const flight of flights) {
      if (processedCount >= processLimit) break;

      const processedData = processADSBData(flight);
      if (!processedData) continue;

      console.log("Processing flight:", {
        ...processedData,
        latitude: processedData.latitude / 1000000,
        longitude: processedData.longitude / 1000000,
        altitude: processedData.altitude / 100
      });

      try {
        const tx = await adsbData.updateFlight(
          processedData.icao24,
          processedData.callsign,
          processedData.latitude,
          processedData.longitude,
          processedData.altitude,
          processedData.onGround,
          processedData.isSpoofed,
          { gasLimit: 300000 }
        );

        console.log(`Transaction hash: ${tx.hash}`);
        await tx.wait();
        console.log(`Successfully updated flight ${processedData.callsign}\n`);
        processedCount++;
      } catch (error) {
        console.error(`Error updating flight ${processedData.callsign}:`, error.message);
      }
    }

    try {
      // Get the count of flights
      const flightCount = await adsbData.getFlightCount();
      console.log(`Total flights in blockchain: ${flightCount.toString()}\n`);

      // Get the latest flights
      console.log("Latest flights in blockchain:");
      const latestFlightCount = Math.min(5, flightCount.toNumber());
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
      console.error("Error reading flight data:", error.message);
    }

  } catch (error) {
    console.error("Error in main function:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });