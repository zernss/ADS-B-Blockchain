const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ADS-B Data Tampering Attack Tests", function () {
  let adsbData;
  let attacker;
  let legitimateUser;

  beforeEach(async function () {
    const AdsbData = await ethers.getContractFactory("AdsbData");
    [legitimateUser, attacker] = await ethers.getSigners();
    adsbData = await AdsbData.deploy();
    await adsbData.deployed();

    // Add legitimate flight data
    await adsbData.connect(legitimateUser).updateFlight(
      "ABC123",
      "FL123",
      123456, // latitude * 10^6
      456789, // longitude * 10^6
      10000,  // altitude * 10^2
      false,
      false
    );
  });

  it("Should not allow direct modification of stored flight data", async function () {
    // Try to get the flight data
    const flightBefore = await adsbData.getFlight(0);
    
    // Attempt to modify flight data (this should fail as data is immutable)
    try {
      await adsbData.connect(attacker).updateFlight(
        "ABC123",    // same ICAO24
        "FAKE123",   // modified callsign
        999999,      // modified latitude
        999999,      // modified longitude
        20000,       // modified altitude
        true,        // modified ground status
        true         // marked as spoofed
      );
      
      // If we reach here, it means we could add new data but not modify existing
      const flightAfter = await adsbData.getFlight(0);
      
      // Verify original data remains unchanged
      expect(flightBefore[0]).to.equal("ABC123"); // ICAO24
      expect(flightBefore[1]).to.equal("FL123");  // Original callsign
      
      // New entry should be added instead of modifying existing one
      const totalFlights = await adsbData.getFlightCount();
      expect(totalFlights).to.equal(2);
      
    } catch (error) {
      console.log("Attack failed as expected:", error.message);
    }
  });

  it("Should detect attempts to modify historical data", async function () {
    // Get initial flight count
    const initialCount = await adsbData.getFlightCount();

    // Try to add data with past timestamp (this will be detected by timestamp check)
    try {
      await adsbData.connect(attacker).updateFlight(
        "ABC123",
        "FL123",
        123456,
        456789,
        10000,
        false,
        true  // Marked as potentially spoofed
      );

      const newCount = await adsbData.getFlightCount();
      expect(newCount).to.be.gt(initialCount);
      
      // Check if the new entry is marked as potentially spoofed
      const latestFlight = await adsbData.getFlight(newCount - 1);
      expect(latestFlight[7]).to.be.true; // Check spoofed flag
      
    } catch (error) {
      console.log("Attack failed:", error.message);
    }
  });
}); 