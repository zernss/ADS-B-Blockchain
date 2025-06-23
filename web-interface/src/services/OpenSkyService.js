import { generateFlightDataFromState } from './FlightDataGenerator';

// OpenSky Network API service
const OPENSKY_API_URL = 'https://opensky-network.org/api/states/all';
const OPENSKY_USERNAME = process.env.REACT_APP_OPENSKY_USERNAME;
const OPENSKY_PASSWORD = process.env.REACT_APP_OPENSKY_PASSWORD;

// Cache to store the last fetch time and data
let lastFetchTime = 0;
let cachedData = [];
const CACHE_DURATION = 60000; // 60 seconds minimum between fetches

const processFlightData = (state) => {
  // OpenSky data format: [icao24, callsign, origin_country, time_position, last_contact, longitude, latitude, baro_altitude, on_ground, velocity, true_track, vertical_rate, sensors, geo_altitude, squawk, spi, position_source]
  if (!state || state.length < 17) return null;

  const [
    icao24,
    callsign,
    origin_country,
    time_position,
    last_contact,
    longitude,
    latitude,
    baroAltitude,
    onGround,
    velocity,
    heading,
    verticalRate
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
    origin_country,
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    altitude: baroAltitude ? parseFloat(baroAltitude) : 0,
    onGround: Boolean(onGround),
    velocity: velocity ? parseFloat(velocity) : 0,
    heading: heading ? parseFloat(heading) : 0,
    verticalRate: verticalRate ? parseFloat(verticalRate) : 0,
    timestamp: time_position ? new Date(time_position * 1000) : new Date(),
    lastContact: last_contact ? new Date(last_contact * 1000) : new Date(),
    isVerified: true
  };
};

const fetchFlightData = async (forceRefresh = false) => {
  const now = Date.now();
  
  // Return cached data if it's still valid and no force refresh
  if (!forceRefresh && now - lastFetchTime < CACHE_DURATION) {
    return cachedData;
  }

  try {
    // Basic auth credentials if provided
    const headers = {};
    if (OPENSKY_USERNAME && OPENSKY_PASSWORD) {
      headers.Authorization = 'Basic ' + btoa(`${OPENSKY_USERNAME}:${OPENSKY_PASSWORD}`);
    }

    // European airspace boundaries (roughly)
    const bounds = {
      lamin: 35,
      lamax: 60,
      lomin: -10,
      lomax: 30
    };

    // Construct URL with bounding box
    const url = `${OPENSKY_API_URL}?lamin=${bounds.lamin}&lamax=${bounds.lamax}&lomin=${bounds.lomin}&lomax=${bounds.lomax}`;
    
    console.log('Fetching data from OpenSky Network...');
    const response = await fetch(url, { headers });
    console.log('OpenSky API Response status:', response.status);

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('OpenSky Network rate limit reached. Please try again in a few minutes.');
      }
      throw new Error(`OpenSky Network API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenSky API Response data:', data);
    
    if (!data || !Array.isArray(data.states)) {
      console.error('Invalid data format:', data);
      throw new Error('Invalid data format received from OpenSky Network');
    }

    // Process and filter the flights
    const flights = data.states
      .map(processFlightData)
      .filter(flight => flight !== null)
      .slice(0, 100); // Limit to 100 flights

    console.log('Processed flights:', flights);

    if (flights.length === 0) {
      throw new Error('No valid flights found in OpenSky Network data');
    }

    // Update cache
    lastFetchTime = now;
    cachedData = flights;
    
    console.log(`Successfully fetched ${flights.length} flights from OpenSky Network`);
    return flights;
  } catch (error) {
    console.error('Error fetching OpenSky data:', error.message);
    throw error; // Re-throw to handle in the UI
  }
};

export { fetchFlightData };