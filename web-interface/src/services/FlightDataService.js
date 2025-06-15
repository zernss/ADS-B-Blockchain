import { fetchFlightData } from './OpenSkyService';

class TraditionalSystem {
  constructor() {
    this.flights = new Map();
    this.verificationDelay = 2000; // 2 seconds delay to simulate network latency
  }

  async addFlightData(flight) {
    this.flights.set(flight.icao24, flight);
    return true;
  }

  async verifyFlightData(icao24) {
    await new Promise(resolve => setTimeout(resolve, this.verificationDelay));
    return this.flights.has(icao24);
  }

  async getFlightData(icao24) {
    return this.flights.get(icao24);
  }

  async getAllFlights() {
    return Array.from(this.flights.values());
  }
}

class BlockchainSystem {
  constructor(contract) {
    this.contract = contract;
  }

  async addFlightData(flight) {
    if (!this.contract) return false;
    try {
      const tx = await this.contract.addFlightData(
        flight.icao24,
        flight.callsign,
        Math.floor(flight.latitude * 1e6),
        Math.floor(flight.longitude * 1e6),
        Math.floor(flight.altitude),
        flight.timestamp.getTime()
      );
      await tx.wait();
      return true;
    } catch (error) {
      console.error('Error adding flight data to blockchain:', error);
      return false;
    }
  }

  async verifyFlightData(icao24) {
    if (!this.contract) return false;
    try {
      const data = await this.contract.getFlightData(icao24);
      return data.timestamp > 0; // If timestamp exists, data is verified
    } catch (error) {
      console.error('Error verifying flight data:', error);
      return false;
    }
  }

  async getFlightData(icao24) {
    if (!this.contract) return null;
    try {
      const data = await this.contract.getFlightData(icao24);
      if (data.timestamp === 0) return null;
      
      return {
        icao24,
        callsign: data.callsign,
        latitude: data.latitude / 1e6,
        longitude: data.longitude / 1e6,
        altitude: data.altitude,
        timestamp: new Date(data.timestamp.toNumber()),
        isVerified: true
      };
    } catch (error) {
      console.error('Error getting flight data:', error);
      return null;
    }
  }
}

class FlightDataService {
  constructor(contract = null) {
    this.traditionalSystem = new TraditionalSystem();
    this.blockchainSystem = new BlockchainSystem(contract);
  }

  async start() {
    // Initial data fetch
    await this.updateFlightData();
  }

  stop() {
    // Nothing to stop since we removed automatic updates
  }

  async updateFlightData() {
    try {
      // Force refresh to get new data from OpenSky Network
      const flights = await fetchFlightData(true);
      
      if (!flights || !Array.isArray(flights)) {
        console.error('Invalid flight data received');
        return [];
      }

      // Clear previous data
      this.traditionalSystem = new TraditionalSystem();
      
      // Add new flight data to both systems
      for (const flight of flights) {
        await this.traditionalSystem.addFlightData(flight);
        await this.blockchainSystem.addFlightData(flight);
      }

      return flights;
    } catch (error) {
      console.error('Error updating flight data:', error);
      return [];
    }
  }

  async simulateAttack(attackType, targetFlight) {
    const attackedFlight = { ...targetFlight };
    const originalFlight = { ...targetFlight };

    switch (attackType) {
      case 'replay':
        // Replay attack: use old position data with gradual position shift
        attackedFlight.timestamp = new Date(attackedFlight.timestamp.getTime() - 3600000); // 1 hour old
        attackedFlight.latitude += (Math.random() * 0.5 - 0.25); // Small random shift
        attackedFlight.longitude += (Math.random() * 0.5 - 0.25);
        break;
      
      case 'spoofing':
        // Spoofing attack: create fake flight data with smooth position changes
        const targetLat = attackedFlight.latitude + (Math.random() * 2 - 1) * 2;
        const targetLon = attackedFlight.longitude + (Math.random() * 2 - 1) * 2;
        const targetAlt = attackedFlight.altitude + Math.floor(Math.random() * 10000);
        
        attackedFlight.latitude = targetLat;
        attackedFlight.longitude = targetLon;
        attackedFlight.altitude = targetAlt;
        attackedFlight.velocity = (attackedFlight.velocity || 0) + Math.floor(Math.random() * 200);
        attackedFlight.isVerified = false;
        break;
        
      default:
        throw new Error('Unknown attack type');
    }

    // Add the attacked flight to both systems
    await this.traditionalSystem.addFlightData(attackedFlight);
    await this.blockchainSystem.addFlightData(attackedFlight);

    // Verify the flight data in both systems
    const [traditionalVerified, blockchainVerified] = await Promise.all([
      this.traditionalSystem.verifyFlightData(attackedFlight.icao24),
      this.blockchainSystem.verifyFlightData(attackedFlight.icao24)
    ]);

    return {
      detectedByTraditional: !traditionalVerified,
      detectedByBlockchain: !blockchainVerified,
      attackedFlight
    };
  }

  getTraditionalSystem() {
    return this.traditionalSystem;
  }

  getBlockchainSystem() {
    return this.blockchainSystem;
  }
}

export default FlightDataService; 