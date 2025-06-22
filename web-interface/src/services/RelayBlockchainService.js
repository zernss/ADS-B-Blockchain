import blockchainLogger from "./BlockchainLogger";
import config from '../config.json';

const RELAY_SERVER_URL = 'http://localhost:3001';

class RelayBlockchainSystem {
  constructor() {
    this.relayUrl = RELAY_SERVER_URL;
    this.isConnected = false;
  }

  async checkConnection() {
    try {
      const response = await fetch(`${this.relayUrl}/health`);
      const data = await response.json();
      this.isConnected = data.status === 'healthy';
      return this.isConnected;
    } catch (error) {
      console.error('Relay server connection failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  async addFlightData(flight) {
    if (!this.isConnected) {
      blockchainLogger.log('error', 'Cannot add flight data: Relay server not connected');
      return false;
    }
    
    try {
      blockchainLogger.log('info', 'Adding flight data via relay server', {
        icao24: flight.icao24,
        callsign: flight.callsign,
        latitude: flight.latitude,
        longitude: flight.longitude,
        altitude: flight.altitude
      });

      const response = await fetch(`${this.relayUrl}/add-flight`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          icao24: flight.icao24,
          callsign: flight.callsign || '',
          latitude: flight.latitude,
          longitude: flight.longitude,
          altitude: flight.altitude,
          onGround: flight.onGround || false,
          isSpoofed: flight.isSpoofed || false
        })
      });

      const result = await response.json();
      
      if (result.success) {
        blockchainLogger.log('success', 'Flight data added via relay server', {
          transactionHash: result.transactionHash,
          blockNumber: result.blockNumber,
          gasUsed: result.gasUsed,
          icao24: flight.icao24
        });
        return true;
      } else {
        blockchainLogger.log('error', 'Failed to add flight data via relay server', {
          icao24: flight.icao24,
          error: result.error
        });
        return false;
      }
    } catch (error) {
      blockchainLogger.log('error', 'Relay server request failed', {
        icao24: flight.icao24,
        error: error.message
      });
      return false;
    }
  }

  async addFlightDataBatch(flights) {
    if (!this.isConnected) {
      blockchainLogger.log('error', 'Cannot add flight data batch: Relay server not connected');
      return false;
    }
    
    try {
      blockchainLogger.log('info', 'Adding flight data batch via relay server', {
        count: flights.length,
        icao24s: flights.map(f => f.icao24)
      });

      const response = await fetch(`${this.relayUrl}/add-flights-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ flights })
      });

      const result = await response.json();
      
      if (result.success) {
        blockchainLogger.log('success', 'Flight data batch added via relay server', {
          transactionHash: result.transactionHash,
          blockNumber: result.blockNumber,
          gasUsed: result.gasUsed,
          flightsCount: result.flightsCount
        });
        return true;
      } else {
        blockchainLogger.log('error', 'Failed to add flight data batch via relay server', {
          count: flights.length,
          error: result.error
        });
        return false;
      }
    } catch (error) {
      blockchainLogger.log('error', 'Relay server batch request failed', {
        count: flights.length,
        error: error.message
      });
      return false;
    }
  }

  async verifyFlightData(icao24) {
    if (!this.isConnected) {
      blockchainLogger.log('error', 'Cannot verify flight data: Relay server not connected');
      return false;
    }
    
    try {
      const response = await fetch(`${this.relayUrl}/flights`);
      const data = await response.json();
      
      const flight = data.flights.find(f => f.icao24 === icao24);
      
      if (flight) {
        blockchainLogger.log('success', 'Flight data verified via relay server', {
          icao24,
          callsign: flight.callsign,
          timestamp: flight.timestamp
        });
        return true;
      } else {
        blockchainLogger.log('warning', 'Flight data not found via relay server', { icao24 });
        return false;
      }
    } catch (error) {
      blockchainLogger.log('error', 'Failed to verify flight data via relay server', {
        icao24,
        error: error.message
      });
      return false;
    }
  }

  async getFlightData(icao24) {
    if (!this.isConnected) return null;
    
    try {
      const response = await fetch(`${this.relayUrl}/flights`);
      const data = await response.json();
      
      return data.flights.find(f => f.icao24 === icao24) || null;
    } catch (error) {
      blockchainLogger.log('error', 'Failed to get flight data via relay server', {
        icao24,
        error: error.message
      });
      return null;
    }
  }

  async getAllFlights() {
    if (!this.isConnected) return [];
    
    try {
      const response = await fetch(`${this.relayUrl}/flights`);
      const data = await response.json();
      
      blockchainLogger.log('info', 'Retrieved all flights via relay server', {
        count: data.flights.length
      });
      
      return data.flights;
    } catch (error) {
      blockchainLogger.log('error', 'Failed to get all flights via relay server', {
        error: error.message
      });
      return [];
    }
  }

  async getLatestFlights(count = 10) {
    if (!this.isConnected) return [];
    
    try {
      const response = await fetch(`${this.relayUrl}/flights/latest/${count}`);
      const data = await response.json();
      
      return data.flights;
    } catch (error) {
      blockchainLogger.log('error', 'Failed to get latest flights via relay server', {
        error: error.message
      });
      return [];
    }
  }

  async simulateAttack(attackType, targetFlight) {
    if (!this.isConnected) {
      blockchainLogger.log('error', 'Cannot simulate attack: Relay server not connected');
      return { detectedByBlockchain: false };
    }
    
    try {
      blockchainLogger.log('warning', `Simulating ${attackType} attack via relay server`, {
        targetFlight: targetFlight.callsign,
        icao24: targetFlight.icao24
      });

      const response = await fetch(`${this.relayUrl}/simulate-attack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ attackType, targetFlight })
      });

      const result = await response.json();
      
      if (result.success) {
        blockchainLogger.log('success', 'Attack simulation completed via relay server', {
          attackType,
          targetFlight: targetFlight.callsign,
          transactionHash: result.transactionHash
        });
        
        return {
          detectedByBlockchain: result.detectedByBlockchain,
          attackedFlight: result.attackedFlight,
          transactionHash: result.transactionHash
        };
      } else {
        blockchainLogger.log('error', 'Attack simulation failed via relay server', {
          attackType,
          targetFlight: targetFlight.callsign,
          error: result.error
        });
        return { detectedByBlockchain: false };
      }
    } catch (error) {
      blockchainLogger.log('error', 'Relay server attack simulation failed', {
        attackType,
        targetFlight: targetFlight.callsign,
        error: error.message
      });
      return { detectedByBlockchain: false };
    }
  }
}

export default RelayBlockchainSystem; 