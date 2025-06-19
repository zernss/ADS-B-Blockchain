import { fetchFlightData } from './OpenSkyService';
import blockchainLogger from './BlockchainLogger';

class TraditionalSystem {
  constructor() {
    this.flights = new Map();
    this.verificationDelay = 2000; // 2 seconds delay to simulate network latency
  }

  async addFlightData(flight) {
    this.flights.set(flight.icao24, flight);
    blockchainLogger.log('info', 'Flight data added to traditional system', {
      icao24: flight.icao24,
      callsign: flight.callsign,
      latitude: flight.latitude,
      longitude: flight.longitude,
      altitude: flight.altitude
    });
    return true;
  }

  async verifyFlightData(icao24) {
    await new Promise(resolve => setTimeout(resolve, this.verificationDelay));
    const exists = this.flights.has(icao24);
    blockchainLogger.log('info', 'Flight data verified in traditional system', {
      icao24,
      verified: exists
    });
    return exists;
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
    if (!this.contract) {
      blockchainLogger.log('error', 'Cannot add flight data: Contract not available');
      return false;
    }
    
    try {
      blockchainLogger.log('info', 'Adding flight data to blockchain', {
        icao24: flight.icao24,
        callsign: flight.callsign,
        latitude: flight.latitude,
        longitude: flight.longitude,
        altitude: flight.altitude
      });

      const tx = await this.contract.updateFlight(
        flight.icao24,
        flight.callsign || '',
        Math.floor(flight.latitude * 1e6),
        Math.floor(flight.longitude * 1e6),
        Math.floor(flight.altitude),
        flight.onGround || false,
        flight.isSpoofed || false
      );

      blockchainLogger.log('transaction', 'Flight data transaction submitted', {
        transactionHash: tx.hash,
        icao24: flight.icao24
      });

      const receipt = await tx.wait();
      
      blockchainLogger.log('success', 'Flight data added to blockchain successfully', {
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        icao24: flight.icao24
      });

      return true;
    } catch (error) {
      blockchainLogger.log('error', 'Failed to add flight data to blockchain', {
        icao24: flight.icao24,
        error: error.message
      });
      return false;
    }
  }

  async addFlightDataBatch(flights) {
    if (!this.contract) {
      blockchainLogger.log('error', 'Cannot add flight data batch: Contract not available');
      return false;
    }
    
    try {
      blockchainLogger.log('info', 'Adding flight data batch to blockchain', {
        count: flights.length,
        icao24s: flights.map(f => f.icao24)
      });

      const icao24s = flights.map(f => f.icao24);
      const callsigns = flights.map(f => f.callsign || '');
      const latitudes = flights.map(f => Math.floor(f.latitude * 1e6));
      const longitudes = flights.map(f => Math.floor(f.longitude * 1e6));
      const altitudes = flights.map(f => Math.floor(f.altitude));
      const onGrounds = flights.map(f => f.onGround || false);
      const isSpoofedFlags = flights.map(f => f.isSpoofed || false);

      const tx = await this.contract.updateFlightBatch(
        icao24s,
        callsigns,
        latitudes,
        longitudes,
        altitudes,
        onGrounds,
        isSpoofedFlags
      );

      blockchainLogger.log('transaction', 'Flight data batch transaction submitted', {
        transactionHash: tx.hash,
        count: flights.length
      });

      const receipt = await tx.wait();
      
      blockchainLogger.log('success', 'Flight data batch added to blockchain successfully', {
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        count: flights.length
      });

      return true;
    } catch (error) {
      blockchainLogger.log('error', 'Failed to add flight data batch to blockchain', {
        count: flights.length,
        error: error.message
      });
      return false;
    }
  }

  async verifyFlightData(icao24) {
    if (!this.contract) {
      blockchainLogger.log('error', 'Cannot verify flight data: Contract not available');
      return false;
    }
    
    try {
      const flightCount = await this.contract.getFlightCount();
      blockchainLogger.log('info', 'Checking flight data on blockchain', {
        icao24,
        totalFlights: flightCount.toString()
      });

      // Check if the flight exists by iterating through all flights
      for (let i = 0; i < flightCount; i++) {
        const flight = await this.contract.getFlight(i);
        if (flight[0] === icao24) {
          blockchainLogger.log('success', 'Flight data verified on blockchain', {
            icao24,
            callsign: flight[1],
            timestamp: new Date(flight[6].toNumber() * 1000)
          });
          return true;
        }
      }

      blockchainLogger.log('warning', 'Flight data not found on blockchain', { icao24 });
      return false;
    } catch (error) {
      blockchainLogger.log('error', 'Failed to verify flight data on blockchain', {
        icao24,
        error: error.message
      });
      return false;
    }
  }

  async getFlightData(icao24) {
    if (!this.contract) return null;
    
    try {
      const flightCount = await this.contract.getFlightCount();
      
      for (let i = 0; i < flightCount; i++) {
        const flight = await this.contract.getFlight(i);
        if (flight[0] === icao24) {
          return {
            icao24,
            callsign: flight[1],
            latitude: flight[2].toNumber() / 1e6,
            longitude: flight[3].toNumber() / 1e6,
            altitude: flight[4].toNumber(),
            onGround: flight[5],
            timestamp: new Date(flight[6].toNumber() * 1000),
            isSpoofed: flight[7],
            isVerified: true
          };
        }
      }
      return null;
    } catch (error) {
      blockchainLogger.log('error', 'Failed to get flight data from blockchain', {
        icao24,
        error: error.message
      });
      return null;
    }
  }

