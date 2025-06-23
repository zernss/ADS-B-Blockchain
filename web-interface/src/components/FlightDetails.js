import React from 'react';
import { Card, CardContent, Typography, Box, Divider, Paper } from '@mui/material';

const FlightDetails = ({ flight }) => {
  if (!flight) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Flight Details</Typography>
          <Typography color="text.secondary">Click a flight on the map to see its details.</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Flight Details</Typography>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Callsign:</Typography>
            <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>{flight.callsign || 'N/A'}</Typography>
          </Box>
          <Divider />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', my: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Country:</Typography>
            <Typography variant="body1">{flight.origin_country || 'Unknown'}</Typography>
          </Box>
          <Divider />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', my: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Latitude:</Typography>
            <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>{flight.latitude?.toFixed(4)}°</Typography>
          </Box>
          <Divider />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', my: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Longitude:</Typography>
            <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>{flight.longitude?.toFixed(4)}°</Typography>
          </Box>
          <Divider />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', my: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Altitude:</Typography>
            <Typography variant="body1">{Math.round(flight.altitude)} m</Typography>
          </Box>
          <Divider />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Speed:</Typography>
            <Typography variant="body1">
              {flight.velocity ? `${Math.round(flight.velocity * 3.6)} km/h` : 'N/A'}
            </Typography>
          </Box>
        </Paper>
      </CardContent>
    </Card>
  );
};

export default FlightDetails; 