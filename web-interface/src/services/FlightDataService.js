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

  async addFlightDataWithDetails(flight) {
    if (!this.contract) {
      blockchainLogger.log('error', 'Cannot add flight data: Contract not available');
      return null;
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
      // Parse event logs
      const eventLogs = [];
      if (receipt && receipt.logs && receipt.logs.length > 0) {
        for (const log of receipt.logs) {
          try {
            const parsed = this.contract.interface.parseLog(log);
            eventLogs.push({
              name: parsed.name,
              values: parsed.args
            });
          } catch (e) {
            // Not a contract event we care about
          }
        }
      }
      return {
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        eventLogs
      };
    } catch (error) {
      blockchainLogger.log('error', 'Failed to add flight data to blockchain', {
        icao24: flight.icao24,
        error: error.message
      });
      error.eventLogs = [];
      if (error.receipt && error.receipt.logs && error.receipt.logs.length > 0) {
        for (const log of error.receipt.logs) {
          try {
            const parsed = this.contract.interface.parseLog(log);
            error.eventLogs.push({
              name: parsed.name,
              values: parsed.args
            });
          } catch (e) {}
        }
      }
      throw error;
    }
  }
}

class FlightDataService {
  constructor(contract = null) {
    this.traditionalSystem = new TraditionalSystem();
    this.blockchainSystem = contract ? new BlockchainSystem(contract) : null;
    this.isUpdating = false;

    // Load initial data from OpenSky Network
    this.updateInterval = null;
  }

  async start() {
    await this.updateFlightData();
  }

  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  async updateFlightData(forceRefresh = false) {
    if (this.isUpdating) {
      blockchainLogger.log('info', 'Update already in progress, skipping...');
      return [];
    }
    
    this.isUpdating = true;
    blockchainLogger.log('info', 'Updating flight data...');

    try {
      const flights = await fetchFlightData(forceRefresh);

      if (!flights || flights.length === 0) {
        blockchainLogger.log('warning', 'No new flight data received from OpenSky');
        return [];
      }
      
      // Add data to both systems
      if (this.blockchainSystem) {
        await this.blockchainSystem.addFlightDataBatch(flights);
      }
      for (const flight of flights) {
        await this.traditionalSystem.addFlightData(flight);
      }
      
      blockchainLogger.log('success', `Successfully updated ${flights.length} flights`);

      return flights;
    } catch (error) {
      blockchainLogger.log('error', 'Failed to update flight data', {
        error: error.message
      });
      return [];
    } finally {
      this.isUpdating = false;
    }
  }

  async simulateAttack(attackType, targetFlight) {
    if (this.blockchainSystem) {
      let attackedFlight = null; // Ensure attackedFlight is always defined
      try {
        // Create the attacked flight with more severe modifications
        attackedFlight = { ...targetFlight };
        
        switch (attackType) {
          case 'replay':
            // Make timestamp 1 hour old (should trigger replay detection)
            attackedFlight.timestamp = new Date(targetFlight.timestamp.getTime() - 3600000);
            attackedFlight.latitude += (Math.random() * 0.5 - 0.25);
            attackedFlight.longitude += (Math.random() * 0.5 - 0.25);
            break;
          
          case 'spoofing':
            // Make position changes much larger to trigger spoofing detection
            // Add ±5 degrees (roughly 500+ km) which should trigger the 500km detection
            attackedFlight.latitude += (Math.random() * 10 - 5);
            attackedFlight.longitude += (Math.random() * 10 - 5);
            attackedFlight.altitude += Math.floor(Math.random() * 10000);
            attackedFlight.isSpoofed = true;
            break;
            
          case 'tampering':
            // Make altitude changes much larger to trigger tampering detection
            // Add ±15km altitude change which should trigger the 10km detection
            attackedFlight.altitude += Math.floor(Math.random() * 30000) - 15000;
            attackedFlight.velocity = (attackedFlight.velocity || 0) + Math.floor(Math.random() * 200);
            break;
            
          default:
            throw new Error('Unknown attack type');
        }

        // Actually try to submit the malicious data to blockchain
        const txResult = await this.blockchainSystem.addFlightDataWithDetails(attackedFlight);
        blockchainLogger.log('success', 'Attack simulation: Data accepted by blockchain', { attackType, targetFlight });
        return {
          attackType,
          targetFlight,
          attackedFlight,
          transactionHash: txResult?.transactionHash,
          blockNumber: txResult?.blockNumber,
          detectedByBlockchain: false,
          message: 'Attack Succeeded: The malicious data was accepted by the blockchain.',
          eventLogs: txResult?.eventLogs || []
        };
      } catch (error) {
        blockchainLogger.log('error', 'Attack Prevented by Blockchain', { attackType, targetFlight, reason: error.message });
        return {
          attackType,
          targetFlight,
          attackedFlight,
          detectedByBlockchain: true,
          reason: error.message,
          message: 'Attack Prevented: The smart contract rejected the malicious transaction.',
          eventLogs: error.eventLogs || []
        };
      }
    } else {
      // Traditional system: always accept
      blockchainLogger.log('success', 'Attack Succeeded (Traditional System)', { attackType, targetFlight });
      return { detectedByTraditional: false };
    }
  }

  getTraditionalSystem() {
    return this.traditionalSystem;
  }

  getBlockchainSystem() {
    return this.blockchainSystem;
  }
}

export default FlightDataService; 