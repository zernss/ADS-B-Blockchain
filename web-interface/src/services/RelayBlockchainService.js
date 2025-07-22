import blockchainLogger from "./BlockchainLogger";
// import config from '../config.json'; // Dihapus karena tidak digunakan

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
      blockchainLogger.log('error', 'Tidak dapat menambah data penerbangan: Server relay tidak terhubung');
      return false;
    }
    
    try {
      blockchainLogger.log('info', 'Menambah data penerbangan melalui server relay', {
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
        // Log blockchain activity
        blockchainLogger.logTransaction(result.transactionHash, 'Flight data via relay', {
          icao24: flight.icao24,
          blockNumber: result.blockNumber
        });
        
        if (result.gasUsed) {
          blockchainLogger.logGasUsage(result.gasUsed, result.gasPrice || '0', result.totalCost || '0');
        }
        
        blockchainLogger.log('success', 'Data penerbangan berhasil ditambah melalui server relay', {
          transactionHash: result.transactionHash,
          blockNumber: result.blockNumber,
          gasUsed: result.gasUsed,
          icao24: flight.icao24
        });
        return true;
      } else {
        blockchainLogger.log('error', 'Gagal menambah data penerbangan melalui server relay', {
          icao24: flight.icao24,
          error: result.error
        });
        return false;
      }
    } catch (error) {
      blockchainLogger.log('error', 'Permintaan server relay gagal', {
        icao24: flight.icao24,
        error: error.message
      });
      return false;
    }
  }

  async addFlightDataBatch(flights) {
    if (!this.isConnected) {
      blockchainLogger.log('error', 'Tidak dapat menambah batch data penerbangan: Server relay tidak terhubung');
      return false;
    }
    
    // Tambahkan batas ukuran batch dan chunking
    const MAX_BATCH_SIZE = 50;
    if (flights.length > MAX_BATCH_SIZE) {
      blockchainLogger.log('warning', 'Ukuran batch terlalu besar, membagi menjadi beberapa bagian', {
        totalFlights: flights.length,
        maxBatchSize: MAX_BATCH_SIZE
      });

      let allSuccess = true;
      for (let i = 0; i < flights.length; i += MAX_BATCH_SIZE) {
        const chunk = flights.slice(i, i + MAX_BATCH_SIZE);
        const result = await this.addFlightDataBatch(chunk);
        if (!result) allSuccess = false;
      }
      return allSuccess;
    }
    
    try {
      blockchainLogger.log('info', 'Menambah batch data penerbangan melalui server relay', {
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
        // Log each transaction in the batch
        if (Array.isArray(result.transactions)) {
          result.transactions.forEach(txInfo => {
            blockchainLogger.logTransaction(txInfo.transactionHash, 'Flight batch via relay', {
              count: txInfo.flightsCount,
              blockNumber: txInfo.blockNumber,
              gasUsed: txInfo.gasUsed
            });
          });
        } else if (result.transactionHash) {
          // Fallback for single transactionHash (legacy)
          blockchainLogger.logTransaction(result.transactionHash, 'Flight batch via relay', {
            count: flights.length,
            blockNumber: result.blockNumber
          });
        }
        
        if (result.gasUsed) {
          blockchainLogger.logGasUsage(result.gasUsed, result.gasPrice || '0', result.totalCost || '0');
        }
        
        blockchainLogger.log('success', 'Batch data penerbangan berhasil ditambah melalui server relay', {
          transactionHash: Array.isArray(result.transactions) && result.transactions.length > 0 ? result.transactions.map(tx => tx.transactionHash).join(', ') : result.transactionHash,
          blockNumber: Array.isArray(result.transactions) && result.transactions.length > 0 ? result.transactions.map(tx => tx.blockNumber).join(', ') : result.blockNumber,
          gasUsed: result.gasUsed,
          flightsCount: result.flightsCount
        });
        return true;
      } else {
        blockchainLogger.log('error', 'Gagal menambah batch data penerbangan melalui server relay', {
          count: flights.length,
          error: result.error
        });
        return false;
      }
    } catch (error) {
      blockchainLogger.log('error', 'Permintaan batch server relay gagal', {
        count: flights.length,
        error: error.message
      });
      return false;
    }
  }

  async verifyFlightData(icao24) {
    if (!this.isConnected) {
      blockchainLogger.log('error', 'Tidak dapat memverifikasi data penerbangan: Server relay tidak terhubung');
      return false;
    }
    
    try {
      const response = await fetch(`${this.relayUrl}/flights`);
      const data = await response.json();
      
      const flight = data.flights.find(f => f.icao24 === icao24);
      
      if (flight) {
        blockchainLogger.log('success', 'Data penerbangan berhasil diverifikasi melalui server relay', {
          icao24,
          callsign: flight.callsign,
          timestamp: flight.timestamp
        });
        return true;
      } else {
        blockchainLogger.log('warning', 'Data penerbangan tidak ditemukan melalui server relay', { icao24 });
        return false;
      }
    } catch (error) {
      blockchainLogger.log('error', 'Gagal memverifikasi data penerbangan melalui server relay', {
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
      blockchainLogger.log('error', 'Gagal mendapatkan data penerbangan melalui server relay', {
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
      
      blockchainLogger.log('info', 'Berhasil mengambil semua data penerbangan melalui server relay', {
        count: data.flights.length
      });
      
      return data.flights;
    } catch (error) {
      blockchainLogger.log('error', 'Gagal mengambil semua data penerbangan melalui server relay', {
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
      blockchainLogger.log('error', 'Gagal mengambil penerbangan terbaru melalui server relay', {
        error: error.message
      });
      return [];
    }
  }

  async simulateAttack(attackType, targetFlight) {
    try {
      // Log attack attempt
      blockchainLogger.logBlockchainActivity('attack', `Attack Simulation Started (Relay): ${attackType}`, {
        attackType: attackType,
        targetFlight: targetFlight.icao24,
        callsign: targetFlight.callsign
      });

      const response = await fetch(`${this.relayUrl}/simulate-attack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ attackType, targetFlight }),
      });

      const result = await response.json();
      console.log('Respon /simulate-attack dari relay:', result);

      if (!response.ok || !result.success) {
        // Only throw for real network/server errors
        throw new Error(result.error || 'Network response was not ok');
      }
      
      if (result.detectedByBlockchain) {
        // Log rejection
        blockchainLogger.logBlockchainActivity('rejection', `Attack Prevented (Relay): ${attackType}`, {
          attackType: attackType,
          targetFlight: targetFlight.icao24,
          reason: result.reason
        });
        
        console.log(`✅ Serangan Dicegah oleh Relay/Blockchain: ${result.reason}`);
        blockchainLogger.log('error', `Serangan Dicegah: ${attackType}`, { 
          reason: result.reason,
          flight: result.targetFlight?.callsign,
          eventLogs: result.eventLogs
        });
      } else {
        // Log successful attack
        blockchainLogger.logBlockchainActivity('event', `Attack Succeeded (Relay): ${attackType}`, {
          attackType: attackType,
          targetFlight: targetFlight.icao24,
          transactionHash: result.transactionHash,
          blockNumber: result.blockNumber
        });
        
        if (result.transactionHash) {
          blockchainLogger.logTransaction(result.transactionHash, `Attack via relay: ${attackType}`, {
            attackType: attackType,
            targetFlight: targetFlight.icao24
          });
        }
        
        console.log(`SERANGAN BERHASIL pada sistem Relay. Hash: ${result.transactionHash}`);
        blockchainLogger.log('success', `Serangan Berhasil: ${attackType}`, {
          transaction: result.transactionHash,
          flight: result.targetFlight?.callsign,
          eventLogs: result.eventLogs
        });
      }
      
      return result;

    } catch (error) {
      console.error('Kesalahan saat mensimulasikan serangan via relay:', error);
      blockchainLogger.log('error', 'Gagal mensimulasikan serangan', { error: error.message });
      throw error;
    }
  }
}

export default RelayBlockchainSystem; 