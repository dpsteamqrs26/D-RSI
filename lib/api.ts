// lib/api.ts
import Constants from 'expo-constants';

export function getBaseUrl(): string {
  // In development, use your local IP or localhost
  if (__DEV__) {
    // Option 1: Use your computer's local IP (recommended for physical devices)
    // Replace with your actual IP address
    const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
    if (debuggerHost) {
      // If we're using an Expo tunnel, the port is handled by the proxy
      if (debuggerHost.includes('exp.direct')) {
        return `https://${debuggerHost}`;
      }
      return `http://${debuggerHost}:8081`;
    }
    
    // Option 2: Fallback to localhost (for emulators)
    return 'http://localhost:8081';
  }
  
  // In production, use your deployed URL
  return 'https://your-production-url.com';
}