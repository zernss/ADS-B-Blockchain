// Generate realistic flight data for testing
const generateRandomFlight = () => {
  // European airspace boundaries (roughly)
  const bounds = {
    minLat: 35,
    maxLat: 60,
    minLon: -10,
    maxLon: 30
  };

  const airlines = ['BA', 'LH', 'AF', 'KL', 'IB', 'AY', 'SK', 'LX'];
  const flightNumbers = Array.from({ length: 1000 }, (_, i) => String(i + 1000).padStart(4, '0'));
  
  const airline = airlines[Math.floor(Math.random() * airlines.length)];
  const flightNumber = flightNumbers[Math.floor(Math.random() * flightNumbers.length)];
  const callsign = `${airline}${flightNumber}`;
  
  return {
    icao24: Math.random().toString(36).substring(2, 8).toUpperCase(),
    callsign,
    latitude: bounds.minLat + (Math.random() * (bounds.maxLat - bounds.minLat)),
    longitude: bounds.minLon + (Math.random() * (bounds.maxLon - bounds.minLon)),
    altitude: Math.floor(Math.random() * 35000) + 5000,
    onGround: false,
    timestamp: new Date(),
    velocity: Math.floor(Math.random() * 300) + 400, // knots
    heading: Math.floor(Math.random() * 360),
    verticalRate: Math.floor(Math.random() * 2000) - 1000,
    isVerified: true
  };
};

const updateFlightPosition = (flight) => {
  const timeElapsed = (new Date() - flight.timestamp) / 1000; // seconds
  const distanceMoved = (flight.velocity * 0.514444) * timeElapsed; // Convert knots to m/s
  const headingRad = flight.heading * (Math.PI / 180);
  
  // Update position based on velocity and heading
  const latChange = (distanceMoved / 111111) * Math.cos(headingRad);
  const lonChange = (distanceMoved / (111111 * Math.cos(flight.latitude * (Math.PI / 180)))) * Math.sin(headingRad);
  
  return {
    ...flight,
    latitude: flight.latitude + latChange,
    longitude: flight.longitude + lonChange,
    altitude: flight.altitude + (flight.verticalRate * (timeElapsed / 60)),
    timestamp: new Date(),
    heading: flight.heading + (Math.random() * 10 - 5), // Slight random heading changes
    verticalRate: Math.max(-1000, Math.min(1000, flight.verticalRate + (Math.random() * 200 - 100)))
  };
};

let currentFlights = [];

const generateFlightData = (numFlights = 20) => {
  // Remove flights that are out of bounds
  currentFlights = currentFlights.filter(flight => 
    flight.latitude >= 35 && flight.latitude <= 60 &&
    flight.longitude >= -10 && flight.longitude <= 30
  );

  // Add new flights if needed
  while (currentFlights.length < numFlights) {
    currentFlights.push(generateRandomFlight());
  }

  // Update positions of existing flights
  currentFlights = currentFlights.map(updateFlightPosition);

  return currentFlights;
};

export { generateFlightData }; 