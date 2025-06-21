import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { Box, Typography, Card, CardContent, Button, Alert, CircularProgress, Grid, Tabs, Tab, Paper } from '@mui/material';
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
      // Check if MetaMask is installed
      if (!window.ethereum) {
        setError({
          type: 'metamask-missing',
          message: 'MetaMask is not installed. Please install MetaMask to use this application.'
        });
        setLoading(false);
        return;
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      
      // Request account access
      try {
        await provider.send("eth_requestAccounts", []);
      } catch (err) {
        setError({
          type: 'metamask-rejected',
          message: 'Please connect your MetaMask wallet to continue.'
        });
        setLoading(false);
        return;
      }

      const signer = provider.getSigner();
      const address = await signer.getAddress();
      
      // Check if we're on the correct network
      const network = await provider.getNetwork();
      if (network.chainId !== 1337) {
        setError({
          type: 'wrong-network',
          message: `Please switch to the Localhost 8545 network (Chain ID: 1337). Current network: ${network.name} (Chain ID: ${network.chainId})`
        });
        setLoading(false);
        return;
      }

      const newContract = new ethers.Contract(
        config.contractAddress,
        AdsbDataABI.abi,
        signer
      );

      // Test contract connection
      try {
        await newContract.getFlightCount();
      } catch (err) {
        setError({
          type: 'contract-error',
          message: 'Failed to connect to the smart contract. Please make sure the blockchain is running and the contract is deployed.'
        });
        setLoading(false);
        return;
      }

      setContract(newContract);
      const service = new FlightDataService(newContract);
      setFlightService(service);
      setLoading(false);
      await service.start();
    } catch (err) {
      console.error('Blockchain initialization error:', err);
      setError({
        type: 'general',
        message: 'Failed to connect to blockchain. Please check your MetaMask configuration and try again.'
      });
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

  const renderError = (error) => {
    if (!error) return null;

    const getErrorContent = () => {
      switch (error.type) {
        case 'metamask-missing':
          return {
            title: 'MetaMask Not Found',
            content: (
              <Box>
                <Typography variant="body1" gutterBottom>
                  MetaMask is required to interact with the blockchain. Please install MetaMask and try again.
                </Typography>
                <Button 
                  variant="contained" 
                  href="https://metamask.io/download/" 
                  target="_blank"
                  sx={{ mt: 2 }}
                >
                  Install MetaMask
                </Button>
              </Box>
            )
          };
        
        case 'metamask-rejected':
          return {
            title: 'Wallet Connection Required',
            content: (
              <Box>
                <Typography variant="body1" gutterBottom>
                  Please connect your MetaMask wallet to continue using the application.
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
        
        case 'wrong-network':
          return {
            title: 'Wrong Network',
            content: (
              <Box>
                <Typography variant="body1" gutterBottom>
                  Please switch to the Localhost 8545 network in MetaMask:
                </Typography>
                <Typography variant="body2" component="div" sx={{ mt: 1, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <strong>Network Configuration:</strong><br/>
                  • Network Name: Localhost 8545<br/>
                  • RPC URL: http://127.0.0.1:8545<br/>
                  • Chain ID: 1337<br/>
                  • Currency Symbol: ETH
                </Typography>
                <Button 
                  variant="contained" 
                  onClick={() => window.location.reload()}
                  sx={{ mt: 2 }}
                >
                  Retry After Network Switch
                </Button>
              </Box>
            )
          };
        
        case 'contract-error':
          return {
            title: 'Smart Contract Connection Failed',
            content: (
              <Box>
                <Typography variant="body1" gutterBottom>
                  Unable to connect to the smart contract. Please ensure:
                </Typography>
                <Typography variant="body2" component="div" sx={{ mt: 1 }}>
                  • The Hardhat node is running: <code>npx hardhat node</code><br/>
                  • The contract is deployed: <code>npx hardhat run scripts/deploy.js --network localhost</code><br/>
                  • You're connected to the correct network
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
            title: 'Connection Error',
            content: (
              <Box>
                <Typography variant="body1" gutterBottom>
                  {error.message}
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
        <Paper sx={{ p: 4, maxWidth: 600 }}>
          <Typography variant="h5" color="error" gutterBottom>
            {errorContent.title}
          </Typography>
          {errorContent.content}
        </Paper>
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
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="contained" onClick={updateFlights} disabled={!flightService || updateStatus === 'Fetching flight data...'}>Refresh Flight Data</Button>
                    <Button variant="outlined" onClick={async () => {
                      if (!flightService) return;
                      setUpdateStatus('Syncing from blockchain...');
                      const blockchainFlights = await flightService.blockchainSystem.getAllFlights();
                      setFlights(blockchainFlights);
                      setUpdateStatus(`Loaded ${blockchainFlights.length} flights from blockchain`);
                      setTimeout(() => setUpdateStatus(''), 3000);
                    }}>Sync from Blockchain</Button>
                  </Box>
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