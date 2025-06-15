import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  AppBar, 
  Toolbar,
  Grid,
  Alert,
  CircularProgress,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import FlightDataService from './services/FlightDataService';
import Map from './components/Map';
import BlockchainInfo from './components/BlockchainInfo';

// Import your contract ABI and config
import AdsbDataABI from './contracts/AdsbData.json';
import config from './config.json';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom marker icons
const normalIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const attackedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapInitializer() {
  const map = useMap();
  
  useEffect(() => {
    if (map) {
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }
  }, [map]);

  return null;
}

function App() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [flightService, setFlightService] = useState(null);
  const [attackedFlights, setAttackedFlights] = useState(new Set());
  const [attackResults, setAttackResults] = useState([]);
  const [contract, setContract] = useState(null);

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
      
      // Initialize FlightDataService with contract
      const service = new FlightDataService(newContract);
      setFlightService(service);
      service.start();
      
      setLoading(false);
    } catch (err) {
      console.error("Failed to initialize blockchain:", err);
      setError("Failed to connect to blockchain. Please make sure MetaMask is installed and connected.");
      setLoading(false);
    }
  }, []);

  const updateFlights = useCallback(async () => {
    if (!flightService) return;
    try {
      const newFlights = await flightService.updateFlightData();
      setFlights(newFlights);
    } catch (err) {
      console.error("Failed to update flights:", err);
    }
  }, [flightService]);

  useEffect(() => {
    initializeBlockchain();
    return () => {
      if (flightService) {
        flightService.stop();
      }
    };
  }, [initializeBlockchain, flightService]);

  useEffect(() => {
    if (!flightService) return;

    updateFlights();
    const interval = setInterval(updateFlights, 5000);
    return () => clearInterval(interval);
  }, [flightService, updateFlights]);

  const simulateAttack = async (attackType) => {
    if (!flightService || flights.length === 0) return;

    try {
      // Select a random flight to attack
      const targetFlight = flights[Math.floor(Math.random() * flights.length)];
      const result = await flightService.simulateAttack(attackType, targetFlight);
      
      // Update attacked flights set
      setAttackedFlights(prev => new Set([...prev, targetFlight.icao24]));
      
      // Add attack result to history
      setAttackResults(prev => [{
        timestamp: new Date(),
        type: attackType,
        targetFlight: targetFlight.callsign,
        detectedByBlockchain: result.detectedByBlockchain,
        detectedByTraditional: result.detectedByTraditional
      }, ...prev].slice(0, 10)); // Keep only last 10 results
    } catch (err) {
      console.error(`Failed to simulate ${attackType} attack:`, err);
      setError(`Failed to simulate ${attackType} attack`);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Container maxWidth="xl">
        <Grid container spacing={3}>
          {/* Blockchain Info Section */}
          <Grid item xs={12} md={4}>
            <BlockchainInfo 
              contract={contract}
              attackResults={attackResults}
            />
          </Grid>

          {/* Map Section */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Flight Map
                </Typography>
                <Map 
                  flights={flights} 
                  attackedFlights={attackedFlights}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Attack Controls */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Attack Simulation Controls
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button 
                    variant="contained" 
                    color="warning"
                    onClick={() => simulateAttack('replay')}
                  >
                    Simulate Replay Attack
                  </Button>
                  <Button 
                    variant="contained" 
                    color="error"
                    onClick={() => simulateAttack('spoofing')}
                  >
                    Simulate Spoofing Attack
                  </Button>
                  <Button 
                    variant="contained" 
                    color="secondary"
                    onClick={() => simulateAttack('tampering')}
                  >
                    Simulate Tampering Attack
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default App; 