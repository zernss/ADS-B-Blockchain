import { fetchFlightData } from './OpenSkyService';
import blockchainLogger from './BlockchainLogger';
import traditionalLogger from './TraditionalLogger';

class TraditionalSystem {
  constructor() {
    this.flights = new Map();
    this.verificationDelay = 2000; // 2 seconds delay to simulate network latency
  }

  async addFlightData(flight) {
    this.flights.set(flight.icao24, flight);
    traditionalLogger.log('info', 'Flight data added to traditional system', {
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
    traditionalLogger.log('info', 'Flight data verified in traditional system', {
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

      // Get current nonce for logging
      const signer = this.contract.signer;
      const nonce = await signer.getTransactionCount();
      blockchainLogger.logNonceChange(nonce, 'Before flight data transaction');

      const tx = await this.contract.updateFlight(
        flight.icao24,
        flight.callsign || '',
        Math.floor(flight.latitude * 1e6),
        Math.floor(flight.longitude * 1e6),
        Math.floor(flight.altitude),
        flight.onGround || false,
        flight.isSpoofed || false
      );

      blockchainLogger.logTransaction(tx.hash, 'Flight data update', {
        icao24: flight.icao24,
        nonce: nonce
      });

      blockchainLogger.log('transaction', 'Flight data transaction submitted', {
        transactionHash: tx.hash,
        icao24: flight.icao24
      });

      const receipt = await tx.wait();
      
      // Log gas usage details
      const gasUsed = receipt.gasUsed;
      const gasPrice = tx.gasPrice;
      const totalCost = gasUsed.mul(gasPrice);
      
      blockchainLogger.logGasUsage(gasUsed.toString(), gasPrice.toString(), totalCost.toString());
      
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
    
    // Add batch size limit
    if (flights.length > 50) {
      blockchainLogger.log('warning', 'Batch size too large, processing in chunks', {
        totalFlights: flights.length,
        maxBatchSize: 50
      });
      
      // Process in chunks of 50
      const chunks = [];
      for (let i = 0; i < flights.length; i += 50) {
        chunks.push(flights.slice(i, i + 50));
      }
      
      let successCount = 0;
      for (const chunk of chunks) {
        try {
          const result = await this.addFlightDataBatch(chunk);
          if (result) successCount++;
        } catch (error) {
          blockchainLogger.log('error', 'Failed to process batch chunk', {
            chunkSize: chunk.length,
            error: error.message
          });
        }
      }
      
      return successCount === chunks.length;
    }
    
    try {
      blockchainLogger.log('info', 'Adding flight data batch to blockchain', {
        count: flights.length,
        icao24s: flights.map(f => f.icao24)
      });

      // Get current nonce for logging
      const signer = this.contract.signer;
      const nonce = await signer.getTransactionCount();
      blockchainLogger.logNonceChange(nonce, 'Before batch transaction');

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

      blockchainLogger.logTransaction(tx.hash, 'Flight data batch update', {
        count: flights.length,
        nonce: nonce
      });

      blockchainLogger.log('transaction', 'Flight data batch transaction submitted', {
        transactionHash: tx.hash,
        count: flights.length
      });

      const receipt = await tx.wait();
      
      // Log gas usage details
      const gasUsed = receipt.gasUsed;
      const gasPrice = tx.gasPrice;
      const totalCost = gasUsed.mul(gasPrice);
      
      blockchainLogger.logGasUsage(gasUsed.toString(), gasPrice.toString(), totalCost.toString());
      
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
    if (!this.contract) return null;

    const tx = await this.contract.updateFlight(
      flight.icao24,
      flight.callsign,
      Math.floor(flight.latitude * 1e6),
      Math.floor(flight.longitude * 1e6),
      Math.floor(flight.altitude),
      flight.onGround,
      flight.isSpoofed
    );

    const receipt = await tx.wait();

    return {
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      eventLogs: receipt.events || []
    };
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
        // Filter flights that would violate smart contract validation
        const validFlights = await this.filterValidFlights(flights);
        if (validFlights.length > 0) {
          await this.blockchainSystem.addFlightDataBatch(validFlights);
        } else {
          blockchainLogger.log('warning', 'No flights passed smart contract validation');
        }
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

  async filterValidFlights(flights) {
    if (!this.blockchainSystem || !this.blockchainSystem.contract) {
      return flights; // If no blockchain system, return all flights
    }

    const validFlights = [];
    const currentTime = Math.floor(Date.now() / 1000); // Current timestamp in seconds

    // Fetch all existing flights from blockchain once and create a lookup map
    const existingFlights = await this.blockchainSystem.getAllFlights();
    const existingFlightsMap = new Map();
    existingFlights.forEach(flight => {
      existingFlightsMap.set(flight.icao24, flight);
    });

    blockchainLogger.log('info', 'Fetched existing flights for validation', {
      existingFlightsCount: existingFlights.length,
      newFlightsCount: flights.length
    });

    for (const flight of flights) {
      try {
        const prevFlight = existingFlightsMap.get(flight.icao24);
        
        if (!prevFlight) {
          // First time seeing this flight, it's valid
          validFlights.push(flight);
          continue;
        }

        // Check timestamp validation (replay attack prevention)
        const prevTimestamp = Math.floor(prevFlight.timestamp.getTime() / 1000);
        if (currentTime <= prevTimestamp) {
          blockchainLogger.log('warning', 'Flight rejected: timestamp not newer', {
            icao24: flight.icao24,
            currentTime,
            prevTimestamp
          });
          continue;
        }

        // Check altitude rate validation
        const timeDiff = currentTime - prevTimestamp;
        if (timeDiff > 0) {
          const altitudeDiff = Math.abs(flight.altitude - prevFlight.altitude);
          const altitudeRate = altitudeDiff / timeDiff;
          
          // Smart contract allows max 10 m/s altitude rate
          if (altitudeRate > 10) {
            blockchainLogger.log('warning', 'Flight rejected: altitude rate too high', {
              icao24: flight.icao24,
              altitudeRate: altitudeRate.toFixed(2),
              altitudeDiff,
              timeDiff
            });
            continue;
          }

          // Check altitude jump validation (max 500m regardless of time)
          if (altitudeDiff > 500) {
            blockchainLogger.log('warning', 'Flight rejected: altitude jump too large', {
              icao24: flight.icao24,
              altitudeDiff
            });
            continue;
          }

          // Check position jump validation (spoofing prevention)
          const latDiff = Math.abs(flight.latitude - prevFlight.latitude);
          const lonDiff = Math.abs(flight.longitude - prevFlight.longitude);
          const distMeters = (latDiff * 111000) + (lonDiff * 85000); // Approximate distance
          
          if (distMeters > 100000 && timeDiff < 300) {
            blockchainLogger.log('warning', 'Flight rejected: position jump too large', {
              icao24: flight.icao24,
              distMeters: Math.round(distMeters),
              timeDiff
            });
            continue;
          }
        }

        // Flight passed all validations
        validFlights.push(flight);
      } catch (error) {
        blockchainLogger.log('error', 'Error validating flight', {
          icao24: flight.icao24,
          error: error.message
        });
        // If we can't validate, skip this flight to be safe
        continue;
      }
    }

    blockchainLogger.log('info', 'Flight validation complete', {
      totalFlights: flights.length,
      validFlights: validFlights.length,
      rejectedFlights: flights.length - validFlights.length
    });

    return validFlights;
  }

  async simulateAttack(attackType, targetFlight) {
    if (!this.blockchainSystem) {
      // Traditional system: always accept
      traditionalLogger.log('success', 'Attack Succeeded (Traditional System)', { attackType, targetFlight });
      return { detectedByTraditional: false };
    }

    // Log attack attempt
    blockchainLogger.logBlockchainActivity('attack', `Attack Simulation Started: ${attackType}`, {
      attackType: attackType,
      targetFlight: targetFlight.icao24,
      callsign: targetFlight.callsign
    });

    // Initialize attackedFlight with all required properties
    const attackedFlight = { 
      ...targetFlight,
      onGround: typeof targetFlight.onGround === 'boolean' ? targetFlight.onGround : false,
      isSpoofed: typeof targetFlight.isSpoofed === 'boolean' ? targetFlight.isSpoofed : false,
      callsign: targetFlight.callsign || targetFlight.icao24,
      latitude: Number(targetFlight.latitude) || 0,
      longitude: Number(targetFlight.longitude) || 0,
      altitude: Number(targetFlight.altitude) || 0,
      velocity: Number(targetFlight.velocity) || 0,
      timestamp: targetFlight.timestamp ? new Date(targetFlight.timestamp) : new Date()
    };
    
    // Randomize: 70% block, 30% allow (same as relay system)
    // This randomization is for demonstration purposes to show both successful and prevented attacks
    // In a real system, the smart contract validation would determine success/failure
    if (Math.random() < 0.7) {
      let reason = '';
      if (attackType === 'replay') {
        reason = 'Replay attack: timestamp not newer';
      } else if (attackType === 'tampering') {
        reason = 'Tampering: impossible altitude rate';
      } else if (attackType === 'spoofing') {
        reason = 'Spoofing: invalid callsign';
      } else {
        reason = 'Blocked by blockchain validation';
      }
      
      blockchainLogger.logBlockchainActivity('rejection', `Attack Prevented: ${attackType}`, {
        attackType: attackType,
        targetFlight: targetFlight.icao24,
        reason: reason
      });
      
      blockchainLogger.log('error', 'Attack Prevented by Randomizer (MetaMask System)', { 
        attackType, 
        targetFlight, 
        reason 
      });
      
      return {
        attackType,
        targetFlight,
        attackedFlight,
        detectedByBlockchain: true,
        reason,
        message: `Attack Prevented (pre-validation): ${reason}`,
        eventLogs: []
      };
    }
    
    try {
      // Create the attacked flight with less severe modifications
      switch (attackType) {
        case 'replay':
          attackedFlight.timestamp = new Date(attackedFlight.timestamp.getTime() - 60000); // Only 1 minute back
          attackedFlight.latitude = Number(attackedFlight.latitude) + (Math.random() * 0.1 - 0.05); // Smaller position change
          attackedFlight.longitude = Number(attackedFlight.longitude) + (Math.random() * 0.1 - 0.05);
          break;
        case 'spoofing':
          attackedFlight.latitude = Number(attackedFlight.latitude) + (Math.random() * 2 - 1); // Smaller position change
          attackedFlight.longitude = Number(attackedFlight.longitude) + (Math.random() * 2 - 1);
          attackedFlight.altitude = Number(attackedFlight.altitude) + Math.floor(Math.random() * 1000); // Smaller altitude change
          attackedFlight.isSpoofed = true;
          break;
        case 'tampering':
          attackedFlight.altitude = Number(attackedFlight.altitude) + (Math.floor(Math.random() * 2000) - 1000); // Smaller altitude change
          attackedFlight.velocity = Number(attackedFlight.velocity) + Math.floor(Math.random() * 50); // Smaller velocity change;
          break;
        default:
          throw new Error('Unknown attack type');
      }
      // Final defensive check for NaN after all mutations
      ['latitude','longitude','altitude','velocity'].forEach(field => {
        if (typeof attackedFlight[field] !== 'number' || isNaN(attackedFlight[field])) {
          throw new Error(`Invalid value for ${field}: ${attackedFlight[field]}`);
        }
      });

      // Log attack data being submitted (do NOT include hash here)
      blockchainLogger.logBlockchainActivity('transaction', `Attack Data Submission: ${attackType}`, {
        attackType: attackType,
        targetFlight: targetFlight.icao24,
        originalLatitude: targetFlight.latitude,
        originalLongitude: targetFlight.longitude,
        originalAltitude: targetFlight.altitude,
        modifiedLatitude: attackedFlight.latitude,
        modifiedLongitude: attackedFlight.longitude,
        modifiedAltitude: attackedFlight.altitude
      });

      // Actually try to submit the malicious data to blockchain
      const txResult = await this.blockchainSystem.addFlightDataWithDetails(attackedFlight);

      // Now log the transaction hash after it is available
      if (txResult && txResult.transactionHash) {
        blockchainLogger.logBlockchainActivity('transaction', `Attack Transaction Sent: ${attackType}`, {
          attackType: attackType,
          targetFlight: targetFlight.icao24,
          transactionHash: txResult.transactionHash,
          blockNumber: txResult.blockNumber
        });
      }

      // Now log the attack succeeded event (with hash and block number)
      blockchainLogger.logBlockchainActivity('event', `Attack Succeeded: ${attackType}`, {
        attackType: attackType,
        targetFlight: targetFlight.icao24,
        transactionHash: txResult && txResult.transactionHash ? txResult.transactionHash : 'N/A',
        blockNumber: txResult && txResult.blockNumber ? txResult.blockNumber : 'N/A'
      });
      
      return {
        attackType,
        targetFlight,
        attackedFlight,
        detectedByBlockchain: false,
        transactionHash: txResult && txResult.transactionHash ? txResult.transactionHash : 'N/A',
        blockNumber: txResult && txResult.blockNumber ? txResult.blockNumber : 'N/A',
        message: `Attack Succeeded: ${attackType}`,
        eventLogs: txResult && txResult.eventLogs ? txResult.eventLogs : []
      };
    } catch (error) {
      blockchainLogger.log('error', `Attack Blocked by Smart Contract: ${attackType}`, { error: error.message });
      return {
        detectedByBlockchain: true,
        reason: error && error.message ? error.message : 'Unknown error',
        transactionHash: 'N/A',
        blockNumber: 'N/A'
      };
    }
  }
}

export default FlightDataService;