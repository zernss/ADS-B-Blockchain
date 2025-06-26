const fetch = require('node-fetch');

const RELAY_SERVER_URL = 'http://localhost:3001';

async function testRelaySystem() {
  console.log("🧪 Testing Relay System");
  console.log("=======================\n");

  try {
    // 1. Test health endpoint
    console.log("1. Testing health endpoint...");
    const healthResponse = await fetch(`${RELAY_SERVER_URL}/health`);
    const healthData = await healthResponse.json();
    console.log("   ✅ Health check passed:", healthData);

    // 2. Test flight count
    console.log("\n2. Testing flight count...");
    const countResponse = await fetch(`${RELAY_SERVER_URL}/flight-count`);
    const countData = await countResponse.json();
    console.log("   ✅ Flight count:", countData.count);

    // 3. Test getting all flights
    console.log("\n3. Testing get all flights...");
    const flightsResponse = await fetch(`${RELAY_SERVER_URL}/flights`);
    const flightsData = await flightsResponse.json();
    console.log("   ✅ Retrieved flights:", flightsData.flights.length);
    
    if (flightsData.flights.length > 0) {
      console.log("   📊 Sample flight:", {
        icao24: flightsData.flights[0].icao24,
        callsign: flightsData.flights[0].callsign,
        latitude: flightsData.flights[0].latitude,
        longitude: flightsData.flights[0].longitude,
        altitude: flightsData.flights[0].altitude
      });
    }

    // 4. Test adding a single flight
    console.log("\n4. Testing add single flight...");
    const testFlight = {
      icao24: "test123",
      callsign: "TEST123",
      latitude: 40.7128,
      longitude: -74.0060,
      altitude: 1000,
      onGround: false,
      isSpoofed: false
    };

    const addFlightResponse = await fetch(`${RELAY_SERVER_URL}/add-flight`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testFlight)
    });

    const addFlightData = await addFlightResponse.json();
    
    if (addFlightData.success) {
      console.log("   ✅ Single flight added successfully:", {
        transactionHash: addFlightData.transactionHash,
        blockNumber: addFlightData.blockNumber,
        gasUsed: addFlightData.gasUsed
      });
    } else {
      console.log("   ❌ Failed to add single flight:", addFlightData.error);
    }

    // 5. Test adding a batch of flights
    console.log("\n5. Testing add batch flights...");
    const testBatch = [
      {
        icao24: "batch001",
        callsign: "BATCH001",
        latitude: 40.7128,
        longitude: -74.0060,
        altitude: 1000,
        onGround: false,
        isSpoofed: false
      },
      {
        icao24: "batch002",
        callsign: "BATCH002",
        latitude: 40.7589,
        longitude: -73.9851,
        altitude: 1500,
        onGround: false,
        isSpoofed: false
      }
    ];

    const addBatchResponse = await fetch(`${RELAY_SERVER_URL}/add-flights-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ flights: testBatch })
    });

    const addBatchData = await addBatchResponse.json();
    
    if (addBatchData.success) {
      console.log("   ✅ Batch flights added successfully:", {
        transactionHash: addBatchData.transactionHash,
        blockNumber: addBatchData.blockNumber,
        gasUsed: addBatchData.gasUsed,
        flightsCount: addBatchData.flightsCount
      });
    } else {
      console.log("   ❌ Failed to add batch flights:", addBatchData.error);
    }

    // 6. Test attack simulation
    console.log("\n6. Testing attack simulation...");
    const attackResponse = await fetch(`${RELAY_SERVER_URL}/simulate-attack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        attackType: 'replay',
        targetFlight: testFlight
      })
    });

    const attackData = await attackResponse.json();
    
    if (attackData.success) {
      console.log("   ✅ Attack simulation completed:", {
        attackType: attackData.attackType,
        detectedByBlockchain: attackData.detectedByBlockchain,
        reason: attackData.reason
      });
    } else {
      console.log("   ❌ Attack simulation failed:", attackData.error);
    }

    console.log("\n✅ All relay system tests completed successfully!");

  } catch (error) {
    console.error("❌ Relay system test failed:", error.message);
  }
}

// Run the test
testRelaySystem().catch(console.error); 