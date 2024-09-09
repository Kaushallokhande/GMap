/* global google */
import {
  Box,
  Flex,
  HStack,
  IconButton,
  SkeletonText,
  Text,
} from '@chakra-ui/react';
import { FaLocationArrow } from 'react-icons/fa';
import {
  useJsApiLoader,
  GoogleMap,
  Marker,
  Polyline,
} from '@react-google-maps/api';
import { useEffect, useState, useCallback, useMemo } from 'react';

function App() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: useMemo(() => ['places'], []), // Memoize libraries
  });

  const [map, setMap] = useState(null);
  const [center, setCenter] = useState({ lat: 22.681014, lng: 75.879484 });
  const [hospitals, setHospitals] = useState([]);
  const [nearestHospital, setNearestHospital] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [info, setInfo] = useState({ distance: '', duration: '' }); // Group state

  // Geolocation effect
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => console.error('Geolocation permission denied')
      );
    }
  }, []);

  // Memoize the function to find hospitals
  const findHospitals = useCallback(() => {
    const service = new google.maps.places.PlacesService(map);
    const request = {
      location: center,
      radius: '5000',
      type: ['hospital'],
    };

    service.nearbySearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK) {
        setHospitals(results);
        findNearestHospital(results);
      }
    });
  }, [map, center]);

  // Memoize distance calculation
  const calculateDistance = useCallback((lat1, lng1, lat2, lng2) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  // Memoize nearest hospital search
  const findNearestHospital = useCallback(
    (hospitals) => {
      let nearest = null;
      let shortestDistance = Infinity;

      hospitals.forEach((hospital) => {
        const distance = calculateDistance(
          center.lat,
          center.lng,
          hospital.geometry.location.lat(),
          hospital.geometry.location.lng()
        );
        if (distance < shortestDistance) {
          shortestDistance = distance;
          nearest = hospital;
        }
      });

      setNearestHospital(nearest);
      calculateRoute(nearest);
    },
    [calculateDistance, center]
  );

  // Memoize route calculation
  const calculateRoute = useCallback(
    async (hospital) => {
      if (!hospital) return;

      const directionsService = new google.maps.DirectionsService();
      const results = await directionsService.route({
        origin: center,
        destination: hospital.geometry.location,
        travelMode: google.maps.TravelMode.DRIVING,
      });

      const route = results.routes[0].overview_path.map((point) => ({
        lat: point.lat(),
        lng: point.lng(),
      }));

      setRoutePath(route);
      setInfo({
        distance: results.routes[0].legs[0].distance.text,
        duration: results.routes[0].legs[0].duration.text,
      });
    },
    [center]
  );

  const handleHospitalClick = useCallback(
    (hospital) => {
      setSelectedHospital(hospital);
      calculateRoute(hospital);
    },
    [calculateRoute]
  );

  // Trigger finding hospitals when the map is loaded
  useEffect(() => {
    if (map) findHospitals();
  }, [map, center, findHospitals]);

  if (!isLoaded) return <SkeletonText />;

  return (
    <Flex
      position="relative"
      flexDirection="column"
      alignItems="center"
      h="100vh"
      w="100vw"
    >
      <Box position="absolute" left={0} top={0} h="100%" w="100%">
        <GoogleMap
          center={center}
          zoom={15}
          mapContainerStyle={{ width: '100%', height: '100%' }}
          options={{
            zoomControl: false,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          }}
          onLoad={(map) => setMap(map)}
        >
          <Marker position={center} label="You" />

          {hospitals.map((hospital, index) => (
            <Marker
              key={index}
              position={{
                lat: hospital.geometry.location.lat(),
                lng: hospital.geometry.location.lng(),
              }}
              label={hospital.name}
              onClick={() => handleHospitalClick(hospital)}
            />
          ))}

          {routePath.length > 0 && (
            <Polyline
              path={routePath}
              options={{
                strokeColor: '#0080ff',
                strokeOpacity: 0.8,
                strokeWeight: 7,
              }}
            />
          )}
        </GoogleMap>
      </Box>
      <Box
        p={1}
        borderRadius="lg"
        m={4}
        bgColor="white"
        shadow="base"
        minW="container.md"
        zIndex="1"
      >
        <HStack
          spacing={6}
          justifyContent="space-between"
          alignItems="center"
          p={4}
          bg="gray.50"
          borderRadius="md"
          shadow="sm"
        >
          {/* Nearest Hospital Information */}
          <Flex direction="column" alignItems="center">
            <Text fontWeight="bold" fontSize="lg" color="gray.700">
              Nearest Hospital
            </Text>
            <Text color="blue.600">
              {selectedHospital
                ? selectedHospital.name
                : nearestHospital?.name || "Finding..."}
            </Text>
          </Flex>

          {/* Distance */}
          <Flex direction="column" alignItems="center">
            <Text fontWeight="bold" fontSize="lg" color="gray.700">
              Distance
            </Text>
            <Text color="green.600">{info.distance || "Calculating..."}</Text>
          </Flex>

          {/* Duration */}
          <Flex direction="column" alignItems="center">
            <Text fontWeight="bold" fontSize="lg" color="gray.700">
              Duration
            </Text>
            <Text color="red.600">{info.duration || "Calculating..."}</Text>
          </Flex>

          <IconButton
            aria-label="center back"
            icon={<FaLocationArrow />}
            isRound
            colorScheme="teal"
            variant="solid"
            boxShadow="base"
            onClick={() => {
              map.panTo(center);
              map.setZoom(15);
            }}
          />
        </HStack>
      </Box>

    </Flex>
  );
}

export default App;
