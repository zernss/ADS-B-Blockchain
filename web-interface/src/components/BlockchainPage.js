import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { Box, Typography, Card, CardContent, Button, Alert, CircularProgress, Grid, Tabs, Tab } from '@mui/material';
import Map from './Map';
import BlockchainInfo from './BlockchainInfo';
import BlockchainLoggerComponent from './BlockchainLogger';
import FlightDataService from '../services/FlightDataService';
import AdsbDataABI from '../contracts/AdsbData.json';
import config from '../config.json';

function BlockchainPage() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [flightService, setFlightService] = useState(null);
  const [attackedFlights, setAttackedFlights] = useState(new Set());
  const [attackResults, setAttackResults] = useState([]);
  const [contract, setContract] = useState(null);
  const [updateStatus, setUpdateStatus] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  const initializeBlockchain = useCallback(async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const newContract = new ethers.Contract(
        config.contractAddress,
        AdsbDataABI.abi,
        signer
      );
      setContract(newContract);
      const service = new FlightDataService(newContract);
      setFlightService(service);
      setLoading(false);
      await service.start();
    } catch (err) {
      setError("Failed to connect to blockchain. Please make sure MetaMask is installed and connected.");
      setLoading(false);
    }
  }, []);

  const updateFlights = useCallback(async () => {
    if (!flightService) return;
    try {
      setUpdateStatus('Fetching flight data from OpenSky Network...');
      const newFlights = await flightService.updateFlightData();
      setFlights(newFlights);
      setUpdateStatus(`Successfully fetched ${newFlights.length} flights from OpenSky Network`);
      setTimeout(() => setUpdateStatus(''), 3000);
    } catch (err) {
      setUpdateStatus('Failed to fetch flight data from OpenSky Network');
    }
  }, [flightService]);

  useEffect(() => {
    initializeBlockchain();
    return () => {
      if (flightService) flightService.stop();
    };
  }, [initializeBlockchain]);

  const simulateAttack = async (attackType) => {
    if (!flightService || flights.length === 0) return;
    try {
      const targetFlight = flights[Math.floor(Math.random() * flights.length)];
      const result = await flightService.simulateAttack(attackType, targetFlight);
      setAttackedFlights(prev => new Set([...prev, targetFlight.icao24]));
      setAttackResults(prev => [{
        timestamp: new Date(),
        type: attackType,
        targetFlight: targetFlight.callsign,
        detectedByBlockchain: result.detectedByBlockchain
      }, ...prev].slice(0, 10));
    } catch (err) {
      setError(`Failed to simulate ${attackType} attack`);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh"><CircularProgress /></Box>;
  }
  if (error) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh"><Typography color="error">{error}</Typography></Box>;
  }

  return (
    <Box>
      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Flight Map" />
        <Tab label="Blockchain Info" />
        <Tab label="Network Logger" />
      </Tabs>

      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <BlockchainInfo contract={contract} attackResults={attackResults} />
          </Grid>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Flight Map (Blockchain Secured)</Typography>
                  <Button variant="contained" onClick={updateFlights} disabled={!flightService || updateStatus === 'Fetching flight data...'}>Refresh Flight Data</Button>
                </Box>
                {updateStatus && (
                  <Alert severity={updateStatus.includes('success') ? 'success' : updateStatus.includes('Failed') ? 'error' : 'info'} sx={{ mb: 2 }}>{updateStatus}</Alert>
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
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <BlockchainInfo contract={contract} attackResults={attackResults} />
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && (
        <BlockchainLoggerComponent />
      )}
    </Box>
  );
}

export default BlockchainPage; 