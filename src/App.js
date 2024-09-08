import {
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  SkeletonText,
  Text,
} from '@chakra-ui/react'
import { FaLocationArrow, FaTimes } from 'react-icons/fa'

import {
  useJsApiLoader,
  GoogleMap,
  Marker,
  Polyline,
} from '@react-google-maps/api'
import { useEffect, useState } from 'react'

function App() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
  })

  const [map, setMap] = useState(/** @type google.maps.Map */ (null))
  const [center, setCenter] = useState({ lat: 22.681014, lng:75.879484 })
  const [hospitals, setHospitals] = useState([])
  const [nearestHospital, setNearestHospital] = useState(null)
  const [routePath, setRoutePath] = useState([])
  const [distance, setDistance] = useState('')
  const [duration, setDuration] = useState('')

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        () => {
          console.error('Geolocation permission denied')
        }
      )
    }
  }, [])

  useEffect(() => {
    if (map) {
      // Find hospitals once the map is loaded and the user's location is set
      findHospitals()
    }
  }, [map, center])

  if (!isLoaded) {
    return <SkeletonText />
  }

  // Function to find nearby hospitals
  function findHospitals() {
    const service = new window.google.maps.places.PlacesService(map)
    const request = {
      location: center,
      radius: '5000', // 5 km radius
      type: ['hospital'], // Search for hospitals
    }

    service.nearbySearch(request, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        setHospitals(results)
        findNearestHospital(results)
      }
    })
  }

  // Function to calculate distance between two coordinates
  function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371 // Radius of the Earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c // Distance in km
  }

  // Function to find the nearest hospital
  function findNearestHospital(hospitals) {
    let nearest = null
    let shortestDistance = Infinity

    hospitals.forEach((hospital) => {
      const distance = calculateDistance(
        center.lat,
        center.lng,
        hospital.geometry.location.lat(),
        hospital.geometry.location.lng()
      )
      if (distance < shortestDistance) {
        shortestDistance = distance
        nearest = hospital
      }
    })

    setNearestHospital(nearest)
    calculateRoute(nearest)
  }

  // Function to calculate route from current location to nearest hospital
  async function calculateRoute(hospital) {
    if (!hospital) return

    // eslint-disable-next-line no-undef
    const directionsService = new google.maps.DirectionsService()
    const results = await directionsService.route({
      origin: center,
      destination: hospital.geometry.location,
      // eslint-disable-next-line no-undef
      travelMode: google.maps.TravelMode.DRIVING,
    })

    const route = results.routes[0].overview_path.map((point) => ({
      lat: point.lat(),
      lng: point.lng(),
    }))

    setRoutePath(route)
    setDistance(results.routes[0].legs[0].distance.text)
    setDuration(results.routes[0].legs[0].duration.text)
  }

  return (
    <Flex
      position='relative'
      flexDirection='column'
      alignItems='center'
      h='100vh'
      w='100vw'
    >
      <Box position='absolute' left={0} top={0} h='100%' w='100%'>
        {/* Google Map Box */}
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
          onLoad={map => setMap(map)}
        >
          {/* User's current location marker */}
          <Marker position={center} label='You' />

          {/* Display markers for all nearby hospitals */}
          {hospitals.map((hospital, index) => (
            <Marker
              key={index}
              position={{
                lat: hospital.geometry.location.lat(),
                lng: hospital.geometry.location.lng(),
              }}
              label={hospital.name}
            />
          ))}

          {/* Custom polyline for the route */}
          {routePath.length > 0 && (
            <Polyline
              path={routePath}
              options={{
                strokeColor: '#0080ff', // Dark blue color
                strokeOpacity: 0.8,
                strokeWeight: 7, // Thickness
              }}
            />
          )}
        </GoogleMap>
      </Box>
      <Box
        p={4}
        borderRadius='lg'
        m={4}
        bgColor='white'
        shadow='base'
        minW='container.md'
        zIndex='1'
      >
        <HStack spacing={4} justifyContent='space-between'>
          <Text>Nearest Hospital: {nearestHospital?.name || 'Finding...'}</Text>
          <Text>Distance: {distance}</Text>
          <Text>Duration: {duration}</Text>
          <IconButton
            aria-label='center back'
            icon={<FaLocationArrow />}
            isRound
            onClick={() => {
              map.panTo(center)
              map.setZoom(15)
            }}
          />
        </HStack>
      </Box>
    </Flex>
  )
}

export default App
