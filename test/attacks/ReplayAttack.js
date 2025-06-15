const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ADS-B Replay Attack Tests", function () {
  let adsbData;
  let attacker;
  let legitimateUser;

  beforeEach(async function () {
    const AdsbData = await ethers.getContractFactory("AdsbData");
    [legitimateUser, attacker] = await ethers.getSigners();
    adsbData = await AdsbData.deploy();
    await adsbData.deployed();
  });

  it("Should detect replayed historical data", async function () {
    // Store original legitimate flight data
    const originalFlight = {
      icao24: "DEF456",
      callsign: "FL456",
      latitude: 40500000,  // 40.50°N
      longitude: -74000000, // 74.00°W
      altitude: 8000,
      onGround: false,
      isSpoofed: false
    };

    // Submit original flight data
    await adsbData.connect(legitimateUser).updateFlight(
      originalFlight.icao24,
      originalFlight.callsign,
      originalFlight.latitude,
      originalFlight.longitude,
      originalFlight.altitude,
      originalFlight.onGround,
      originalFlight.isSpoofed
    );

    // Wait for some time to pass
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Attempt to replay the exact same data
    await adsbData.connect(attacker).updateFlight(
      originalFlight.icao24,
      originalFlight.callsign,
      originalFlight.latitude,
      originalFlight.longitude,
      originalFlight.altitude,
      originalFlight.onGround,
      true  // marked as potentially spoofed
    );

    // Get the latest flights
    const [icao24s, callsigns, latitudes, longitudes, altitudes, onGrounds, timestamps, spoofedFlags] = 
      await adsbData.getLatestFlights(2);

    // Verify the replay attack is detected
    expect(spoofedFlags[1]).to.be.true;

    // Check if timestamps are different
    expect(timestamps[1]).to.be.gt(timestamps[0]);

    // Log the replay attempt details
    console.log("Original submission timestamp:", new Date(timestamps[0] * 1000).toISOString());
    console.log("Replay attempt timestamp:", new Date(timestamps[1] * 1000).toISOString());
    console.log("Time difference:", timestamps[1] - timestamps[0], "seconds");
  });

  it("Should detect modified replay attacks", async function () {
    // Original legitimate flight data
    const originalFlight = {
      icao24: "GHI789",
      callsign: "FL789",
      latitude: 35680000,   // 35.68°N
      longitude: 139770000, // 139.77°E
      altitude: 5000,
      onGround: false,
      isSpoofed: false
    };

    // Submit original flight data
    await adsbData.connect(legitimateUser).updateFlight(
      originalFlight.icao24,
      originalFlight.callsign,
      originalFlight.latitude,
      originalFlight.longitude,
      originalFlight.altitude,
      originalFlight.onGround,
      originalFlight.isSpoofed
    );

    // Wait for some time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Attempt to replay with slight modifications
    const modifiedFlight = {
      ...originalFlight,
      latitude: originalFlight.latitude + 10000,  // Small position change
      longitude: originalFlight.longitude + 10000,
      isSpoofed: true
    };

    await adsbData.connect(attacker).updateFlight(
      modifiedFlight.icao24,
      modifiedFlight.callsign,
      modifiedFlight.latitude,
      modifiedFlight.longitude,
      modifiedFlight.altitude,
      modifiedFlight.onGround,
      modifiedFlight.isSpoofed
    );

    // Get the latest flights
    const [, , latitudes, longitudes, , , timestamps, spoofedFlags] = 
      await adsbData.getLatestFlights(2);

    // Verify the modified replay is detected
    expect(spoofedFlags[1]).to.be.true;

    // Calculate position change
    const latDiff = Math.abs(latitudes[1] - latitudes[0]) / 1000000;
    const lonDiff = Math.abs(longitudes[1] - longitudes[0]) / 1000000;
    const timeDiff = timestamps[1] - timestamps[0];

    // Log the modifications
    console.log("Position change:", {
      latitudeDegrees: latDiff.toFixed(4),
      longitudeDegrees: lonDiff.toFixed(4),
      timeElapsed: timeDiff,
      "seconds": timeDiff
    });
  });
}); 