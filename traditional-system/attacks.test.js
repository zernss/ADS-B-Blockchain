const assert = require('assert');
const fs = require('fs');
const FlightDataStorage = require('./FlightDataStorage');

describe('Traditional System Vulnerability Tests', () => {
    let storage;
    const testFile = 'test_flight_data.json';

    beforeEach(() => {
        // Create new storage instance for each test
        storage = new FlightDataStorage(testFile);
    });

    afterEach(() => {
        // Clean up test file after each test
        if (fs.existsSync(testFile)) {
            fs.unlinkSync(testFile);
        }
    });

    describe('Data Tampering Vulnerabilities', () => {
        it('Can modify existing flight data directly', () => {
            // Add initial flight data
            const originalFlight = {
                icao24: "ABC123",
                callsign: "FL123",
                latitude: 123456,
                longitude: 456789,
                altitude: 10000,
                onGround: false
            };
            storage.updateFlight(originalFlight);

            // Attempt to modify the data
            const modifiedData = {
                callsign: "FAKE123",
                latitude: 999999,
                longitude: 999999
            };
            
            const success = storage.modifyFlight(0, modifiedData);
            const modifiedFlight = storage.getFlight(0);

            // In traditional system, modification succeeds
            assert.strictEqual(success, true);
            assert.strictEqual(modifiedFlight.callsign, "FAKE123");
            assert.strictEqual(modifiedFlight.latitude, 999999);
            console.log('❌ Vulnerability: Direct data modification possible in traditional system');
        });

        it('Can delete flight records', () => {
            // Add flight data
            storage.updateFlight({
                icao24: "ABC123",
                callsign: "FL123",
                latitude: 123456,
                longitude: 456789,
                altitude: 10000,
                onGround: false
            });

            const initialCount = storage.getFlightCount();
            const success = storage.deleteFlight(0);
            const finalCount = storage.getFlightCount();

            // In traditional system, deletion succeeds
            assert.strictEqual(success, true);
            assert.strictEqual(finalCount, initialCount - 1);
            console.log('❌ Vulnerability: Record deletion possible in traditional system');
        });
    });

    describe('Data Spoofing Vulnerabilities', () => {
        it('Can manipulate timestamps', () => {
            // Add flight with manipulated timestamp
            const pastTimestamp = Date.now() - 3600000; // 1 hour ago
            storage.updateFlight({
                icao24: "XYZ789",
                callsign: "FL789",
                latitude: 37420000,
                longitude: -122180000,
                altitude: 10000,
                onGround: false,
                timestamp: pastTimestamp
            });

            const flight = storage.getFlight(0);
            assert.strictEqual(flight.timestamp, pastTimestamp);
            console.log('❌ Vulnerability: Timestamp manipulation possible in traditional system');
        });

        it('Can modify file directly', () => {
            // Add legitimate flight
            storage.updateFlight({
                icao24: "DEF456",
                callsign: "FL456",
                latitude: 40500000,
                longitude: -74000000,
                altitude: 8000,
                onGround: false
            });

            // Directly modify the storage file
            const data = JSON.parse(fs.readFileSync(testFile, 'utf8'));
            data[0].callsign = "HACKED";
            fs.writeFileSync(testFile, JSON.stringify(data));

            // Reload data
            storage.loadData();
            const modifiedFlight = storage.getFlight(0);

            assert.strictEqual(modifiedFlight.callsign, "HACKED");
            console.log('❌ Vulnerability: Direct file manipulation possible in traditional system');
        });
    });

    describe('Replay Attack Vulnerabilities', () => {
        it('Can replay exact same data multiple times', () => {
            const flightData = {
                icao24: "DEF456",
                callsign: "FL456",
                latitude: 40500000,
                longitude: -74000000,
                altitude: 8000,
                onGround: false,
                timestamp: Date.now()
            };

            // Add same data multiple times
            storage.updateFlight(flightData);
            storage.updateFlight(flightData);
            storage.updateFlight(flightData);

            const totalFlights = storage.getFlightCount();
            assert.strictEqual(totalFlights, 3);
            
            // Verify all entries are identical
            const flights = storage.getLatestFlights(3);
            assert.deepStrictEqual(flights[0].icao24, flights[1].icao24);
            assert.deepStrictEqual(flights[1].icao24, flights[2].icao24);
            console.log('❌ Vulnerability: Replay attacks possible in traditional system');
        });
    });

    describe('Data Integrity Vulnerabilities', () => {
        it('No cryptographic verification of data', () => {
            // Add flight data
            storage.updateFlight({
                icao24: "ABC123",
                callsign: "FL123",
                latitude: 123456,
                longitude: 456789,
                altitude: 10000,
                onGround: false
            });

            // Read and modify file content directly
            const fileContent = fs.readFileSync(testFile, 'utf8');
            const modifiedContent = fileContent.replace("FL123", "TAMPERED");
            fs.writeFileSync(testFile, modifiedContent);

            // Reload data
            storage.loadData();
            const flight = storage.getFlight(0);
            assert.strictEqual(flight.callsign, "TAMPERED");
            console.log('❌ Vulnerability: No cryptographic verification of data integrity');
        });
    });
}); 