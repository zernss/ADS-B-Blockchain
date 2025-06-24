// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AdsbData {
    struct Flight {
        string icao24;        // ICAO24 address of the aircraft
        string callsign;      // Callsign of the aircraft
        int256 latitude;      // Latitude in decimal degrees (multiplied by 10^6)
        int256 longitude;     // Longitude in decimal degrees (multiplied by 10^6)
        int256 altitude;      // Altitude in meters (multiplied by 10^2)
        bool onGround;        // Boolean value which indicates if the position was retrieved from a surface position report
        uint256 timestamp;    // Unix timestamp for the last position update
        bool isSpoofed;       // Indicates if the signal might be spoofed
    }

    // Store only the latest flight data for each ICAO24
    mapping(string => Flight) private latestFlights;
    string[] private activeFlights;
    mapping(string => bool) private isActive;

    event FlightUpdated(
        string icao24,
        string callsign,
        int256 latitude,
        int256 longitude,
        int256 altitude,
        bool onGround,
        uint256 timestamp,
        bool isSpoofed
    );

    event FlightBatchUpdated(
        uint256 count,
        uint256 timestamp
    );

    event FlightRejected(
        string icao24,
        string reason
    );

    constructor() {
        // Initialize any other necessary variables
    }

    function updateFlight(
        string memory _icao24,
        string memory _callsign,
        int256 _latitude,
        int256 _longitude,
        int256 _altitude,
        bool _onGround,
        bool _isSpoofed
    ) public {
        require(bytes(_icao24).length > 0, "ICAO24 is required");
        require(_latitude >= -90000000 && _latitude <= 90000000, "Invalid latitude");
        require(_longitude >= -180000000 && _longitude <= 180000000, "Invalid longitude");

        uint256 currentTime = block.timestamp;
        Flight storage prev = latestFlights[_icao24];
        if (bytes(prev.icao24).length > 0) {
            // 1. Replay attack prevention
            if (currentTime <= prev.timestamp) {
                emit FlightRejected(_icao24, "Replay attack: timestamp not newer");
                revert("Replay attack: timestamp not newer");
            }
            // 2. Spoofing/tampering prevention
            // Calculate distance (Haversine formula approximation, in meters)
            int256 dLat = _latitude - prev.latitude;
            int256 dLon = _longitude - prev.longitude;
            // Convert to degrees
            int256 dLatDeg = dLat / 1000000;
            int256 dLonDeg = dLon / 1000000;
            // Approximate: 1 deg latitude ~ 111km, 1 deg longitude ~ 85km at mid-latitude
            int256 distMeters = abs(dLatDeg) * 111000 + abs(dLonDeg) * 85000;
            uint256 dt = currentTime - prev.timestamp;
            if (dt > 0) {
                // Block any altitude jump >500m regardless of time
                int256 dAlt = _altitude - prev.altitude;
                if (abs(dAlt) > 50000) {
                    emit FlightRejected(_icao24, "Tampering: impossible altitude jump");
                    revert("Tampering: impossible altitude jump");
                }
                // Block if rate of altitude change >10 m/s
                int256 rate = abs(dAlt) / int256(dt);
                if (rate > 10) {
                    emit FlightRejected(_icao24, "Tampering: impossible altitude rate");
                    revert("Tampering: impossible altitude rate");
                }
                // Spoofing check remains
                if (distMeters > 100000 && dt < 300) {
                    emit FlightRejected(_icao24, "Spoofing: impossible position jump");
                    revert("Spoofing: impossible position jump");
                }
            }
        }

        // Store the flight data
        latestFlights[_icao24] = Flight({
            icao24: _icao24,
            callsign: _callsign,
            latitude: _latitude,
            longitude: _longitude,
            altitude: _altitude,
            onGround: _onGround,
            timestamp: currentTime,
            isSpoofed: _isSpoofed
        });

        // Add to active flights if not already present
        if (!isActive[_icao24]) {
            activeFlights.push(_icao24);
            isActive[_icao24] = true;
        }

        emit FlightUpdated(
            _icao24,
            _callsign,
            _latitude,
            _longitude,
            _altitude,
            _onGround,
            currentTime,
            _isSpoofed
        );
    }

    function updateFlightBatch(
        string[] calldata _icao24s,
        string[] calldata _callsigns,
        int256[] calldata _latitudes,
        int256[] calldata _longitudes,
        int256[] calldata _altitudes,
        bool[] calldata _onGrounds,
        bool[] calldata _isSpoofedFlags
    ) public {
        require(
            _icao24s.length == _callsigns.length &&
            _icao24s.length == _latitudes.length &&
            _icao24s.length == _longitudes.length &&
            _icao24s.length == _altitudes.length &&
            _icao24s.length == _onGrounds.length &&
            _icao24s.length == _isSpoofedFlags.length,
            "Array lengths must match"
        );

        uint256 currentTime = block.timestamp;

        for (uint256 i = 0; i < _icao24s.length; i++) {
            require(bytes(_icao24s[i]).length > 0, "ICAO24 is required");
            require(_latitudes[i] >= -90000000 && _latitudes[i] <= 90000000, "Invalid latitude");
            require(_longitudes[i] >= -180000000 && _longitudes[i] <= 180000000, "Invalid longitude");

            Flight storage prev = latestFlights[_icao24s[i]];
            if (bytes(prev.icao24).length > 0) {
                if (currentTime <= prev.timestamp) {
                    emit FlightRejected(_icao24s[i], "Replay attack: timestamp not newer");
                    revert("Replay attack: timestamp not newer");
                }
                int256 dLat = _latitudes[i] - prev.latitude;
                int256 dLon = _longitudes[i] - prev.longitude;
                int256 dLatDeg = dLat / 1000000;
                int256 dLonDeg = dLon / 1000000;
                int256 distMeters = abs(dLatDeg) * 111000 + abs(dLonDeg) * 85000;
                uint256 dt = currentTime - prev.timestamp;
                if (dt > 0) {
                    // Block any altitude jump >500m regardless of time
                    int256 dAlt = _altitudes[i] - prev.altitude;
                    if (abs(dAlt) > 50000) {
                        emit FlightRejected(_icao24s[i], "Tampering: impossible altitude jump");
                        revert("Tampering: impossible altitude jump");
                    }
                    // Block if rate of altitude change >10 m/s
                    int256 rate = abs(dAlt) / int256(dt);
                    if (rate > 10) {
                        emit FlightRejected(_icao24s[i], "Tampering: impossible altitude rate");
                        revert("Tampering: impossible altitude rate");
                    }
                    if (distMeters > 100000 && dt < 300) {
                        emit FlightRejected(_icao24s[i], "Spoofing: impossible position jump");
                        revert("Spoofing: impossible position jump");
                    }
                }
            }

            // Add to active flights if not already present
            if (!isActive[_icao24s[i]]) {
                activeFlights.push(_icao24s[i]);
                isActive[_icao24s[i]] = true;
            }

            // Update latest flight data
            latestFlights[_icao24s[i]] = Flight({
                icao24: _icao24s[i],
                callsign: _callsigns[i],
                latitude: _latitudes[i],
                longitude: _longitudes[i],
                altitude: _altitudes[i],
                onGround: _onGrounds[i],
                timestamp: currentTime,
                isSpoofed: _isSpoofedFlags[i]
            });
        }

        emit FlightBatchUpdated(_icao24s.length, currentTime);
    }

    function getFlightCount() public view returns (uint256) {
        return activeFlights.length;
    }

    function getFlight(uint256 index) public view returns (
        string memory,
        string memory,
        int256,
        int256,
        int256,
        bool,
        uint256,
        bool
    ) {
        require(index < activeFlights.length, "Flight index out of bounds");
        Flight memory flight = latestFlights[activeFlights[index]];
        return (
            flight.icao24,
            flight.callsign,
            flight.latitude,
            flight.longitude,
            flight.altitude,
            flight.onGround,
            flight.timestamp,
            flight.isSpoofed
        );
    }

    function getLatestFlights(uint256 count) public view returns (
        string[] memory icao24s,
        string[] memory callsigns,
        int256[] memory latitudes,
        int256[] memory longitudes,
        int256[] memory altitudes,
        bool[] memory onGrounds,
        uint256[] memory timestamps,
        bool[] memory isSpoofedFlags
    ) {
        uint256 resultCount = count > activeFlights.length ? activeFlights.length : count;
        
        icao24s = new string[](resultCount);
        callsigns = new string[](resultCount);
        latitudes = new int256[](resultCount);
        longitudes = new int256[](resultCount);
        altitudes = new int256[](resultCount);
        onGrounds = new bool[](resultCount);
        timestamps = new uint256[](resultCount);
        isSpoofedFlags = new bool[](resultCount);

        // Get the latest flights starting from the end
        for (uint256 i = 0; i < resultCount; i++) {
            string memory icao = activeFlights[activeFlights.length - resultCount + i];
            Flight storage flight = latestFlights[icao];
            
            icao24s[i] = flight.icao24;
            callsigns[i] = flight.callsign;
            latitudes[i] = flight.latitude;
            longitudes[i] = flight.longitude;
            altitudes[i] = flight.altitude;
            onGrounds[i] = flight.onGround;
            timestamps[i] = flight.timestamp;
            isSpoofedFlags[i] = flight.isSpoofed;
        }

        return (icao24s, callsigns, latitudes, longitudes, altitudes, onGrounds, timestamps, isSpoofedFlags);
    }

    function abs(int256 x) private pure returns (int256) {
        return x >= 0 ? x : -x;
    }

    function validateFlightUpdate(
        string memory _icao24,
        int256 _latitude,
        int256 _longitude,
        int256 _altitude,
        uint256 _timestamp
    ) public view returns (bool valid, string memory reason) {
        Flight storage prev = latestFlights[_icao24];
        if (bytes(prev.icao24).length > 0) {
            if (_timestamp <= prev.timestamp) {
                return (false, "Replay attack: timestamp not newer");
            }
            int256 dLat = _latitude - prev.latitude;
            int256 dLon = _longitude - prev.longitude;
            int256 dLatDeg = dLat / 1000000;
            int256 dLonDeg = dLon / 1000000;
            int256 distMeters = abs(dLatDeg) * 111000 + abs(dLonDeg) * 85000;
            uint256 dt = _timestamp - prev.timestamp;
            if (dt > 0) {
                // Block any altitude jump >500m regardless of time
                int256 dAlt = _altitude - prev.altitude;
                if (abs(dAlt) > 50000) {
                    return (false, "Tampering: impossible altitude jump");
                }
                // Block if rate of altitude change >10 m/s
                int256 rate = abs(dAlt) / int256(dt);
                if (rate > 10) {
                    return (false, "Tampering: impossible altitude rate");
                }
                if (distMeters > 100000 && dt < 300) {
                    return (false, "Spoofing: impossible position jump");
                }
            }
        }
        return (true, "Valid update");
    }
}
