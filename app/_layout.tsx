import '@/global.css';

import { AppFooter } from '@/components/app-footer';
import { NAV_THEME } from '@/lib/theme';
import { SearchProvider } from '@/context/SearchContext';
import { QuizProvider } from '@/context/QuizContext';
import { ClerkProvider, ClerkLoaded, useAuth, useUser } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Stack, usePathname, useRouter, Redirect } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { View } from 'react-native';



export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Get the publishable key from environment variables
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

// Custom token cache using SecureStore for reliability
const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return await SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

if (!publishableKey) {
  throw new Error(
    'Missing Clerk Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env.local file. ' +
    'Make sure to restart your development server after adding the environment variable.'
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <SearchProvider>
          <QuizProvider>
            <ThemeProvider value={NAV_THEME.light}>
              <StatusBar style="dark" />
              <Routes />
              <PortalHost />
            </ThemeProvider>
          </QuizProvider>
        </SearchProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}

SplashScreen.preventAutoHideAsync();



function Routes() {
  const { isSignedIn, isLoaded } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isAuthRoute = pathname.startsWith('/sign-in') || 
                      pathname.startsWith('/sign-up') || 
                      pathname.startsWith('/forgot-password') || 
                      pathname.startsWith('/reset-password') ||
                      pathname.startsWith('/verify-email');

  React.useEffect(() => {
    if (isLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isLoaded]);

  React.useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn && !isAuthRoute) {
      router.replace('/(auth)/sign-in');
    } else if (isSignedIn && isAuthRoute) {
      router.replace('/');
    }
  }, [isSignedIn, isLoaded, isAuthRoute]);

  if (!isLoaded) {
    return null;
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-1">
        <Stack screenOptions={SCREEN_OPTIONS}>
          {isSignedIn ? (
            <>
              <Stack.Screen name="index" />
              <Stack.Screen name="search" />
              <Stack.Screen name="quizzes" />
              <Stack.Screen name="courses" />
              <Stack.Screen name="profile" />
              <Stack.Screen name="ranking" />
              <Stack.Screen name="create-quiz" options={{ presentation: 'modal', headerShown: false }} />
              <Stack.Screen name="create-course" options={{ presentation: 'modal', headerShown: false }} />
            </>
          ) : (
            <>
              <Stack.Screen name="(auth)/sign-in" options={SIGN_IN_SCREEN_OPTIONS} />
              <Stack.Screen name="(auth)/sign-up" options={SIGN_UP_SCREEN_OPTIONS} />
              <Stack.Screen name="(auth)/reset-password" options={DEFAULT_AUTH_SCREEN_OPTIONS} />
              <Stack.Screen name="(auth)/forgot-password" options={DEFAULT_AUTH_SCREEN_OPTIONS} />
              <Stack.Screen name="(auth)/verify-email" options={DEFAULT_AUTH_SCREEN_OPTIONS} />
            </>
          )}
        </Stack>
      </View>

      {/* Footer only when signed in and not on auth screens */}
      {!isAuthRoute && isSignedIn && <AppFooter />}
    </View>
  );
}

const SCREEN_OPTIONS = {
  headerShown: false,
};

const SIGN_IN_SCREEN_OPTIONS = {
  headerShown: false,
  title: 'Sign in',
};

const SIGN_UP_SCREEN_OPTIONS = {
  presentation: 'modal',
  title: '',
  headerTransparent: true,
  gestureEnabled: false,
} as const;

const DEFAULT_AUTH_SCREEN_OPTIONS = {
  title: '',
  headerShadowVisible: false,
  headerTransparent: true,
};

