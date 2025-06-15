const fs = require('fs');
const path = require('path');

class FlightDataStorage {
    constructor(storageFile = 'flight_data.json') {
        this.storageFile = storageFile;
        this.flightData = [];
        this.loadData();
    }

    loadData() {
        try {
            if (fs.existsSync(this.storageFile)) {
                const data = fs.readFileSync(this.storageFile, 'utf8');
                this.flightData = JSON.parse(data);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            this.flightData = [];
        }
    }

    saveData() {
        try {
            fs.writeFileSync(this.storageFile, JSON.stringify(this.flightData, null, 2));
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    updateFlight(flight) {
        const {
            icao24,
            callsign,
            latitude,
            longitude,
            altitude,
            onGround,
            timestamp = Date.now()
        } = flight;

        this.flightData.push({
            icao24,
            callsign,
            latitude,
            longitude,
            altitude,
            onGround,
            timestamp
        });

        this.saveData();
        return true;
    }

    getFlight(index) {
        return this.flightData[index];
    }

    getFlightCount() {
        return this.flightData.length;
    }

    getLatestFlights(count) {
        return this.flightData.slice(-count);
    }

    // Vulnerable method that allows direct modification of data
    modifyFlight(index, newData) {
        if (index >= 0 && index < this.flightData.length) {
            this.flightData[index] = { ...this.flightData[index], ...newData };
            this.saveData();
            return true;
        }
        return false;
    }

    // Vulnerable method that allows deletion of records
    deleteFlight(index) {
        if (index >= 0 && index < this.flightData.length) {
            this.flightData.splice(index, 1);
            this.saveData();
            return true;
        }
        return false;
    }
}

module.exports = FlightDataStorage; 