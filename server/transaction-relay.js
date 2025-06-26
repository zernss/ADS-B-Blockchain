const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Endpoint root untuk status server dasar
app.get('/', (req, res) => {
  res.json({
    message: 'Server Relay Transaksi ADS-B sedang berjalan.',
    status: 'sehat',
    documentation: 'Lihat SYSTEM_COMPARISON.md untuk detail lebih lanjut.',
    healthCheck: 'GET /health untuk status detail.'
  });
});

// Load contract configuration
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../web-interface/src/config.json'), 'utf8'));
const contractABI = JSON.parse(fs.readFileSync(path.join(__dirname, '../web-interface/src/contracts/AdsbData.json'), 'utf8'));

// Initialize blockchain connection
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
const accounts = provider.listAccounts();

// Use the first account as the transaction sender
const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // First Hardhat account
const wallet = new ethers.Wallet(privateKey, provider);
const contract = new ethers.Contract(config.contractAddress, contractABI.abi, wallet);

console.log("🔧 Server Relay Transaksi Dimulai...");
console.log("📋 Alamat Kontrak:", config.contractAddress);
console.log("👤 Alamat Pengirim:", wallet.address);
console.log("🌐 Jaringan:", config.networkId);

// Endpoint pengecekan kesehatan
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    contractAddress: config.contractAddress,
    senderAddress: wallet.address,
    networkId: config.networkId
  });
});

// Get current flight count
app.get('/flight-count', async (req, res) => {
  try {
    const count = await contract.getFlightCount();
    res.json({ count: count.toString() });
  } catch (error) {
    console.error('Kesalahan saat mendapatkan jumlah penerbangan:', error);
    res.status(500).json({ error: error.message });
  }
});

