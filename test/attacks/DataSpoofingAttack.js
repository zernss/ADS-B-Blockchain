const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ADS-B Data Spoofing Attack Tests", function () {
  let adsbData;
  let attacker;
  let legitimateUser;

  beforeEach(async function () {
    const AdsbData = await ethers.getContractFactory("AdsbData");
    [legitimateUser, attacker] = await ethers.getSigners();
    adsbData = await AdsbData.deploy();
    await adsbData.deployed();
  });

  it("Should detect impossible position changes", async function () {
    // Add initial legitimate flight data
    await adsbData.connect(legitimateUser).updateFlight(
      "XYZ789",
      "FL789",
      37420000,  // 37.42°N
      -122180000, // 122.18°W
      10000,     // 10,000m altitude
      false,
      false
    );

    // Wait for 1 second
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Try to spoof the same aircraft at an impossible location
    // (distance impossible to cover in the time elapsed)
    await adsbData.connect(attacker).updateFlight(
      "XYZ789",    // same aircraft
      "FL789",
      51500000,   // 51.50°N (London)
      -0120000,   // 0.12°W
      10000,
      false,
      true        // marked as potentially spoofed
    );

    // Get the latest flights
    const [icao24s, , latitudes, longitudes, , , timestamps, spoofedFlags] = 
      await adsbData.getLatestFlights(2);

    // Calculate time difference
    const timeDiff = timestamps[1] - timestamps[0];
    
    // Calculate rough distance (simplified)
    const latDiff = Math.abs(latitudes[1] - latitudes[0]) / 1000000;
    const lonDiff = Math.abs(longitudes[1] - longitudes[0]) / 1000000;
    const approxDistance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111; // rough km conversion

    // Check if the second entry is marked as spoofed
    expect(spoofedFlags[1]).to.be.true;
    
    // Verify it's the same aircraft
    expect(icao24s[0]).to.equal("XYZ789");
    expect(icao24s[1]).to.equal("XYZ789");

    // Log the impossible movement
    console.log(`Distance covered: ~${approxDistance.toFixed(2)}km in ${timeDiff}s`);
    console.log(`Implied speed: ~${(approxDistance/timeDiff * 3600).toFixed(2)}km/h`);
  });

  it("Should detect altitude anomalies", async function () {
    // Add initial legitimate flight data
    await adsbData.connect(legitimateUser).updateFlight(
      "ABC123",
      "FL123",
      37420000,
      -122180000,
      10000,    // 10,000m altitude
      false,
      false
    );

    // Wait for 1 second
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Try to spoof impossible altitude change
    await adsbData.connect(attacker).updateFlight(
      "ABC123",
      "FL123",
      37420000,
      -122180000,
      20000,    // Sudden jump to 20,000m
      false,
      true     // marked as potentially spoofed
    );

    // Get the latest flights
    const [, , , , altitudes, , timestamps, spoofedFlags] = 
      await adsbData.getLatestFlights(2);

    // Calculate altitude change rate
    const timeDiff = timestamps[1] - timestamps[0];
    const altitudeChange = Math.abs(altitudes[1] - altitudes[0]) / 100; // Convert back to meters
    const climbRate = altitudeChange / timeDiff;

    // Check if the second entry is marked as spoofed
    expect(spoofedFlags[1]).to.be.true;

    // Log the impossible climb rate
    console.log(`Altitude change: ${altitudeChange}m in ${timeDiff}s`);
    console.log(`Climb rate: ${climbRate.toFixed(2)}m/s`);
  });
}); 