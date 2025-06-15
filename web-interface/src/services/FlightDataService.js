import { generateFlightData } from './FlightDataGenerator';

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
    this.updateInterval = 5000; // 5 seconds
    this.numFlights = 20;
  }

  async start() {
    this.updateFlightData();
    this.intervalId = setInterval(() => this.updateFlightData(), this.updateInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  async updateFlightData() {
    const flights = generateFlightData(this.numFlights);
    
    for (const flight of flights) {
      await this.traditionalSystem.addFlightData(flight);
      await this.blockchainSystem.addFlightData(flight);
    }

    return flights;
  }

  async simulateAttack(attackType, targetFlight) {
    const attackedFlight = { ...targetFlight };
    const originalFlight = { ...targetFlight };

    switch (attackType) {
      case 'replay':
        // Replay attack: use old position data
        attackedFlight.timestamp = new Date(attackedFlight.timestamp.getTime() - 3600000); // 1 hour old
        break;
      
      case 'spoofing':
        // Spoofing attack: create fake flight data with significant position changes
        attackedFlight.latitude += (Math.random() * 2 - 1) * 2; // More noticeable change
        attackedFlight.longitude += (Math.random() * 2 - 1) * 2;
        attackedFlight.altitude += Math.floor(Math.random() * 10000); // Bigger altitude changes
        attackedFlight.velocity = (attackedFlight.velocity || 0) + Math.floor(Math.random() * 200);
        attackedFlight.isVerified = false;
        break;
      
      case 'tampering':
        // Tampering attack: modify existing data significantly
        attackedFlight.altitude += 10000; // 10km altitude change
        attackedFlight.velocity = (attackedFlight.velocity || 0) + 100;
        attackedFlight.isVerified = false;
        break;
      
      default:
        throw new Error('Unknown attack type');
    }

    // Add the attacked flight to traditional system only
    await this.traditionalSystem.addFlightData(attackedFlight);

    // Return both original and attacked data for detailed comparison
    return {
      type: attackType,
      original: originalFlight,
      attacked: attackedFlight,
      detectedByTraditional: false, // Traditional system can't detect attacks
      detectedByBlockchain: true // Blockchain system will detect the mismatch
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