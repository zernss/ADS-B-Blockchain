import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Typography, Card, CardContent, Button, Alert, CircularProgress, Grid, Tabs, Tab, Chip } from '@mui/material';
import { ethers } from 'ethers';
import Map from './Map';
import BlockchainLoggerComponent from './BlockchainLogger';
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

  const readOnlyProvider = useMemo(() => {
    // This provider is only for reading blockchain state for the logger, not for sending transactions.
    return new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
  }, []);

  const updateFlightData = useCallback(async (system, forceRefresh = false) => {
    if (!system) return;
    
    try {
      setUpdateStatus('Fetching flight data from OpenSky Network...');
      const newFlights = await fetchFlightData(forceRefresh);
      
      if (!newFlights || !Array.isArray(newFlights)) {
        setUpdateStatus('Failed to fetch flight data from OpenSky Network');
        return;
      }

      blockchainLogger.log('info', 'Received flight data from OpenSky Network', { count: newFlights.length });

      setUpdateStatus('Adding flight data to blockchain via relay server...');
      const result = await system.addFlightDataBatch(newFlights);
      
      if (result) {
        setFlights(newFlights);
        setUpdateStatus(`Successfully added ${newFlights.length} flights to blockchain via relay server`);
        setTimeout(() => setUpdateStatus(''), 3000);
      } else {
        setUpdateStatus('Failed to add flight data to blockchain via relay server');
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
  }, [startService]);

  useEffect(() => {
    initializeRelaySystem();
  }, [initializeRelaySystem]);

  const simulateAttack = async (attackType) => {
    if (!relaySystem || flights.length === 0) return;
    try {
      const targetFlight = flights[Math.floor(Math.random() * flights.length)];
      const result = await relaySystem.simulateAttack(attackType, targetFlight);
      setAttackedFlights(prev => new Set([...prev, targetFlight.icao24]));
      setAttackResults(prev => [{
        timestamp: new Date(),
        type: attackType,
        targetFlight: targetFlight.callsign,
        detectedByBlockchain: result.detectedByBlockchain
      }, ...prev].slice(0, 10));
    } catch (err) {
      setError({
        type: 'attack-error',
        message: `Failed to simulate ${attackType} attack`
      });
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
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
      </Tabs>

      {activeTab === 0 && (
        <Grid container spacing={3}>
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
                
                <Map flights={flights} attackedFlights={attackedFlights} />
              </CardContent>
            </Card>
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
    </Box>
  );
}

export default RelayBlockchainPage; 