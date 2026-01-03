import React, { createContext, useContext, useState, ReactNode } from 'react';

// Types
interface RouteCoordinate {
  latitude: number;
  longitude: number;
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

interface RouteInfo {
  distance: number;
  duration: number;
}

type TransportMode = 'car' | 'bicycle' | 'pedestrian';

interface SearchState {
  // Search & Navigation
  searchQuery: string;
  destination: SearchResult | null;
  transportMode: TransportMode;
  routeCoordinates: RouteCoordinate[];
  routeInfo: RouteInfo | null;
  
  // Layer toggles
  showTraffic: boolean;
  showVehicles: boolean;
  showIncidents: boolean;
}

interface SearchContextType extends SearchState {
  setSearchQuery: (query: string) => void;
  setDestination: (dest: SearchResult | null) => void;
  setTransportMode: (mode: TransportMode) => void;
  setRouteCoordinates: (coords: RouteCoordinate[]) => void;
  setRouteInfo: (info: RouteInfo | null) => void;
  setShowTraffic: (show: boolean) => void;
  setShowVehicles: (show: boolean) => void;
  setShowIncidents: (show: boolean) => void;
  clearRoute: () => void;
}

const defaultState: SearchState = {
  searchQuery: '',
  destination: null,
  transportMode: 'car',
  routeCoordinates: [],
  routeInfo: null,
  showTraffic: true,
  showVehicles: true,
  showIncidents: true,
};

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState(defaultState.searchQuery);
  const [destination, setDestination] = useState<SearchResult | null>(defaultState.destination);
  const [transportMode, setTransportMode] = useState<TransportMode>(defaultState.transportMode);
  const [routeCoordinates, setRouteCoordinates] = useState<RouteCoordinate[]>(defaultState.routeCoordinates);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(defaultState.routeInfo);
  const [showTraffic, setShowTraffic] = useState(defaultState.showTraffic);
  const [showVehicles, setShowVehicles] = useState(defaultState.showVehicles);
  const [showIncidents, setShowIncidents] = useState(defaultState.showIncidents);

  const clearRoute = () => {
    setSearchQuery('');
    setDestination(null);
    setRouteCoordinates([]);
    setRouteInfo(null);
  };

  return (
    <SearchContext.Provider
      value={{
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
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearchState() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearchState must be used within a SearchProvider');
  }
  return context;
}