// Tambah data penerbangan tunggal (tidak perlu konfirmasi user)
app.post('/add-flight', async (req, res) => {
  try {
    const { icao24, callsign, latitude, longitude, altitude, onGround, isSpoofed } = req.body;
    
    console.log(`✈️ Menambahkan penerbangan: ${callsign} (${icao24})`);
    
    // Fetch the latest nonce
    const nonce = await provider.getTransactionCount(wallet.address, 'latest');

    const tx = await contract.updateFlight(
      icao24,
      callsign || '',
      Math.floor(latitude * 1e6),
      Math.floor(longitude * 1e6),
      Math.floor(altitude),
      onGround || false,
      isSpoofed || false,
      { nonce }
    );
    
    const receipt = await tx.wait();
    
    console.log(`✅ Penerbangan berhasil ditambahkan!`);
    console.log(`   Transaksi: ${tx.hash}`);
    console.log(`   Blok: ${receipt.blockNumber}`);
    console.log(`   Gas digunakan: ${receipt.gasUsed.toString()}`);
    
    res.json({
      success: true,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      flight: { icao24, callsign, latitude, longitude, altitude, onGround, isSpoofed }
    });
    
  } catch (error) {
    console.error('Kesalahan saat menambah penerbangan:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Tambah beberapa penerbangan sekaligus (batch, tidak perlu konfirmasi user)
app.post('/add-flights-batch', async (req, res) => {
  try {
    const { flights } = req.body;
    
    if (!Array.isArray(flights) || flights.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Array penerbangan wajib diisi dan tidak boleh kosong' 
      });
    }
    
    // Validasi ukuran batch
    if (flights.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Ukuran batch terlalu besar (maksimal 50 penerbangan)'
      });
    }
    
    console.log(`📦 Menambahkan ${flights.length} penerbangan secara batch...`);
    
    // Validasi setiap penerbangan sebelum diproses
    const validFlights = [];
    const invalidFlights = [];
    
    for (const flight of flights) {
      if (flight.icao24 && 
          typeof flight.latitude === 'number' && !isNaN(flight.latitude) &&
          typeof flight.longitude === 'number' && !isNaN(flight.longitude) &&
          typeof flight.altitude === 'number' && !isNaN(flight.altitude)) {
        validFlights.push(flight);
      } else {
        invalidFlights.push(flight);
        console.warn('Data penerbangan tidak valid:', flight);
      }
    }
    
    if (validFlights.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Tidak ada penerbangan valid dalam batch'
      });
    }
    
    if (invalidFlights.length > 0) {
      console.log(`⚠️ ${invalidFlights.length} data penerbangan tidak valid telah difilter`);
    }
    
    // Log the batch to be sent
    const icao24s = validFlights.map(f => f.icao24);
    const callsigns = validFlights.map(f => f.callsign || '');
    const latitudes = validFlights.map(f => Math.floor(f.latitude * 1e6));
    const longitudes = validFlights.map(f => Math.floor(f.longitude * 1e6));
    const altitudes = validFlights.map(f => Math.floor(f.altitude));
    const onGrounds = validFlights.map(f => f.onGround || false);
    const isSpoofedFlags = validFlights.map(f => f.isSpoofed || false);
    console.log('Batch yang akan dikirim:', {
      icao24s,
      callsigns,
      latitudes,
      longitudes,
      altitudes,
      onGrounds,
      isSpoofedFlags
    });

    // Helper for dynamic batch splitting
    async function tryBatch(batch, batchGasLimit) {
      try {
        const icao24s = batch.map(f => f.icao24);
        const callsigns = batch.map(f => f.callsign || '');
        const latitudes = batch.map(f => Math.floor(f.latitude * 1e6));
        const longitudes = batch.map(f => Math.floor(f.longitude * 1e6));
        const altitudes = batch.map(f => Math.floor(f.altitude));
        const onGrounds = batch.map(f => f.onGround || false);
        const isSpoofedFlags = batch.map(f => f.isSpoofed || false);
        const nonce = await provider.getTransactionCount(wallet.address, 'latest');
        console.log(`🚀 Mengirim batch sebanyak ${batch.length} penerbangan dengan gasLimit ${batchGasLimit}`);
        const tx = await contract.updateFlightBatch(
          icao24s,
          callsigns,
          latitudes,
          longitudes,
          altitudes,
          onGrounds,
          isSpoofedFlags,
          { nonce, gasLimit: batchGasLimit }
        );
        const receipt = await tx.wait();
        console.log(`✅ Transaksi batch berhasil! Hash: ${tx.hash}`);
        return { success: true, tx, receipt, batch };
      } catch (error) {
        console.error('❌ Batch gagal:', error.message);
        return { success: false, error, batch };
      }
    }

    // Dynamic batch splitting logic
    let batchSize = validFlights.length;
    let batchGasLimit = 8000000;
    let batches = [validFlights];
    let allResults = [];
    let minBatchSize = 1;
    let maxRetries = 3;
    let retryCount = 0;
    while (batches.length > 0 && retryCount < maxRetries) {
      let nextBatches = [];
      for (const batch of batches) {
        if (batch.length === 0) continue;
        const result = await tryBatch(batch, batchGasLimit);
        if (result.success) {
          allResults.push(result);
        } else {
          // Jika batch gagal dan lebih besar dari minBatchSize, split dan coba lagi
          if (batch.length > minBatchSize) {
            const mid = Math.floor(batch.length / 2);
            nextBatches.push(batch.slice(0, mid));
            nextBatches.push(batch.slice(mid));
            console.log(`🔄 Membagi batch ${batch.length} menjadi ${batch.slice(0, mid).length} dan ${batch.slice(mid).length}`);
          } else {
            // Jika satu penerbangan gagal, log dan lewati
            console.warn('⚠️ Melewati penerbangan karena gagal berulang:', batch[0]);
            allResults.push({ success: false, error: result.error, batch });
          }
        }
      }
      batches = nextBatches;
      retryCount++;
    }

    // Ringkasan hasil
    const successfulBatches = allResults.filter(r => r.success);
    const failedBatches = allResults.filter(r => !r.success);
    console.log(`✅ Batch berhasil: ${successfulBatches.length}, ❌ Batch gagal: ${failedBatches.length}`);
    
    if (successfulBatches.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'All batches failed. See server logs for details.',
        failedBatches: failedBatches.map(fb => ({ error: fb.error?.message, batch: fb.batch }))
      });
    }
    
    // Return info about successful batches
    return res.json({
      success: true,
      successfulBatches: successfulBatches.length,
      failedBatches: failedBatches.length,
      transactions: successfulBatches.map(sb => ({
        transactionHash: sb.tx.hash,
        blockNumber: sb.receipt.blockNumber,
        gasUsed: sb.receipt.gasUsed.toString(),
        flightsCount: sb.batch.length
      })),
      failedFlights: failedBatches.flatMap(fb => fb.batch)
    });
    
  } catch (error) {
    console.error('Kesalahan saat menambah batch penerbangan:', error);
    
    // Provide more detailed error information
    let errorMessage = error.message;
    if (error.reason) {
      errorMessage = error.reason;
    } else if (error.error && error.error.message) {
      errorMessage = error.error.message;
    }
    
    res.status(500).json({ 
      success: false,
      error: errorMessage,
      details: error.toString()
    });
  }
});

