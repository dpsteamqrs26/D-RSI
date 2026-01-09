import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Dimensions,
  Platform,
  TextInput,
  FlatList,
  Modal,
} from 'react-native';
import * as Location from 'expo-location';
import * as Linking from 'expo-linking';
import MapView, { Marker, PROVIDER_GOOGLE, Circle, Callout, Polyline } from 'react-native-maps';
import { useSearchState } from '@/context/SearchContext';
import { useLanguage } from '@/context/LanguageContext';
import { 
  MapPin, 
  Navigation, 
  LocateFixed, 
  Car, 
  Zap, 
  AlertTriangle, 
  Bus, 
  Layers, 
  Search, 
  X, 
  Bike, 
  Footprints,
  ChevronRight,
  Clock,
  Route
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

// Default coordinates for Doha, Qatar
const QATAR_INITIAL_REGION = {
  latitude: 25.2854,
  longitude: 51.5310,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

// Custom "Retro" map style for a softer, less blinding look
const BRIGHT_MAP_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#ebebeb" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#523735" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f5f1e6" }] },
  { "featureType": "administrative", "elementType": "geometry.stroke", "stylers": [{ "color": "#c9b2a6" }] },
  { "featureType": "administrative.land_parcel", "elementType": "geometry.stroke", "stylers": [{ "color": "#dcd2be" }] },
  { "featureType": "administrative.land_parcel", "elementType": "labels.text.fill", "stylers": [{ "color": "#ae9e90" }] },
  { "featureType": "landscape.natural", "elementType": "geometry", "stylers": [{ "color": "#dfd2ae" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#dfd2ae" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#93817c" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#a5b076" }] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#447530" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#f5f1e6" }] },
  { "featureType": "road.arterial", "elementType": "geometry", "stylers": [{ "color": "#fdfcf8" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#f8c967" }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#e9bc62" }] },
  { "featureType": "road.highway.controlled_access", "elementType": "geometry", "stylers": [{ "color": "#e98d58" }] },
  { "featureType": "road.highway.controlled_access", "elementType": "geometry.stroke", "stylers": [{ "color": "#db854f" }] },
  { "featureType": "road.local", "elementType": "labels.text.fill", "stylers": [{ "color": "#806b63" }] },
  { "featureType": "transit.line", "elementType": "geometry", "stylers": [{ "color": "#dfd2ae" }] },
  { "featureType": "transit.line", "elementType": "labels.text.fill", "stylers": [{ "color": "#8f7d77" }] },
  { "featureType": "transit.line", "elementType": "labels.text.stroke", "stylers": [{ "color": "#ebe3cd" }] },
  { "featureType": "transit.station", "elementType": "geometry", "stylers": [{ "color": "#dfd2ae" }] },
  { "featureType": "water", "elementType": "geometry.fill", "stylers": [{ "color": "#b9d3c2" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#92998d" }] }
];

const TOMTOM_API_KEY = process.env.EXPO_PUBLIC_TOMTOM_API_KEY;

interface SimulatedVehicle {
  id: string;
  type: 'car' | 'bus' | 'ev';
  coordinate: {
    latitude: number;
    longitude: number;
  };
  heading: number;
  speed: number;
}

interface TrafficIncident {
  id: string;
  type: string;
  severity: number;
  description: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
}

interface SearchResult {
  id: string;
  name: string;
  address: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
}

export default function SearchScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  // Use global state from context
  const {
    searchQuery,
    destination,
    transportMode,
    routeCoordinates,
    routeInfo,
    showTraffic,
    showVehicles,
    showIncidents,
    setSearchQuery,
    setDestination,
    setTransportMode,
    setRouteCoordinates,
    setRouteInfo,
    setShowTraffic,
    setShowVehicles,
    setShowIncidents,
    clearRoute,
  } = useSearchState();

  const { t, isRTL } = useLanguage();

  // Local state (not persisted)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [vehicles, setVehicles] = useState<SimulatedVehicle[]>([]);
  const [incidents, setIncidents] = useState<TrafficIncident[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  // Function to request location permission
  const requestLocationPermission = async () => {
    setIsLoading(true);
    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);
      
      if (status !== 'granted') {
        setError(t('locationText'));
        if (!canAskAgain) {
          Alert.alert(
            t('locationRequired'),
            t('locationText'),
            [
              { text: t('cancel'), style: 'cancel' },
              { text: t('openSettings'), onPress: () => Linking.openSettings() }
            ]
          );
        }
        return;
      }

      setError(null);
      await startLocationServices();
      
    } catch (err: any) {
      setError(`Error requesting permission: ${err.message}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const startLocationServices = async () => {
    try {
      let currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      
      setLocation(currentLocation);
      
      // Only animate to user location if there's no active route
      if (mapRef.current && routeCoordinates.length === 0) {
        mapRef.current.animateToRegion({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 1000);
      }

      await startLocationTracking();
      generateSimulatedVehicles(currentLocation.coords.latitude, currentLocation.coords.longitude);
      fetchTrafficIncidents(currentLocation.coords.latitude, currentLocation.coords.longitude);
    } catch (err: any) {
      console.error('Error starting location services:', err);
      setError('Could not get accurate location. Please ensure GPS is enabled.');
    }
  };

  // Search Places using TomTom API
  const searchPlaces = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${TOMTOM_API_KEY}&limit=5&language=en-GB`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.results) {
        const results = data.results.map((r: any) => ({
          id: r.id,
          name: r.poi?.name || r.address.freeformAddress,
          address: r.address.freeformAddress,
          coordinate: {
            latitude: r.position.lat,
            longitude: r.position.lon,
          },
        }));
        setSearchResults(results);
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const selectDestination = (result: SearchResult) => {
    setDestination(result);
    setSearchQuery(result.name);
    setSearchResults([]);
    setRouteCoordinates([]);
    setRouteInfo(null);
    
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        ...result.coordinate,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    }
  };

  // Calculate Route using TomTom Routing API
  const calculateRoute = async (mode: 'car' | 'bicycle' | 'pedestrian') => {
    if (!location || !destination) return;
    
    setIsCalculatingRoute(true);
    setTransportMode(mode);
    setShowTransportModal(false);

    try {
      const origin = `${location.coords.latitude},${location.coords.longitude}`;
      const dest = `${destination.coordinate.latitude},${destination.coordinate.longitude}`;
      
      const url = `https://api.tomtom.com/routing/1/calculateRoute/${origin}:${dest}/json?key=${TOMTOM_API_KEY}&travelMode=${mode}&traffic=true&routeType=fastest`;
      
      console.log('Fetching route from:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const summary = route.summary;
        
        // Extract route coordinates
        const points: { latitude: number; longitude: number }[] = [];
        route.legs.forEach((leg: any) => {
          leg.points.forEach((point: any) => {
            points.push({
              latitude: point.latitude,
              longitude: point.longitude,
            });
          });
        });
        
        setRouteCoordinates(points);
        setRouteInfo({
          distance: summary.lengthInMeters / 1000, // Convert to km
          duration: summary.travelTimeInSeconds / 60, // Convert to minutes
        });
        
        // Fit map to show the entire route
        if (mapRef.current && points.length > 0) {
          mapRef.current.fitToCoordinates(points, {
            edgePadding: { top: 150, right: 50, bottom: 350, left: 50 },
            animated: true,
          });
        }
      } else {
        Alert.alert(t('error'), 'Could not find a route to this destination.');
      }
    } catch (err) {
      console.error('Route calculation error:', err);
      Alert.alert(t('error'), 'Failed to calculate route. Please try again.');
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const handleClearSearch = () => {
    clearRoute();
    setSearchResults([]);
  };

  // Generate simulated vehicles around the user
  const generateSimulatedVehicles = (lat: number, lon: number) => {
    const types: ('car' | 'bus' | 'ev')[] = ['car', 'bus', 'ev'];
    const newVehicles: SimulatedVehicle[] = Array.from({ length: 15 }).map((_, i) => ({
      id: `v-${i}`,
      type: types[Math.floor(Math.random() * types.length)],
      coordinate: {
        latitude: lat + (Math.random() - 0.5) * 0.02,
        longitude: lon + (Math.random() - 0.5) * 0.02,
      },
      heading: Math.random() * 360,
      speed: 0.0001 + Math.random() * 0.0002,
    }));
    setVehicles(newVehicles);
  };

  // Move vehicles smoothly
  useEffect(() => {
    if (!showVehicles || vehicles.length === 0) return;

    const interval = setInterval(() => {
      setVehicles(prev => prev.map(v => {
        const rad = (v.heading * Math.PI) / 180;
        return {
          ...v,
          coordinate: {
            latitude: v.coordinate.latitude + Math.sin(rad) * v.speed,
            longitude: v.coordinate.longitude + Math.cos(rad) * v.speed,
          },
          heading: Math.random() > 0.95 ? Math.random() * 360 : v.heading,
        };
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [showVehicles, vehicles.length]);

  const fetchTrafficIncidents = async (lat: number, lon: number) => {
    if (!TOMTOM_API_KEY) return;
    setIsFetchingData(true);

    try {
      const delta = 0.1; 
      const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
      const incidentUrl = `https://api.tomtom.com/traffic/services/4/incidentDetails/s3/${bbox}/10/-1/json?key=${TOMTOM_API_KEY}`;
      
      const incidentRes = await fetch(incidentUrl);
      const incidentData = await incidentRes.json();
      
      if (incidentData.tm && incidentData.tm.poi) {
        const mappedIncidents = incidentData.tm.poi.map((p: any) => ({
          id: p.id,
          type: p.ic,
          severity: p.ty,
          description: p.d || 'Traffic Incident',
          coordinate: {
            latitude: p.p.y,
            longitude: p.p.x,
          }
        }));
        setIncidents(mappedIncidents);
      }
    } catch (err) {
      console.error('Error fetching incidents:', err);
    } finally {
      setIsFetchingData(false);
    }
  };

  const startLocationTracking = async () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
    }

    try {
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 5000,
          distanceInterval: 10, 
        },
        (newLocation) => {
          setLocation(newLocation);
        }
      );
    } catch (err) {
      console.error('Error starting location tracking:', err);
    }
  };

  const stopLocationTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        setPermissionStatus(status);
        
        if (status === 'granted') {
          await startLocationServices();
        } else {
          await requestLocationPermission();
        }
      } catch (err) {
        console.error('Initial permission check failed:', err);
      } finally {
        setIsLoading(false);
      }
    })();

    return () => {
      stopLocationTracking();
    };
  }, []);

  // Restore route view when coming back to the page
  useEffect(() => {
    if (routeCoordinates.length > 0 && mapRef.current) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(routeCoordinates, {
          edgePadding: { top: 150, right: 50, bottom: 350, left: 50 },
          animated: true,
        });
      }, 500);
    }
  }, []);

  const centerOnUser = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 1000);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  if (isLoading && !location) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{t('gpsLock')}</Text>
      </View>
    );
  }

  if (permissionStatus !== 'granted') {
    return (
      <View style={styles.permissionContainer}>
        <MapPin size={64} color="#FF3B30" />
        <Text style={styles.permissionTitle}>{t('locationRequired')}</Text>
        <Text style={styles.permissionText}>
          {error || t('locationText')}
        </Text>
        <TouchableOpacity 
          style={styles.permissionButton}
          onPress={requestLocationPermission}
        >
          <Text style={styles.permissionButtonText}>{t('continueBtn')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={location ? {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        } : QATAR_INITIAL_REGION}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        rotateEnabled={true}
        showsScale={true}
        showsBuildings={true}
        loadingEnabled={true}
        userInterfaceStyle="light"
        customMapStyle={BRIGHT_MAP_STYLE}
        showsTraffic={showTraffic}
      >
        {/* Destination Marker */}
        {destination && (
          <Marker
            coordinate={destination.coordinate}
            title={destination.name}
            description={destination.address}
          >
            <View style={styles.destinationMarker}>
              <MapPin size={24} color="#fff" />
            </View>
          </Marker>
        )}

        {/* Route Polyline - BRIGHT BLUE */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeWidth={6}
            strokeColor="#007AFF"
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Simulated Vehicles */}
        {showVehicles && vehicles.map((v) => (
          <Marker
            key={v.id}
            coordinate={v.coordinate}
            rotation={v.heading}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={Platform.OS === 'ios' ? false : true}
          >
            <View style={[styles.vehicleMarker, v.type === 'bus' && styles.busMarker, v.type === 'ev' && styles.evMarker]}>
              {v.type === 'car' && <Car size={14} color="#fff" />}
              {v.type === 'bus' && <Bus size={14} color="#fff" />}
              {v.type === 'ev' && <Zap size={14} color="#fff" />}
            </View>
          </Marker>
        ))}

        {/* Traffic Incident Markers */}
        {showIncidents && incidents.map((incident) => (
          <Marker
            key={incident.id}
            coordinate={incident.coordinate}
            tracksViewChanges={false}
          >
            <View style={[styles.incidentMarker, { backgroundColor: incident.severity > 2 ? '#FF3B30' : '#FF9500' }]}>
              <AlertTriangle size={14} color="#fff" />
            </View>
            <Callout>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{t('liveTraffic')}</Text>
                <Text style={styles.calloutText}>{incident.description}</Text>
              </View>
            </Callout>
          </Marker>
        ))}

        {location && (
          <Circle
            center={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            radius={location.coords.accuracy || 20}
            fillColor="rgba(0, 122, 255, 0.1)"
            strokeColor="rgba(0, 122, 255, 0.3)"
            strokeWidth={1}
          />
        )}
      </MapView>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, isRTL && { flexDirection: 'row-reverse' }]}>
          <Search size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, isRTL && { textAlign: 'right' }]}
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChangeText={searchPlaces}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch}>
              <X size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {searchResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.resultItem, isRTL && { flexDirection: 'row-reverse' }]}
                  onPress={() => selectDestination(item)}
                >
                  <MapPin size={18} color="#007AFF" />
                  <View style={[styles.resultTextContainer, isRTL ? { marginRight: 12 } : { marginLeft: 12 }]}>
                    <Text style={[styles.resultName, isRTL && { textAlign: 'right' }]}>{item.name}</Text>
                    <Text style={[styles.resultAddress, isRTL && { textAlign: 'right' }]} numberOfLines={1}>{item.address}</Text>
                  </View>
                  <ChevronRight size={18} color="#ccc" style={isRTL && { transform: [{ rotate: '180deg' }] }} />
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      {/* Layer Toggles */}
      <View style={[styles.layerContainer, isRTL ? { left: 20 } : { right: 20 }]}>
        <TouchableOpacity 
          style={[styles.layerButton, showTraffic && styles.layerButtonActive]}
          onPress={() => setShowTraffic(!showTraffic)}
        >
          <Layers size={20} color={showTraffic ? '#fff' : '#666'} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.layerButton, showVehicles && styles.layerButtonActive]}
          onPress={() => setShowVehicles(!showVehicles)}
        >
          <Car size={20} color={showVehicles ? '#fff' : '#666'} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.layerButton, showIncidents && styles.layerButtonActive]}
          onPress={() => setShowIncidents(!showIncidents)}
        >
          <AlertTriangle size={20} color={showIncidents ? '#fff' : '#666'} />
        </TouchableOpacity>
      </View>

      {/* Overlay UI */}
      <View style={styles.overlay}>
        <View style={[styles.actionButtons, isRTL ? { left: 20 } : { right: 20 }]}>
          {destination && (
            <TouchableOpacity 
              style={styles.navButton}
              onPress={() => setShowTransportModal(true)}
            >
              {isCalculatingRoute ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Navigation size={24} color="#fff" />
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.centerButton}
            onPress={centerOnUser}
          >
            <LocateFixed size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          {routeInfo ? (
            <>
              <View style={[styles.routeHeader, isRTL && { flexDirection: 'row-reverse' }]}>
                <Route size={24} color="#007AFF" />
                <Text style={[styles.routeTitle, isRTL && { textAlign: 'right', marginRight: 10 }]} numberOfLines={1}>
                  {isRTL ? 'الطريق إلى' : 'Route to'} {destination?.name}
                </Text>
              </View>
              <View style={[styles.routeInfoContainer, isRTL && { flexDirection: 'row-reverse' }]}>
                <View style={styles.routeItem}>
                  <Text style={styles.routeLabel}>{t('distance')}</Text>
                  <Text style={styles.routeValue}>{routeInfo.distance.toFixed(1)} km</Text>
                </View>
                <View style={styles.routeItem}>
                  <Clock size={20} color="#007AFF" />
                  <Text style={styles.routeTimeValue}>{formatDuration(routeInfo.duration)}</Text>
                </View>
                <View style={styles.routeItem}>
                  <Text style={styles.routeLabel}>{t('mode')}</Text>
                  <Text style={styles.routeValue}>
                    {transportMode === 'car' ? `🚗 ${t('car')}` : transportMode === 'bicycle' ? `🚲 ${t('bike')}` : `🚶 ${t('walking')}`}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.changeRouteButton}
                onPress={() => setShowTransportModal(true)}
              >
                <Text style={styles.changeRouteText}>{t('changeTransportMode')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={[styles.infoRow, isRTL && { flexDirection: 'row-reverse' }]}>
                <Navigation size={20} color="#007AFF" />
                <Text style={[styles.infoTitle, isRTL && { textAlign: 'right', flex: 1, marginRight: 8 }]}>{t('liveGpsData')}</Text>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>{t('active').toUpperCase()}</Text>
                </View>
              </View>
              <View style={[styles.coordsContainer, isRTL && { flexDirection: 'row-reverse' }]}>
                <View style={styles.coordItem}>
                  <Text style={styles.coordLabel}>{t('latitude')}</Text>
                  <Text style={styles.coordValue}>{location?.coords.latitude.toFixed(6) || '---'}</Text>
                </View>
                <View style={styles.coordItem}>
                  <Text style={styles.coordLabel}>{t('longitude')}</Text>
                  <Text style={styles.coordValue}>{location?.coords.longitude.toFixed(6) || '---'}</Text>
                </View>
              </View>
              <View style={[styles.accuracyRow, isRTL && { flexDirection: 'row-reverse' }]}>
                <Text style={[styles.accuracyLabel, isRTL && { marginLeft: 5 }]}>{t('accuracy')}:</Text>
                <Text style={[
                  styles.accuracyValue,
                  (location?.coords.accuracy || 100) < 20 ? styles.accuracyGood : styles.accuracyPoor
                ]}>
                  ±{location?.coords.accuracy?.toFixed(1) || '--'}m
                </Text>
                {isFetchingData && <ActivityIndicator size="small" color="#007AFF" style={{ marginLeft: 10 }} />}
              </View>
            </>
          )}
        </View>
      </View>

      {/* Transport Mode Modal */}
      <Modal
        visible={showTransportModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTransportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('chooseTransportMode')}</Text>
            <Text style={styles.modalSubtitle}>{t('selectTravelMethod').replace('{destination}', destination?.name || '')}</Text>
            <View style={[styles.modeContainer, isRTL && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity 
                style={[styles.modeButton, transportMode === 'car' && styles.modeButtonActive]}
                onPress={() => calculateRoute('car')}
              >
                <Car size={32} color={transportMode === 'car' ? '#fff' : '#007AFF'} />
                <Text style={[styles.modeText, transportMode === 'car' && styles.modeTextActive]}>{t('car')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modeButton, transportMode === 'bicycle' && styles.modeButtonActive]}
                onPress={() => calculateRoute('bicycle')}
              >
                <Bike size={32} color={transportMode === 'bicycle' ? '#fff' : '#007AFF'} />
                <Text style={[styles.modeText, transportMode === 'bicycle' && styles.modeTextActive]}>{t('bike')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modeButton, transportMode === 'bicycle' && styles.modeButtonActive]}
                onPress={() => calculateRoute('bicycle')}
              >
                <Zap size={32} color={transportMode === 'bicycle' ? '#fff' : '#007AFF'} />
                <Text style={[styles.modeText, transportMode === 'bicycle' && styles.modeTextActive]}>{t('escooter')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modeButton, transportMode === 'pedestrian' && styles.modeButtonActive]}
                onPress={() => calculateRoute('pedestrian')}
              >
                <Footprints size={32} color={transportMode === 'pedestrian' ? '#fff' : '#007AFF'} />
                <Text style={[styles.modeText, transportMode === 'pedestrian' && styles.modeTextActive]}>{t('walking')}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={styles.closeModalButton}
              onPress={() => setShowTransportModal(false)}
            >
              <Text style={styles.closeModalText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    width: width,
    height: height,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    color: '#1a1a1a',
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  searchContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 55,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    height: '100%',
  },
  resultsContainer: {
    backgroundColor: '#fff',
    marginTop: 5,
    borderRadius: 15,
    maxHeight: 300,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  resultAddress: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    pointerEvents: 'box-none',
  },
  actionButtons: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    alignItems: 'center',
    marginBottom: 20,
  },
  navButton: {
    backgroundColor: '#007AFF',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  centerButton: {
    backgroundColor: '#fff',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  layerContainer: {
    position: 'absolute',
    top: 130,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  layerButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  layerButtonActive: {
    backgroundColor: '#007AFF',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 6.27,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    flex: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    backgroundColor: '#10b981',
    borderRadius: 4,
    marginRight: 6,
  },
  liveText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: 'bold',
  },
  coordsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  coordItem: {
    flex: 1,
  },
  coordLabel: {
    fontSize: 10,
    color: '#999',
    letterSpacing: 1,
  },
  coordValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  routeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    flex: 1,
    color: '#333',
  },
  routeInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#f0f7ff',
    padding: 15,
    borderRadius: 12,
  },
  routeItem: {
    alignItems: 'center',
  },
  routeLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 5,
  },
  routeValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  routeTimeValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 5,
  },
  changeRouteButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  changeRouteText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  accuracyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  accuracyLabel: {
    fontSize: 12,
    color: '#666',
  },
  accuracyValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  accuracyGood: {
    color: '#10b981',
  },
  accuracyPoor: {
    color: '#FF9500',
  },
  destinationMarker: {
    backgroundColor: '#FF3B30',
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 5,
  },
  vehicleMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 5,
  },
  busMarker: {
    backgroundColor: '#FF9500',
  },
  evMarker: {
    backgroundColor: '#10b981',
  },
  incidentMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 3,
  },
  callout: {
    width: 150,
    padding: 5,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 2,
  },
  calloutText: {
    fontSize: 12,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
  },
  modeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  modeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: width / 5,
    height: 80,
    borderRadius: 15,
    backgroundColor: '#f0f7ff',
  },
  modeButtonActive: {
    backgroundColor: '#007AFF',
  },
  modeText: {
    marginTop: 8,
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  modeTextActive: {
    color: '#fff',
  },
  closeModalButton: {
    alignItems: 'center',
    padding: 15,
  },
  closeModalText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
});