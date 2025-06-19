import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Card, CardContent, Button, Alert, CircularProgress, Grid } from '@mui/material';
import Map from './Map';
import FlightDataService from '../services/FlightDataService';

function UnprotectedPage() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [flightService, setFlightService] = useState(null);
  const [attackedFlights, setAttackedFlights] = useState(new Set());
  const [attackResults, setAttackResults] = useState([]);
  const [updateStatus, setUpdateStatus] = useState('');

  const initializeTraditional = useCallback(async () => {
    try {
      const service = new FlightDataService();
      setFlightService(service);
      setLoading(false);
      await service.start();
    } catch (err) {
      setError("Failed to initialize traditional system.");
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
    initializeTraditional();
    return () => {
      if (flightService) flightService.stop();
    };
  }, [initializeTraditional]);

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
        detectedByTraditional: result.detectedByTraditional
      }, ...prev].slice(0, 10));
    } catch (err) {
      setError(`Failed to simulate ${attackType} attack`);
    }
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh"><CircularProgress /></Box>;
  }
  if (error) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh"><Typography color="error">{error}</Typography></Box>;
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Flight Map (Unprotected System)</Typography>
              <Button variant="contained" onClick={updateFlights} disabled={!flightService || updateStatus === 'Fetching flight data...'}>Refresh Flight Data</Button>
            </Box>
            {updateStatus && (
              <Alert severity={updateStatus.includes('success') ? 'success' : updateStatus.includes('Failed') ? 'error' : 'info'} sx={{ mb: 2 }}>{updateStatus}</Alert>
            )}
            <Map flights={flights} attackedFlights={attackedFlights} />
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Attack Simulation Controls</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="contained" color="warning" onClick={() => simulateAttack('replay')}>Simulate Replay Attack</Button>
              <Button variant="contained" color="error" onClick={() => simulateAttack('spoofing')}>Simulate Spoofing Attack</Button>
              <Button variant="contained" color="secondary" onClick={() => simulateAttack('tampering')}>Simulate Tampering Attack</Button>
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1">Attack Results (Traditional System):</Typography>
              {attackResults.map((result, idx) => (
                <Alert key={idx} severity={result.detectedByTraditional ? 'error' : 'success'} sx={{ mt: 1 }}>
                  {result.timestamp.toLocaleTimeString()} - {result.type} on {result.targetFlight}: {result.detectedByTraditional ? 'Attack Detected' : 'Not Detected'}
                </Alert>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

export default UnprotectedPage; 