// Get all flights from blockchain
app.get('/flights', async (req, res) => {
  try {
    const flightCount = await contract.getFlightCount();
    const flights = [];
    
    for (let i = 0; i < flightCount; i++) {
      const flight = await contract.getFlight(i);
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
    
    res.json({ flights, count: flights.length });
    
  } catch (error) {
    console.error('Kesalahan saat mendapatkan data penerbangan:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get latest flights
app.get('/flights/latest/:count', async (req, res) => {
  try {
    const count = parseInt(req.params.count) || 10;
    const flightCount = await contract.getFlightCount();
    const actualCount = Math.min(count, flightCount);
    const flights = [];
    
    // Get the latest flights
    for (let i = flightCount - actualCount; i < flightCount; i++) {
      const flight = await contract.getFlight(i);
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
    
    res.json({ flights, count: flights.length });
    
  } catch (error) {
    console.error('Kesalahan saat mendapatkan penerbangan terbaru:', error);
    res.status(500).json({ error: error.message });
  }
});

// Simulasi serangan (tidak perlu konfirmasi user)
app.post('/simulate-attack', async (req, res) => {
  // Cetak ABI fragment untuk updateFlight segera
  console.log('ABI untuk updateFlight:', contract.interface.fragments.find(f => f.name === 'updateFlight'));
  try {
    const { attackType, targetFlight } = req.body;
    
    console.log(`⚠️ Mensimulasikan serangan ${attackType} pada ${targetFlight.callsign}`);
    console.log('Data targetFlight dari frontend:', targetFlight);
    
    // Initialize attackedFlight with default values for required properties
    const attackedFlight = { 
      ...targetFlight,
      onGround: targetFlight.onGround || false,
      isSpoofed: targetFlight.isSpoofed || false,
      velocity: Number(targetFlight.velocity) || 0,
      timestamp: targetFlight.timestamp ? new Date(targetFlight.timestamp) : new Date()
    };
    console.log('Membangun attackedFlight untuk kontrak:', attackedFlight);
    console.log('Cek field velocity:', attackedFlight.velocity);
    
    // Defensive check: Ensure all required fields are present
    const requiredFields = [
      'icao24', 'callsign', 'latitude', 'longitude', 'altitude', 'onGround', 'isSpoofed'
    ];
    for (const field of requiredFields) {
      if (attackedFlight[field] === undefined || attackedFlight[field] === null) {
        return res.status(400).json({
          success: false,
          error: `Missing required field: ${field}`
        });
      }
    }
    
    // Defensive: Ensure numeric fields are valid numbers before mutation
    attackedFlight.latitude = Number(attackedFlight.latitude) || 0;
    attackedFlight.longitude = Number(attackedFlight.longitude) || 0;
    attackedFlight.altitude = Number(attackedFlight.altitude) || 0;
    
    console.log('Akan memulai simulasi serangan untuk tipe:', attackType);
    
    switch (attackType) {
      case 'replay':
        attackedFlight.timestamp = new Date(new Date(attackedFlight.timestamp).getTime() - 3600000);
        attackedFlight.latitude = Number(attackedFlight.latitude) + (Math.random() * 0.5 - 0.25);
        attackedFlight.longitude = Number(attackedFlight.longitude) + (Math.random() * 0.5 - 0.25);
        console.log('Replay attack - nilai yang dimutasi:', {
          latitude: attackedFlight.latitude,
          longitude: attackedFlight.longitude,
          timestamp: attackedFlight.timestamp
        });
        break;
      
      case 'spoofing':
        attackedFlight.latitude = Number(attackedFlight.latitude) + (Math.random() * 10 - 5);
        attackedFlight.longitude = Number(attackedFlight.longitude) + (Math.random() * 10 - 5);
        attackedFlight.altitude = Number(attackedFlight.altitude) + Math.floor(Math.random() * 10000);
        attackedFlight.isSpoofed = true;
        console.log('Spoofing attack - nilai yang dimutasi:', {
          latitude: attackedFlight.latitude,
          longitude: attackedFlight.longitude,
          altitude: attackedFlight.altitude,
          isSpoofed: attackedFlight.isSpoofed
        });
        break;
        
      case 'tampering':
        console.log('Memulai simulasi serangan tampering...');
        attackedFlight.altitude = Number(attackedFlight.altitude) + (Math.floor(Math.random() * 30000) - 15000);
        attackedFlight.velocity = Number(attackedFlight.velocity) + Math.floor(Math.random() * 200);
        console.log('Tampering attack - nilai yang dimutasi:', {
          altitude: attackedFlight.altitude,
          velocity: attackedFlight.velocity
        });
        break;
        
      default:
        return res.status(400).json({ success: false, error: 'Tipe serangan tidak dikenal' });
    }
    // Final defensive check for NaN after all mutations
    attackedFlight.latitude = Number(attackedFlight.latitude) || 0;
    attackedFlight.longitude = Number(attackedFlight.longitude) || 0;
    attackedFlight.altitude = Number(attackedFlight.altitude) || 0;
    
    console.log('Final attackedFlight setelah mutasi:', {
      icao24: attackedFlight.icao24,
      callsign: attackedFlight.callsign,
      latitude: attackedFlight.latitude,
      longitude: attackedFlight.longitude,
      altitude: attackedFlight.altitude,
      onGround: attackedFlight.onGround,
      isSpoofed: attackedFlight.isSpoofed
    });
    
    // Ensure timestamp is always valid
    if (!attackedFlight.timestamp) {
      attackedFlight.timestamp = new Date();
    }
    
    // Pre-validate using the smart contract's validation function
    let timestamp = Math.floor(new Date(attackedFlight.timestamp).getTime() / 1000);
    let [valid, reason] = await contract.validateFlightUpdate(
      attackedFlight.icao24,
      Math.floor(attackedFlight.latitude * 1e6),
      Math.floor(attackedFlight.longitude * 1e6),
      Math.floor(attackedFlight.altitude),
      timestamp
    );
    if (!valid) {
      const response = {
        success: true,
        attackType,
        targetFlight,
        attackedFlight,
        detectedByBlockchain: true,
        reason,
        message: `Serangan Dicegah (pre-validasi): ${reason}`,
        eventLogs: []
      };
      console.log('🛡️ Serangan diblokir oleh pre-validasi:', response);
      return res.status(200).json(response);
    }
    
    try {
      // Log argument values and types before contract call
      const updateFlightArgs = [
        attackedFlight.icao24,
        attackedFlight.callsign || '',
        Math.floor(attackedFlight.latitude * 1e6),
        Math.floor(attackedFlight.longitude * 1e6),
        Math.floor(attackedFlight.altitude),
        attackedFlight.onGround,
        attackedFlight.isSpoofed
      ];
      console.log('Argumen updateFlight:', updateFlightArgs);
      console.log('Tipe argumen updateFlight:', updateFlightArgs.map(x => typeof x));
      console.log('Nilai argumen updateFlight (detail):', {
        icao24: updateFlightArgs[0],
        callsign: updateFlightArgs[1],
        latitude: updateFlightArgs[2],
        longitude: updateFlightArgs[3],
        altitude: updateFlightArgs[4],
        onGround: updateFlightArgs[5],
        isSpoofed: updateFlightArgs[6]
      });
      // Defensive check for NaN or undefined
      for (let i = 0; i < updateFlightArgs.length; i++) {
        if (updateFlightArgs[i] === undefined || updateFlightArgs[i] === null || (typeof updateFlightArgs[i] === 'number' && isNaN(updateFlightArgs[i]))) {
          console.error(`Argumen tidak valid di posisi ${i}:`, updateFlightArgs[i]);
          return res.status(400).json({
            success: false,
            error: `Argumen tidak valid di posisi ${i}: ${updateFlightArgs[i]}`
          });
        }
      }

      // Add the attacked flight to blockchain
      const tx = await contract.updateFlight(
        attackedFlight.icao24,
        attackedFlight.callsign || '',
        Math.floor(attackedFlight.latitude * 1e6),
        Math.floor(attackedFlight.longitude * 1e6),
        Math.floor(attackedFlight.altitude),
        attackedFlight.onGround,
        attackedFlight.isSpoofed
      );
      
      const receipt = await tx.wait();
      
      // Parse event logs (FlightUpdated, etc.)
      const eventLogs = [];
      if (receipt && receipt.logs && receipt.logs.length > 0) {
        for (const log of receipt.logs) {
          try {
            const parsed = contract.interface.parseLog(log);
            eventLogs.push({
              name: parsed.name,
              values: parsed.args
            });
          } catch (e) {
            // Not a contract event we care about
          }
        }
      }

      const response = {
        success: true,
        attackType,
        targetFlight,
        attackedFlight,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        detectedByBlockchain: false,
        message: "Attack Succeeded: The malicious data was accepted by the blockchain.",
        eventLogs
      };
      console.log('✅ Serangan diterima oleh blockchain:', response);
      res.status(200).json(response);

    } catch (error) {
      // Try to parse event logs from the error receipt if available
      let eventLogs = [];
      if (error.receipt && error.receipt.logs && error.receipt.logs.length > 0) {
        for (const log of error.receipt.logs) {
          try {
            const parsed = contract.interface.parseLog(log);
            eventLogs.push({
              name: parsed.name,
              values: parsed.args
            });
          } catch (e) {
            // Not a contract event we care about
          }
        }
      }
      const response = {
        success: true,
        attackType,
        targetFlight,
        attackedFlight,
        detectedByBlockchain: true,
        reason: error.reason || "Transaction reverted by smart contract.",
        message: "Attack Prevented: The smart contract rejected the malicious transaction.",
        eventLogs
      };
      console.log('🛡️ Serangan diblokir oleh blockchain:', response);
      res.status(200).json(response);
    }
    
  } catch (error) {
    console.error('Kesalahan di endpoint /simulate-attack:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server Relay Transaksi berjalan di http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`✈️ Siap menangani transaksi data penerbangan tanpa konfirmasi user!`);
});

module.exports = app; 