  async getAllFlights() {
    if (!this.contract) return [];
    
    try {
      const flightCount = await this.contract.getFlightCount();
      const flights = [];
      
      for (let i = 0; i < flightCount; i++) {
        const flight = await this.contract.getFlight(i);
        flights.push({
          icao24: flight[0],
          callsign: flight[1],
          latitude: flight[2].toNumber() / 1e6,
          longitude: flight[3].toNumber() / 1e6,
          altitude: flight[4].toNumber(),
          onGround: flight[5],
          timestamp: new Date(flight[6].toNumber() * 1000),
          isSpoofed: flight[7],
          isVerified: true
        });
      }
      
      blockchainLogger.log('info', 'Retrieved all flights from blockchain', {
        count: flights.length
      });
      
      return flights;
    } catch (error) {
      blockchainLogger.log('error', 'Failed to get all flights from blockchain', {
        error: error.message
      });
      return [];
    }
  }
}

class FlightDataService {
  constructor(contract = null) {
    this.traditionalSystem = new TraditionalSystem();
    this.blockchainSystem = new BlockchainSystem(contract);
    
    // Initialize blockchain logger if contract is available
    if (contract) {
      const provider = contract.provider;
      blockchainLogger.initialize(provider, contract);
    }
  }

  async start() {
    blockchainLogger.log('info', 'Flight Data Service started');
    // Initial data fetch
    await this.updateFlightData();
  }

  stop() {
    blockchainLogger.log('info', 'Flight Data Service stopped');
    blockchainLogger.stopListening();
  }

  async updateFlightData() {
    try {
      blockchainLogger.log('info', 'Starting flight data update from OpenSky Network');
      
      // Force refresh to get new data from OpenSky Network
      const flights = await fetchFlightData(true);
      
      if (!flights || !Array.isArray(flights)) {
        blockchainLogger.log('error', 'Invalid flight data received from OpenSky Network');
        return [];
      }

      blockchainLogger.log('info', 'Received flight data from OpenSky Network', {
        count: flights.length
      });

      // Clear previous data
      this.traditionalSystem = new TraditionalSystem();
      
      // Add new flight data to both systems
      let traditionalSuccess = 0;
      let blockchainSuccess = 0;
      
      for (const flight of flights) {
        const traditionalResult = await this.traditionalSystem.addFlightData(flight);
        if (traditionalResult) traditionalSuccess++;
        
        const blockchainResult = await this.blockchainSystem.addFlightData(flight);
        if (blockchainResult) blockchainSuccess++;
      }

      blockchainLogger.log('success', 'Flight data update completed', {
        totalFlights: flights.length,
        traditionalSuccess,
        blockchainSuccess
      });

      return flights;
    } catch (error) {
      blockchainLogger.log('error', 'Failed to update flight data', {
        error: error.message
      });
      return [];
    }
  }

  async simulateAttack(attackType, targetFlight) {
    blockchainLogger.log('warning', `Simulating ${attackType} attack`, {
      targetFlight: targetFlight.callsign,
      icao24: targetFlight.icao24
    });

    const attackedFlight = { ...targetFlight };
    const originalFlight = { ...targetFlight };

    switch (attackType) {
      case 'replay':
        // Replay attack: use old position data with gradual position shift
        attackedFlight.timestamp = new Date(attackedFlight.timestamp.getTime() - 3600000); // 1 hour old
        attackedFlight.latitude += (Math.random() * 0.5 - 0.25); // Small random shift
        attackedFlight.longitude += (Math.random() * 0.5 - 0.25);
        blockchainLogger.log('info', 'Replay attack: Modified timestamp and position', {
          originalTimestamp: originalFlight.timestamp,
          attackedTimestamp: attackedFlight.timestamp,
          positionShift: {
            lat: attackedFlight.latitude - originalFlight.latitude,
            lon: attackedFlight.longitude - originalFlight.longitude
          }
        });
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
        attackedFlight.isSpoofed = true;
        
        blockchainLogger.log('info', 'Spoofing attack: Created fake flight data', {
          originalPosition: {
            lat: originalFlight.latitude,
            lon: originalFlight.longitude,
            alt: originalFlight.altitude
          },
          spoofedPosition: {
            lat: attackedFlight.latitude,
            lon: attackedFlight.longitude,
            alt: attackedFlight.altitude
          }
        });
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

    const result = {
      detectedByTraditional: !traditionalVerified,
      detectedByBlockchain: !blockchainVerified,
      attackedFlight
    };

    blockchainLogger.log('info', 'Attack simulation completed', {
      attackType,
      targetFlight: targetFlight.callsign,
      traditionalDetected: result.detectedByTraditional,
      blockchainDetected: result.detectedByBlockchain
    });

    return result;
  }

  getTraditionalSystem() {
    return this.traditionalSystem;
  }

  getBlockchainSystem() {
    return this.blockchainSystem;
  }
}

export default FlightDataService; 