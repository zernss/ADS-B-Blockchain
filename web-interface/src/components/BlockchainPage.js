import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { Box, Typography, Card, CardContent, Button, Alert, CircularProgress, Grid, Tabs, Tab, Paper, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import Map from './Map';
import BlockchainActivityLogger from './BlockchainActivityLogger';
import FlightDataService from '../services/FlightDataService';
import blockchainLogger from '../services/BlockchainLogger';
import AdsbDataABI from '../contracts/AdsbData.json';
import config from '../config.json';
import FlightDetails from './FlightDetails';

function BlockchainPage() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [flightService, setFlightService] = useState(null);
  const [attackResults, setAttackResults] = useState([]);
  const [contract, setContract] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [confirmationData, setConfirmationData] = useState(null);
  const [onConfirm, setOnConfirm] = useState(() => () => {});
  const [isUpdating, setIsUpdating] = useState(false);

  const handleFlightSelect = (flight) => {
    setSelectedFlight(flight);
  };

  const handleConnectWallet = async () => {
    await initializeBlockchain();
  };

  const initializeBlockchain = useCallback(async () => {
    setLoading(true);
    setError(null);
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
      setIsConnected(true);
      
      // Initialize blockchain monitoring
      blockchainLogger.initializeBlockchainMonitoring(provider, newContract);
      
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
    setConfirmationData({
      type: 'update',
      flights: flights
    });
    setOnConfirm(() => async () => {
      try {
        setConfirmationOpen(false);
        setIsUpdating(true);
        // Show loading state
        setError(null);
        
        // Show validation in progress message
        setError({ 
          type: 'info', 
          message: 'Validating flight data against smart contract rules...' 
        });
        
        const newFlights = await flightService.updateFlightData();
        
        // Clear validation message
        setError(null);
        
        if (newFlights && newFlights.length > 0) {
          setFlights(newFlights);
          // Show success message
          setError({ 
            type: 'success', 
            message: `Successfully processed ${newFlights.length} flights from OpenSky Network. Some flights may have been filtered out due to smart contract validation rules.` 
          });
          // Clear success message after 5 seconds
          setTimeout(() => setError(null), 5000);
        } else {
          setError({ 
            type: 'general', 
            message: 'No new flight data was processed. This could be due to OpenSky Network rate limits or all flights being filtered out by smart contract validation.' 
          });
        }
      } catch (err) {
        setError({ 
          type: 'general', 
          message: `Failed to update blockchain: ${err.message}. This could be due to network issues or smart contract validation failures.` 
        });
      } finally {
        setIsUpdating(false);
      }
    });
    setConfirmationOpen(true);
  }, [flightService, flights]);

  useEffect(() => {
    return () => {
      if (flightService) flightService.stop();
    };
  }, [flightService]);

  const simulateAttack = async (attackType) => {
    if (!flightService || flights.length === 0) return;
    const targetFlight = flights[Math.floor(Math.random() * flights.length)];
    try {
      const result = await flightService.simulateAttack(attackType, targetFlight);
      if (!result.detectedByBlockchain) {
        setFlights(prevFlights => prevFlights.map(f => 
          f.icao24 === targetFlight.icao24 ? { ...f, isUnderAttack: true } : f
        ));
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
      setError({ type: 'attack', message: `Failed to simulate ${attackType} attack. Error: ${err.message}` });
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  if (!isConnected) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Card sx={{ maxWidth: 500, textAlign: 'center' }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>Connect to the Blockchain</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              To view live flight data and interact with the ADS-B smart contract, please connect your MetaMask wallet.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={handleConnectWallet}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Connect Wallet'}
            </Button>
            {error && (
              <Alert severity="error" sx={{ mt: 3, textAlign: 'left' }}>
                <strong>{error.message}</strong>
              </Alert>
            )}
          </CardContent>
        </Card>
      </Box>
    );
  }

  const renderError = (error) => {
    if (!error) return null;

    // Handle success messages
    if (error.type === 'success') {
      return (
        <Alert severity="success" sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      );
    }

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
                  The wallet connection was rejected. Please try again.
                </Typography>
                <Button 
                  variant="contained" 
                  onClick={handleConnectWallet}
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
                  onClick={handleConnectWallet}
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
                  onClick={handleConnectWallet}
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
                  onClick={handleConnectWallet}
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
  
  // Only show full error page for connection errors, not for update messages
  if (error && (error.type === 'metamask-missing' || error.type === 'metamask-rejected' || error.type === 'wrong-network' || error.type === 'contract-error')) {
    return renderError(error);
  }

  return (
    <Box>
      {/* Show success/error messages inline */}
      {error && (error.type === 'success' || error.type === 'general' || error.type === 'info') && (
        <Alert 
          severity={error.type === 'success' ? 'success' : error.type === 'info' ? 'info' : 'error'} 
          sx={{ mb: 2 }}
          onClose={() => setError(null)}
        >
          {error.message}
        </Alert>
      )}

      <Dialog open={confirmationOpen} onClose={() => setConfirmationOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Confirm Blockchain Transaction</DialogTitle>
        <DialogContent>
          {confirmationData?.type === 'update' && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>Flight Data to be Sent to Blockchain:</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {confirmationData.flights && confirmationData.flights.length > 0
                  ? `${confirmationData.flights.length} flights will be fetched from OpenSky Network and validated against smart contract rules before being sent to the blockchain.`
                  : 'No flight data available.'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                Note: Some flights may be filtered out if they violate security rules (e.g., altitude changes > 10 m/s, position jumps > 100km in 5 minutes).
              </Typography>
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Process:</strong> After clicking "Confirm & Send", the system will:
                  <br/>1. Fetch flight data from OpenSky Network
                  <br/>2. Validate against existing blockchain data (this may take a few seconds)
                  <br/>3. MetaMask will prompt you to approve the transaction
                </Typography>
              </Alert>
            </Box>
          )}
          {confirmationData?.type === 'attack' && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>Attack Data to be Sent to Blockchain:</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Attack Type: <b>{confirmationData.attackType}</b>
              </Typography>
              <Box sx={{ maxHeight: 200, overflow: 'auto', mt: 1 }}>
                <pre style={{ fontSize: 12 }}>{JSON.stringify(confirmationData.targetFlight, null, 2)}</pre>
              </Box>
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>MetaMask Transaction:</strong> This will attempt to submit malicious data to test the blockchain's security. 
                  MetaMask will prompt you to approve the transaction.
                </Typography>
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmationOpen(false)} color="secondary">Cancel</Button>
          <Button onClick={onConfirm} color="primary" variant="contained">Confirm &amp; Send</Button>
        </DialogActions>
      </Dialog>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper>
            <Tabs value={activeTab} onChange={handleTabChange} centered>
              <Tab label="Flight Map" />
              <Tab label="🔗 Blockchain Activity" />
            </Tabs>
          </Paper>
        </Grid>
        
        {activeTab === 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">Flight Map (Blockchain Secured)</Typography>
                  <Box>
                    <Button variant="contained" onClick={updateFlights} sx={{ mr: 1 }} disabled={isUpdating}>
                      {isUpdating ? <CircularProgress size={24} /> : 'Refresh Flight Data'}
                    </Button>
                  </Box>
                </Box>
              </CardContent>
              <Map flights={flights} onFlightSelect={handleFlightSelect} />
            </Card>
          </Grid>
        )}

        {activeTab === 1 && (
          <Grid item xs={12}>
            <BlockchainActivityLogger />
          </Grid>
        )}

        <Grid item xs={12}>
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
                <Typography variant="subtitle1">Attack results (Metamask System):</Typography>
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
    </Box>
  );
}

export default BlockchainPage; 