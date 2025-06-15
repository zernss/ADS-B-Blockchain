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
}
