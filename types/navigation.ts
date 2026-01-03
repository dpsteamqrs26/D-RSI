// types/navigation.ts
export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface MapRegion extends LocationCoordinates {
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface SearchResult {
  id: string;
  address: string;
  city?: string;
  country?: string;
  coordinates: LocationCoordinates;
}

export interface RouteInfo {
  distance: string;
  time: number;
  trafficDelay?: number;
}

export interface StepDirection {
  instruction: string;
  distance: string;
}

export type TravelMode = 'car' | 'walk' | 'bike' | 'motorcycle' | 'truck';

export interface TomTomSearchResponse {
  results: Array<{
    id: string;
    address: {
      freeformAddress: string;
      municipality?: string;
      country?: string;
    };
    position: {
      lat: number;
      lon: number;
    };
  }>;
}

export interface TomTomRouteResponse {
  routes: Array<{
    summary: {
      lengthInMeters: number;
      travelTimeInSeconds: number;
      trafficDelayInSeconds?: number;
    };
    legs: Array<{
      points: Array<{
        latitude: number;
        longitude: number;
      }>;
    }>;
    guidance?: {
      instructions: Array<{
        message: string;
        routeOffsetInMeters: number;
      }>;
    };
  }>;
}

export interface Point {
  latitude: number;
  longitude: number;
}