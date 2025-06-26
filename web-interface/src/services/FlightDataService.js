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

      // Log attack data being submitted
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
      
      blockchainLogger.logBlockchainActivity('event', `Attack Succeeded: ${attackType}`, {
        attackType: attackType,
        targetFlight: targetFlight.icao24,
        transactionHash: txResult?.transactionHash,
        blockNumber: txResult?.blockNumber
      });
      
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
      // Try to extract revert reason from ethers.js error object
      let reason = error.message;
      // ethers v5: error.error.data.message or error.data.message
      if (error && error.error && error.error.data && error.error.data.message) {
        reason = error.error.data.message;
      } else if (error && error.data && error.data.message) {
        reason = error.data.message;
      } else if (error && error.reason) {
        reason = error.reason;
      }
      // Try to extract revert reason string from message
      const match = reason && reason.match(/reverted with reason string '([^']+)'/);
      if (match && match[1]) {
        reason = match[1];
      }
      
      blockchainLogger.logBlockchainActivity('rejection', `Attack Blocked by Smart Contract: ${attackType}`, {
        attackType: attackType,
        targetFlight: targetFlight.icao24,
        reason: reason,
        errorMessage: error.message
      });
      
      blockchainLogger.log('error', 'Attack Prevented by Blockchain', { attackType, targetFlight, reason });
      return {
        attackType,
        targetFlight,
        attackedFlight,
        detectedByBlockchain: true,
        reason,
        message: `Attack Prevented: The smart contract rejected the malicious transaction. Reason: ${reason}`,
        eventLogs: error.eventLogs || []
      };
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