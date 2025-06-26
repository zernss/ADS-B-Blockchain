import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
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

// Custom icon for default state
const defaultIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  shadowSize: [41, 41]
});

// Custom icon for attacked state
const attackedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  shadowSize: [41, 41]
});

// MapInitializer component to handle map initialization
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

const Map = ({ flights, attackedFlights = new Set(), onFlightSelect }) => {
  const mapRef = useRef(null);

  if (!flights || flights.length === 0) {
    return (
      <Box sx={{ height: '70vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography>No flight data available</Typography>
      </Box>
    );
  }

  const center = [51.505, -0.09]; // Default center

  return (
    <Box sx={{ height: '70vh', width: '100%', position: 'relative' }}>
      <MapContainer
        center={center}
        zoom={5}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <MapInitializer />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {flights.map((flight) => {
          const isAttacked = attackedFlights.has(flight.icao24);
          return (
            <Marker
              key={flight.icao24}
              position={[flight.latitude, flight.longitude]}
              icon={isAttacked ? attackedIcon : defaultIcon}
              eventHandlers={{
                click: () => onFlightSelect && onFlightSelect(flight),
              }}
            >
              <Popup>
                <Box>
                  <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                    {flight.callsign || flight.icao24}
                  </Typography>
                  <Typography variant="body1">
                    ICAO24: {flight.icao24}
                  </Typography>
                  <Typography variant="body1">
                    Altitude: {Math.round(flight.altitude)}m
                  </Typography>
                  <Typography variant="body1">
                    Speed: {Math.round((flight.velocity || 0) * 3.6)} km/h
                  </Typography>
                  <Typography variant="body1">
                    Status: {isAttacked ? 'Under Attack' : 'Normal'}
                  </Typography>
                  <Typography variant="body1">
                    Ground: {flight.onGround ? 'Yes' : 'No'}
                  </Typography>
                  {flight.isSpoofed && (
                    <Typography variant="body1" color="error">
                      ⚠️ Potentially Spoofed
                    </Typography>
                  )}
                </Box>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </Box>
  );
};

export default Map; 