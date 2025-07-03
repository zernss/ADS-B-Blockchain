import { ethers } from 'ethers';

class BlockchainLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 100;
    this.listeners = new Set();
    this.isListening = false;
    this.provider = null;
    this.contract = null;
    this.networkInfo = {
      chainId: null,
      networkName: null,
      blockNumber: null,
      gasPrice: null,
      lastUpdate: null
    };
    this.blockchainActivityLogs = []; // New dedicated blockchain activity logs
    this.maxBlockchainLogs = 500;
  }

  setProvider(provider) {
    if (this.provider === provider) return; // Avoid re-initialization
    this.provider = provider;
    this.log('info', 'Blockchain Logger provider has been set.');
    this.startListening();
  }

  // Initialize the logger with provider and contract
  initialize(provider, contract) {
    this.provider = provider;
    this.contract = contract;
    this.log('info', 'Blockchain Logger initialized', { provider: !!provider, contract: !!contract });
    this.startListening();
  }

  // Add a log entry
  log(level, message, data = {}) {
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      level, // 'info', 'success', 'warning', 'error', 'transaction', 'block', 'event'
      message,
      data,
      formatted: this.formatLogEntry(level, message, data)
    };

    this.logs.unshift(logEntry);
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Notify listeners
    this.notifyListeners(logEntry);
    
    // Also log to console for debugging
    console.log(`[${logEntry.timestamp.toLocaleTimeString()}] ${level.toUpperCase()}: ${message}`, data);
  }

  // Format log entry for display
  formatLogEntry(level, message, data) {
    const timestamp = new Date().toLocaleTimeString();
    let formatted = `[${timestamp}] ${message}`;
    if (data.transactionHash) {
      formatted += `\n  TX Hash: ${data.transactionHash}`;
    }
    if (data.blockNumber) {
      formatted += `\n  Block: ${data.blockNumber}`;
    }
    if (data.gasUsed) {
      formatted += `\n  Gas Used: ${data.gasUsed.toString()}`;
    }
    if (data.confirmations) {
      formatted += `\n  Confirmations: ${data.confirmations}`;
    }
    if (data.error) {
      formatted += `\n  Error: ${data.error.message || data.error}`;
    }
    // Add a clear block for transaction details if present
    if (data.transactionHash || data.blockNumber || data.gasUsed) {
      formatted += `\n-----------------------------\nTransaction Details:`;
      if (data.transactionHash) formatted += `\n  Hash: ${data.transactionHash}`;
      if (data.blockNumber) formatted += `\n  Block: ${data.blockNumber}`;
      if (data.gasUsed) formatted += `\n  Gas Used: ${data.gasUsed}`;
      formatted += `\n-----------------------------`;
    }
    return formatted;
  }

  // Start listening to blockchain events
  async startListening() {
    if (this.isListening || !this.provider) return;
    
    this.isListening = true;
    this.log('info', 'Starting blockchain event listeners');

    try {
      // Listen for new blocks
      this.provider.on('block', (blockNumber) => {
        this.handleNewBlock(blockNumber);
      });

      // Listen for pending transactions
      this.provider.on('pending', (txHash) => {
        this.log('info', 'Pending transaction detected', { transactionHash: txHash });
      });

      // Listen for network changes
      this.provider.on('network', (newNetwork, oldNetwork) => {
        this.log('warning', 'Network changed', { 
          oldNetwork: oldNetwork?.name || 'Unknown',
          newNetwork: newNetwork?.name || 'Unknown',
          chainId: newNetwork?.chainId
        });
      });

      // Listen for contract events if contract is available
      if (this.contract) {
        this.contract.on('FlightUpdated', (icao24, callsign, latitude, longitude, altitude, onGround, timestamp, isSpoofed, event) => {
          this.log('event', 'Flight data updated on blockchain', {
            icao24,
            callsign,
            latitude: latitude.toNumber() / 1e6,
            longitude: longitude.toNumber() / 1e6,
            altitude: altitude.toNumber(),
            onGround,
            timestamp: new Date(timestamp.toNumber() * 1000),
            isSpoofed,
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber
          });
        });

        this.contract.on('FlightBatchUpdated', (count, timestamp, event) => {
          this.log('event', 'Flight batch updated on blockchain', {
            count: count.toNumber(),
            timestamp: new Date(timestamp.toNumber() * 1000),
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber
          });
        });
      }

      // Initial network info update
      await this.updateNetworkInfo();
      
      // Set up periodic network info updates
      this.networkInfoInterval = setInterval(() => {
        this.updateNetworkInfo();
      }, 5000); // Update every 5 seconds

    } catch (error) {
      this.log('error', 'Failed to start blockchain listeners', { error: error.message });
    }
  }

  // Stop listening to blockchain events
  stopListening() {
    if (!this.isListening) return;
    
    this.isListening = false;
    
    if (this.provider) {
      this.provider.removeAllListeners();
    }
    
    if (this.contract) {
      this.contract.removeAllListeners();
    }
    
    if (this.networkInfoInterval) {
      clearInterval(this.networkInfoInterval);
    }
    
    this.log('info', 'Blockchain event listeners stopped');
  }

  // Handle new block events
  async handleNewBlock(blockNumber) {
    try {
      const block = await this.provider.getBlock(blockNumber);
      const gasPrice = await this.provider.getGasPrice();
      
      this.log('block', `New block mined: #${blockNumber}`, {
        blockNumber,
        timestamp: new Date(block.timestamp * 1000),
        transactions: block.transactions.length,
        gasLimit: block.gasLimit.toString(),
        gasUsed: block.gasUsed.toString(),
        gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei') + ' gwei'
      });

      // Update network info
      this.networkInfo.blockNumber = blockNumber;
      this.networkInfo.gasPrice = gasPrice;
      this.networkInfo.lastUpdate = new Date();
      
    } catch (error) {
      this.log('error', 'Failed to get block details', { blockNumber, error: error.message });
    }
  }

  // Update network information
  async updateNetworkInfo() {
    if (!this.provider) return;
    
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      const gasPrice = await this.provider.getGasPrice();
      
      const oldInfo = { ...this.networkInfo };
      
      this.networkInfo = {
        chainId: network.chainId,
        networkName: network.name,
        blockNumber,
        gasPrice,
        lastUpdate: new Date()
      };

      // Log if network info changed significantly
      if (oldInfo.blockNumber !== blockNumber) {
        this.log('info', 'Network status updated', {
          chainId: network.chainId,
          networkName: network.name,
          blockNumber,
          gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei') + ' gwei'
        });
      }
      
    } catch (error) {
      this.log('error', 'Failed to update network info', { error: error.message });
    }
  }

  // Log transaction details
  async logTransaction(txHash, description = 'Transaction') {
    try {
      const tx = await this.provider.getTransaction(txHash);
      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      if (receipt) {
        this.log('transaction', `${description} confirmed`, {
          transactionHash: txHash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          gasPrice: ethers.utils.formatUnits(tx.gasPrice, 'gwei') + ' gwei',
          totalCost: ethers.utils.formatEther(receipt.gasUsed.mul(tx.gasPrice)),
          status: receipt.status === 1 ? 'Success' : 'Failed',
          confirmations: receipt.confirmations
        });
      } else {
        this.log('transaction', `${description} pending`, {
          transactionHash: txHash,
          gasPrice: ethers.utils.formatUnits(tx.gasPrice, 'gwei') + ' gwei',
          gasLimit: tx.gasLimit.toString()
        });
      }
      
    } catch (error) {
      this.log('error', `Failed to get transaction details for ${description}`, { 
        transactionHash: txHash, 
        error: error.message 
      });
    }
  }

  // Monitor transaction with confirmations
  async monitorTransaction(txHash, description = 'Transaction') {
    try {
      const tx = await this.provider.getTransaction(txHash);
      
      this.log('transaction', `${description} submitted`, {
        transactionHash: txHash,
        gasPrice: ethers.utils.formatUnits(tx.gasPrice, 'gwei') + ' gwei',
        gasLimit: tx.gasLimit.toString()
      });

      // Wait for confirmation
      const receipt = await tx.wait();
      
      this.log('success', `${description} confirmed`, {
        transactionHash: txHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        totalCost: ethers.utils.formatEther(receipt.gasUsed.mul(tx.gasPrice)),
        confirmations: receipt.confirmations
      });

      return receipt;
      
    } catch (error) {
      this.log('error', `${description} failed`, {
        transactionHash: txHash,
        error: error.message
      });
      throw error;
    }
  }

  // Get all logs
  getLogs() {
    return [...this.logs];
  }

  // Get logs by level
  getLogsByLevel(level) {
    return this.logs.filter(log => log.level === level);
  }

  // Get recent logs
  getRecentLogs(count = 20) {
    return this.logs.slice(0, count);
  }

  // Get network information
  getNetworkInfo() {
    return { ...this.networkInfo };
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
    this.notifyListeners({ type: 'clear' });
  }

  // Add listener for log updates
  addListener(callback) {
    this.listeners.add(callback);
  }

  // Remove listener
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  // Notify all listeners
  notifyListeners(logEntry) {
    this.listeners.forEach(callback => {
      try {
        callback(logEntry);
      } catch (error) {
        console.error('Error in logger listener:', error);
      }
    });
  }

  // Get log statistics
  getLogStats() {
    const stats = {
      total: this.logs.length,
      byLevel: {},
      recentActivity: 0
    };

    const oneMinuteAgo = Date.now() - 60000;
    
    this.logs.forEach(log => {
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      if (log.timestamp.getTime() > oneMinuteAgo) {
        stats.recentActivity++;
      }
    });

    return stats;
  }

  // Initialize blockchain monitoring
  initializeBlockchainMonitoring(provider, contract) {
    this.provider = provider;
    this.contract = contract;
    
    if (provider) {
      this.startBlockchainMonitoring();
    }
  }

  // Start monitoring blockchain activities
  startBlockchainMonitoring() {
    if (!this.provider) return;

    // Monitor new blocks
    this.provider.on('block', (blockNumber) => {
      this.logBlockchainActivity('block', 'New Block Mined', {
        blockNumber: blockNumber.toString(),
        timestamp: new Date().toISOString()
      });
    });

    // Monitor pending transactions
    this.provider.on('pending', (txHash) => {
      this.logBlockchainActivity('pending', 'Pending Transaction', {
        transactionHash: txHash,
        timestamp: new Date().toISOString()
      });
    });

    // Monitor contract events if contract is available
    if (this.contract) {
      this.monitorContractEvents();
    }
  }

  // Monitor smart contract events
  monitorContractEvents() {
    if (!this.contract) return;

    // Monitor FlightUpdated events
    this.contract.on('FlightUpdated', (icao24, callsign, latitude, longitude, altitude, timestamp, event) => {
      this.logBlockchainActivity('event', 'Flight Data Updated', {
        eventName: 'FlightUpdated',
        icao24: icao24,
        callsign: callsign,
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        altitude: altitude.toString(),
        timestamp: timestamp.toString(),
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        gasUsed: event.gasUsed?.toString()
      });
    });

    // Monitor FlightBatchUpdated events
    this.contract.on('FlightBatchUpdated', (count, timestamp, event) => {
      this.logBlockchainActivity('event', 'Flight Batch Updated', {
        eventName: 'FlightBatchUpdated',
        flightCount: count.toString(),
        timestamp: timestamp.toString(),
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        gasUsed: event.gasUsed?.toString()
      });
    });

    // Monitor FlightRejected events
    this.contract.on('FlightRejected', (icao24, reason, event) => {
      this.logBlockchainActivity('rejection', 'Flight Data Rejected', {
        eventName: 'FlightRejected',
        icao24: icao24,
        reason: reason,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        gasUsed: event.gasUsed?.toString()
      });
    });
  }

  // Log blockchain-specific activities
  logBlockchainActivity(type, message, data = {}) {
    const timestamp = new Date();
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp,
      type, // 'block', 'pending', 'event', 'rejection', 'transaction', 'gas', 'nonce'
      message,
      data,
      formatted: this.formatBlockchainLogEntry(type, message, data, timestamp)
    };

    this.blockchainActivityLogs.unshift(logEntry);
    
    // Keep only the latest logs
    if (this.blockchainActivityLogs.length > this.maxBlockchainLogs) {
      this.blockchainActivityLogs = this.blockchainActivityLogs.slice(0, this.maxBlockchainLogs);
    }

    // Notify listeners
    this.notifyListeners();
    
    // Also log to console for debugging
    console.log(`🔗 [BLOCKCHAIN] ${logEntry.formatted}`);
  }

  // Format blockchain log entries with special styling
  formatBlockchainLogEntry(type, message, data, timestamp) {
    const timeStr = timestamp.toLocaleTimeString();
    let formatted = `[${timeStr}] ${message}`;
    
    // Add type-specific formatting
    switch (type) {
      case 'block':
        formatted += `\n  🧱 Block #${data.blockNumber}`;
        break;
      case 'pending':
        // Ensure transactionHash is a string before using substring
        const txHash = data.transactionHash ? String(data.transactionHash) : '';
        formatted += `\n  ⏳ TX: ${txHash.substring(0, 10)}...`;
        break;
      case 'event':
        formatted += `\n  📝 Event: ${data.eventName}`;
        if (data.transactionHash) {
          formatted += `\n  🔗 TX: ${String(data.transactionHash)}`;
        }
        if (data.blockNumber) {
          formatted += `\n  🧱 Block: ${data.blockNumber}`;
        }
        if (data.gasUsed) {
          formatted += `\n  ⛽ Gas: ${data.gasUsed}`;
        }
        break;
      case 'rejection':
        formatted += `\n  ❌ Reason: ${data.reason}`;
        if (data.transactionHash) {
          formatted += `\n  🔗 TX: ${String(data.transactionHash)}`;
        }
        break;
      case 'transaction':
        formatted += `\n  🔗 Hash: ${String(data.transactionHash)}`;
        if (data.blockNumber) {
          formatted += `\n  🧱 Block: ${data.blockNumber}`;
        }
        if (data.gasUsed) {
          formatted += `\n  ⛽ Gas: ${data.gasUsed}`;
        }
        if (data.gasPrice) {
          formatted += `\n  💰 Gas Price: ${data.gasPrice}`;
        }
        break;
      case 'gas':
        formatted += `\n  ⛽ Used: ${data.gasUsed}`;
        formatted += `\n  💰 Cost: ${data.gasCost}`;
        break;
      case 'nonce':
        formatted += `\n  🔢 Nonce: ${data.nonce}`;
        break;
    }

    // Add blockchain details block
    if (data.transactionHash || data.blockNumber || data.gasUsed) {
      formatted += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      formatted += `\n🔗 BLOCKCHAIN DETAILS:`;
      if (data.transactionHash) formatted += `\n  Hash: ${String(data.transactionHash)}`;
      if (data.blockNumber) formatted += `\n  Block: ${data.blockNumber}`;
      if (data.gasUsed) formatted += `\n  Gas Used: ${data.gasUsed}`;
      if (data.gasPrice) formatted += `\n  Gas Price: ${data.gasPrice}`;
      if (data.nonce) formatted += `\n  Nonce: ${data.nonce}`;
      formatted += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    }

    return formatted;
  }

  // Log transaction details
  logTransaction(txHash, description, data = {}) {
    this.logBlockchainActivity('transaction', `Transaction: ${description}`, {
      transactionHash: txHash,
      ...data
    });
  }

  // Log gas usage
  logGasUsage(gasUsed, gasPrice, totalCost) {
    this.logBlockchainActivity('gas', 'Gas Usage', {
      gasUsed: gasUsed.toString(),
      gasPrice: gasPrice.toString(),
      gasCost: totalCost.toString()
    });
  }

  // Log nonce changes
  logNonceChange(nonce, description) {
    this.logBlockchainActivity('nonce', `Nonce: ${description}`, {
      nonce: nonce.toString()
    });
  }

  // Get blockchain activity logs
  getBlockchainActivityLogs() {
    return this.blockchainActivityLogs;
  }

  // Clear blockchain activity logs
  clearBlockchainActivityLogs() {
    this.blockchainActivityLogs = [];
    this.notifyListeners();
  }

  // Get blockchain activity statistics
  getBlockchainActivityStats() {
    const stats = {
      totalLogs: this.blockchainActivityLogs.length,
      byType: {},
      recentActivity: this.blockchainActivityLogs.slice(0, 10)
    };

    this.blockchainActivityLogs.forEach(log => {
      stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
    });

    return stats;
  }
}

// Create a singleton instance
const blockchainLogger = new BlockchainLogger();

export default blockchainLogger; 