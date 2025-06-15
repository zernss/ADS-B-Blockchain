import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Typography, Box } from '@mui/material';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom icons for normal and attacked flights
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

const Map = ({ flights, attackedFlights }) => {
  return (
    <Box sx={{ height: '70vh', width: '100%', position: 'relative' }}>
      <MapContainer
        center={[51.505, -0.09]}
        zoom={5}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {flights.map((flight) => (
          <Marker
            key={flight.icao24}
            position={[flight.latitude, flight.longitude]}
            icon={attackedFlights.has(flight.icao24) ? attackedIcon : normalIcon}
          >
            <Popup>
              <Typography variant="subtitle2">Flight: {flight.callsign}</Typography>
              <Typography variant="body2">ICAO24: {flight.icao24}</Typography>
              <Typography variant="body2">
                Altitude: {flight.altitude}m
              </Typography>
              <Typography 
                variant="body2" 
                color={attackedFlights.has(flight.icao24) ? "error" : "success"}
                sx={{ fontWeight: 'bold' }}
              >
                Status: {attackedFlights.has(flight.icao24) ? "⚠️ Under Attack" : "✓ Secure"}
              </Typography>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </Box>
  );
};

export default Map; 