import { generateFlightData } from './FlightDataGenerator';

// OpenSky Network API service
const OPENSKY_API_URL = 'https://opensky-network.org/api/states/all';
const OPENSKY_USERNAME = process.env.REACT_APP_OPENSKY_USERNAME;
const OPENSKY_PASSWORD = process.env.REACT_APP_OPENSKY_PASSWORD;

const processFlightData = (state) => {
  // OpenSky data format: [icao24, callsign, origin_country, time_position, last_contact, longitude, latitude, baro_altitude, on_ground, velocity, true_track, vertical_rate, sensors, geo_altitude, squawk, spi, position_source]
  if (!state || state.length < 17) return null;

  const [
    icao24,
    callsign,
    ,  // origin_country
    ,  // time_position
    ,  // last_contact
    longitude,
    latitude,
    baroAltitude,
    onGround,
  ] = state;

  // Skip if essential data is missing or invalid
  if (!icao24 || !latitude || !longitude || 
      isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude)) ||
      Math.abs(parseFloat(latitude)) > 90 || Math.abs(parseFloat(longitude)) > 180) {
    return null;
  }

  return {
    icao24,
    callsign: callsign ? callsign.trim() : icao24,
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    altitude: baroAltitude ? parseFloat(baroAltitude) : 0,
    onGround: Boolean(onGround),
    timestamp: new Date()
  };
};

const fetchFlightData = async () => {
  try {
    return generateFlightData(20);
  } catch (error) {
    console.error('Error generating flight data:', error);
    return [];
  }
};

export { fetchFlightData };