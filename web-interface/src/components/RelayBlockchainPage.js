import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Typography, Card, CardContent, Button, Alert, CircularProgress, Grid, Tabs, Tab, Chip } from '@mui/material';
import { ethers } from 'ethers';
import Map from './Map';
import BlockchainLoggerComponent from './BlockchainLogger';
import BlockchainActivityLogger from './BlockchainActivityLogger';
import FlightDetails from './FlightDetails';
import RelayBlockchainSystem from '../services/RelayBlockchainService';
import { fetchFlightData } from '../services/OpenSkyService';
import blockchainLogger from '../services/BlockchainLogger';

function RelayBlockchainPage() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [relaySystem, setRelaySystem] = useState(null);
  const [attackedFlights, setAttackedFlights] = useState(new Set());
  const [attackResults, setAttackResults] = useState([]);
  const [updateStatus, setUpdateStatus] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [selectedFlight, setSelectedFlight] = useState(null);

  const readOnlyProvider = useMemo(() => {
    // This provider is only for reading blockchain state for the logger, not for sending transactions.
    return new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
  }, []);

  const loadExistingFlights = useCallback(async (system) => {
    if (!system) return;
    
    try {
      console.log('Loading existing flights from blockchain...');
      const existingFlights = await system.getAllFlights();
      console.log('Loaded existing flights from blockchain:', existingFlights.length);
      
      if (existingFlights && existingFlights.length > 0) {
        setFlights(existingFlights);
        console.log('Set flights state with existing flights:', existingFlights.length);
      }
    } catch (error) {
      console.error('Failed to load existing flights:', error);
      blockchainLogger.log('error', 'Failed to load existing flights from blockchain', { error: error.message });
    }
  }, []);

  const updateFlightData = useCallback(async (system, forceRefresh = false) => {
    if (!system) return;
    try {
      setUpdateStatus('Fetching new flight data from OpenSky Network...');
      const newFlights = await fetchFlightData(forceRefresh);
      if (!newFlights || !Array.isArray(newFlights)) {
        setUpdateStatus('Failed to fetch flight data from OpenSky Network');
        return;
      }
      blockchainLogger.log('info', 'Received flight data from OpenSky Network', { count: newFlights.length });
      setUpdateStatus('Adding new flight data to blockchain via relay server...');
      const result = await system.addFlightDataBatch(newFlights);
      if (result) {
        setFlights(newFlights);
        setAttackedFlights(new Set());
        setAttackResults([]);
        if (result.failedFlights && result.failedFlights.length > 0) {
          setUpdateStatus(
            `Added ${result.successfulBatches} batches. ${result.failedFlights.length} flights were blocked for security reasons.`
          );
        }
        if (result.error) {
          setUpdateStatus(
            `Some flights were blocked by the blockchain: ${result.error}`
          );
        }
        setTimeout(() => setUpdateStatus(''), 5000);
      } else {
        setUpdateStatus('Failed to add new flight data to blockchain via relay server');
      }
    } catch (error) {
      blockchainLogger.log('error', 'Failed to update flight data', { error: error.message });
      setUpdateStatus('Failed to update flight data');
    }
  }, []);

  const startService = useCallback(async (system) => {
    try {
      await updateFlightData(system);
    } catch (err) {
      console.error('Service start error:', err);
    }
  }, [updateFlightData]);

  const initializeRelaySystem = useCallback(async () => {
    try {
      setLoading(true);
      const system = new RelayBlockchainSystem();
      const isConnected = await system.checkConnection();
      
      if (isConnected) {
        setRelaySystem(system);
        setConnectionStatus('connected');
        
        // Initialize blockchain monitoring
        blockchainLogger.initializeBlockchainMonitoring(readOnlyProvider, null);
        
        // First load existing flights from blockchain
        await loadExistingFlights(system);
        
        // Then start the service to add new flights
        await startService(system);
      } else {
        setError({
          type: 'relay-unavailable',
          message: 'Relay server is not available. Please start the relay server first.'
        });
        setConnectionStatus('disconnected');
      }
    } catch (err) {
      console.error('Relay system initialization error:', err);
      setError({
        type: 'relay-error',
        message: 'Failed to initialize relay blockchain system.'
      });
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  }, [startService, loadExistingFlights, readOnlyProvider]);

  useEffect(() => {
    initializeRelaySystem();
  }, [initializeRelaySystem]);

  const simulateAttack = async (attackType) => {
    if (!relaySystem || flights.length === 0) {
      setError({
        type: 'attack-error',
        message: flights.length === 0 ? 'No flights available to attack. Please wait for flight data to load.' : 'Relay system not connected'
      });
      return;
    }
    try {
      setError(null);
      const targetFlight = flights[Math.floor(Math.random() * flights.length)];
      const safeTargetFlight = {
        icao24: targetFlight.icao24,
        callsign: targetFlight.callsign || targetFlight.icao24,
        latitude: targetFlight.latitude,
        longitude: targetFlight.longitude,
        altitude: targetFlight.altitude,
        onGround: typeof targetFlight.onGround === 'boolean' ? targetFlight.onGround : false,
        isSpoofed: typeof targetFlight.isSpoofed === 'boolean' ? targetFlight.isSpoofed : false
      };
      const result = await relaySystem.simulateAttack(attackType, safeTargetFlight);
      if (!result) {
        throw new Error('No response from relay server');
      }
      if (!result.detectedByBlockchain) {
        setAttackedFlights(prev => new Set([...prev, targetFlight.icao24]));
      }
      setAttackResults(prev => [{
        timestamp: new Date(),
        type: attackType,
        targetFlight: result.targetFlight?.callsign || targetFlight.callsign,
        detectedByBlockchain: result.detectedByBlockchain,
        reason: result.reason,
        transactionHash: result.transactionHash,
        attackedFlight: result.attackedFlight,
        eventLogs: result.eventLogs,
        original: result.targetFlight || targetFlight,
        attacked: result.attackedFlight
      }, ...prev].slice(0, 10));
    } catch (err) {
      console.error('Attack simulation error:', err);
      
      // Handle known error types
      if (err.message.includes('missing argument')) {
        setError({
          type: 'attack-error',
          message: 'Contract call failed: Missing required flight data'
        });
      } else if (err.message.includes('Network response was not ok')) {
        setError({
          type: 'attack-error',
          message: 'Failed to connect to relay server. Please check if the server is running.'
        });
      } else {
        setError({
          type: 'attack-error',
          message: `Failed to simulate ${attackType} attack: ${err.message}`
        });
      }
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleFlightSelect = (flight) => {
    console.log('Flight selected:', flight);
    setSelectedFlight(flight);
    // You can add more functionality here, such as showing flight details in a modal
    // or highlighting the selected flight on the map
  };

  const renderError = (error) => {
    if (!error) return null;

    const getErrorContent = () => {
      switch (error.type) {
        case 'relay-unavailable':
          return {
            title: 'Relay Server Unavailable',
            content: (
              <Box>
                <Typography variant="body1" gutterBottom>
                  The transaction relay server is not running. This server handles blockchain transactions without requiring MetaMask confirmations.
                </Typography>
                <Typography variant="body2" component="div" sx={{ mt: 1, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <strong>To start the relay server:</strong><br/>
                  Use the <code>start-complete-system.js</code> script.
                </Typography>
                <Button 
                  variant="contained" 
                  onClick={() => window.location.reload()}
                  sx={{ mt: 2 }}
                >
                  Retry Connection
                </Button>
              </Box>
            )
          };
        
        default:
          return {
            title: 'Error',
            content: (
              <Box>
                <Typography variant="body1" gutterBottom>
                  {error.message || 'An unexpected error occurred.'}
                </Typography>
                <Button 
                  variant="contained" 
                  onClick={() => window.location.reload()}
                  sx={{ mt: 2 }}
                >
                  Retry
                </Button>
              </Box>
            )
          };
      }
    };

    const errorContent = getErrorContent();

    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Card sx={{ p: 4, maxWidth: 600 }}>
          <Typography variant="h5" color="error" gutterBottom>
            {errorContent.title}
          </Typography>
          {errorContent.content}
        </Card>
      </Box>
    );
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh"><CircularProgress /></Box>;
  }
  
  if (error) {
    return renderError(error);
  }

  return (
    <Box>
      <Alert 
        severity={connectionStatus === 'connected' ? 'success' : 'warning'} 
        sx={{ mb: 2 }}
        action={
          <Chip 
            label={connectionStatus === 'connected' ? 'Connected' : 'Disconnected'} 
            color={connectionStatus === 'connected' ? 'success' : 'warning'}
            size="small"
          />
        }
      >
        {connectionStatus === 'connected' 
          ? 'Relay Server Connected - No MetaMask confirmations required!' 
          : 'Relay Server Disconnected'
        }
      </Alert>

      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Flight Map" />
        <Tab label="Network Logger" />
        <Tab label="🔗 Blockchain Activity" />
      </Tabs>

      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            {error && error.type === 'attack-error' && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error.message}
              </Alert>
            )}
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Relay Blockchain System
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  This system uses a transaction relay server to handle blockchain operations without requiring MetaMask confirmations, providing a seamless user experience.
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Connection Status:</Typography>
                  <Chip 
                    label={connectionStatus === 'connected' ? 'Connected' : 'Disconnected'} 
                    color={connectionStatus === 'connected' ? 'success' : 'warning'}
                    size="small"
                  />
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Recent Attacks:</Typography>
                  {attackResults.slice(0, 3).map((result, index) => (
                    <Box key={index} sx={{ mb: 1 }}>
                      <Typography variant="body2">
                        {result.type} attack on {result.targetFlight}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {result.timestamp.toLocaleTimeString()}
                      </Typography>
                    </Box>
                  ))}
                  {attackResults.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No attacks simulated yet
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Flight Map (Relay Blockchain Secured)</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button 
                      variant="contained" 
                      onClick={() => updateFlightData(relaySystem, true)} 
                      disabled={!relaySystem || updateStatus.includes('Fetching')}
                    >
                      Refresh Flight Data
                    </Button>
                  </Box>
                </Box>
                
                {updateStatus && (
                  <Alert 
                    severity={updateStatus.includes('Successfully') ? 'success' : updateStatus.includes('Failed') ? 'error' : 'info'} 
                    sx={{ mb: 2 }}
                  >
                    {updateStatus}
                  </Alert>
                )}
                
                <Map flights={flights} attackedFlights={attackedFlights} onFlightSelect={handleFlightSelect} />
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FlightDetails flight={selectedFlight} />
          </Grid>
          
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Attack Simulation Controls</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button variant="contained" color="warning" onClick={() => simulateAttack('replay')}>Simulate Replay Attack</Button>
                  <Button variant="contained" color="error" onClick={() => simulateAttack('spoofing')}>Simulate Spoofing Attack</Button>
                  <Button variant="contained" color="secondary" onClick={() => simulateAttack('tampering')}>Simulate Tampering Attack</Button>
                </Box>
                {/* Attack Results Table */}
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1">Attack Results (Relay Blockchain System):</Typography>
                  {attackResults.length === 0 && (
                    <Typography variant="body2" color="text.secondary">No attacks simulated yet</Typography>
                  )}
                  {attackResults.map((result, idx) => (
                    <Card key={idx} sx={{ my: 2, p: 2, background: result.detectedByBlockchain ? '#ffeaea' : '#eaffea' }}>
                      <Typography variant="subtitle2" color={result.detectedByBlockchain ? 'error' : 'success.main'}>
                        {result.timestamp.toLocaleTimeString()} - {result.type} attack on {result.targetFlight}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {result.detectedByBlockchain ? `Attack Prevented by Blockchain: ${result.reason}` : 'Attack Succeeded: Data accepted by blockchain.'}
                      </Typography>
                      {result.transactionHash && (
                        <Typography variant="body2">
                          Transaction Hash: <a href={`https://sepolia.etherscan.io/tx/${result.transactionHash}`} target="_blank" rel="noopener noreferrer">{result.transactionHash}</a>
                        </Typography>
                      )}
                      {/* Show before/after data if available */}
                      {result.targetFlight && result.attackedFlight && (
                        <Box sx={{ mt: 1, mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Submitted Data:</Typography>
                          <Box sx={{ display: 'flex', gap: 4 }}>
                            <Box>
                              <Typography variant="caption">Original</Typography>
                              <pre style={{ fontSize: 12 }}>{JSON.stringify(result.original, null, 2)}</pre>
                            </Box>
                            <Box>
                              <Typography variant="caption">Attacked</Typography>
                              <pre style={{ fontSize: 12 }}>{JSON.stringify(result.attacked, null, 2)}</pre>
                            </Box>
                          </Box>
                        </Box>
                      )}
                      {/* Show event logs if present */}
                      {result.eventLogs && result.eventLogs.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Event Logs:</Typography>
                          {result.eventLogs.map((ev, i) => (
                            <Box key={i} sx={{ ml: 2 }}>
                              <Typography variant="caption">{ev.name}</Typography>
                              <pre style={{ fontSize: 12 }}>{JSON.stringify(ev.values, null, 2)}</pre>
                            </Box>
                          ))}
                        </Box>
                      )}
                      {/* Side-by-side comparison table */}
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>System Comparison:</Typography>
                        <Box sx={{ display: 'flex', gap: 4, mt: 1 }}>
                          <Box sx={{ flex: 1, border: '1px solid #ccc', borderRadius: 1, p: 1 }}>
                            <Typography variant="subtitle2" color="secondary">Traditional System</Typography>
                            <Typography variant="body2" color="success.main">Attack Succeeded: Data accepted by traditional system.</Typography>
                          </Box>
                          <Box sx={{ flex: 1, border: '1px solid #ccc', borderRadius: 1, p: 1 }}>
                            <Typography variant="subtitle2" color="primary">Blockchain System</Typography>
                            <Typography variant="body2" color={result.detectedByBlockchain ? 'error' : 'success.main'}>
                              {result.detectedByBlockchain ? `Attack Prevented: ${result.reason}` : 'Attack Succeeded: Data accepted by blockchain.'}
                            </Typography>
                            {result.transactionHash && (
                              <Typography variant="caption">TX: <a href={`https://sepolia.etherscan.io/tx/${result.transactionHash}`} target="_blank" rel="noopener noreferrer">{result.transactionHash}</a></Typography>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </Card>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <BlockchainLoggerComponent 
          provider={readOnlyProvider} 
          isConnected={connectionStatus === 'connected'} 
        />
      )}

      {activeTab === 2 && (
        <BlockchainActivityLogger />
      )}
    </Box>
  );
}

export default RelayBlockchainPage; 