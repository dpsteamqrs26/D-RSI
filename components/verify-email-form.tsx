import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { useSignUp, useUser } from '@clerk/clerk-expo';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { type TextStyle, View } from 'react-native';
import { getBaseUrl } from '@/lib/api';

const RESEND_CODE_INTERVAL_SECONDS = 30;
const TABULAR_NUMBERS_STYLE: TextStyle = { fontVariant: ['tabular-nums'] };

export function VerifyEmailForm() {
  const { signUp, setActive, isLoaded: signUpLoaded } = useSignUp();
  const { user, isLoaded: userLoaded } = useUser();
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState('');
  const [isVerifying, setIsVerifying] = React.useState(false);
  const { countdown, restartCountdown } = useCountdown(RESEND_CODE_INTERVAL_SECONDS);

  // Helper to sync user with your backend
  const syncUserToDatabase = async (clerkUser: any) => {
    try {
      const payload = {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
      };
      
      const API_BASE = getBaseUrl();
      const res = await fetch(`${API_BASE}/api/sync-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      console.log('Sync status:', res.status);
    } catch (e) {
      console.warn('DB Sync failed:', e);
    }
  };

  async function onSubmit() {
    if (!signUpLoaded || !signUp) return;
    setIsVerifying(true);
    setError('');

    try {
      const signUpAttempt = await signUp.attemptEmailAddressVerification({ code });

      if (signUpAttempt.status === 'complete') {
        // 1. Activate the session
        await setActive({ session: signUpAttempt.createdSessionId });

        // 2. Redirect to your main app (e.g., home or dashboard)
        // We do this immediately; sync happens in the background
        router.replace('/'); 
        
        // 3. Background sync (optional: you can also do this in a useEffect on your Home page)
        // Note: 'user' might not be populated immediately, so we wait or use Clerk's internal state
      } else {
        console.error(JSON.stringify(signUpAttempt, null, 2));
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || err.message || "Something went wrong");
    } finally {
      setIsVerifying(false);
    }
  }

  async function onResendCode() {
    if (!signUpLoaded || !signUp) return;
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      restartCountdown();
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || err.message);
    }
  }

  if (!signUpLoaded) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Text>Initializing...</Text>
      </View>
    );
  }

  return (
    <View className="gap-6">
      <Card className="border-border/0 shadow-none sm:border-border sm:shadow-sm sm:shadow-black/5">
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-left">Verify your email</CardTitle>
          <CardDescription className="text-center sm:text-left">
            Enter the verification code sent to {email || 'your email'}
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="gap-6">
            <View className="gap-1.5">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                autoCapitalize="none"
                onChangeText={setCode}
                value={code}
                returnKeyType="send"
                keyboardType="numeric"
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
                onSubmitEditing={onSubmit}
              />
              {error ? (
                <Text className="text-sm font-medium text-destructive">{error}</Text>
              ) : null}
              
              <Button 
                variant="link" 
                size="sm" 
                disabled={countdown > 0} 
                onPress={onResendCode}
                className="justify-start px-0"
              >
                <Text className="text-xs">
                  Didn&apos;t receive the code? Resend{' '}
                  {countdown > 0 ? (
                    <Text className="text-xs" style={TABULAR_NUMBERS_STYLE}>
                      ({countdown})
                    </Text>
                  ) : null}
                </Text>
              </Button>
            </View>

            <View className="gap-3">
              <Button className="w-full" onPress={onSubmit} disabled={isVerifying}>
                <Text>{isVerifying ? "Verifying..." : "Continue"}</Text>
              </Button>
              <Button variant="ghost" className="mx-auto" onPress={() => router.back()}>
                <Text>Cancel</Text>
              </Button>
            </View>
          </View>
        </CardContent>
      </Card>
    </View>
  );
}

// Countdown Hook
function useCountdown(seconds = 30) {
  const [countdown, setCountdown] = React.useState(0);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = React.useCallback(() => {
    setCountdown(seconds);
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [seconds]);

  React.useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  return { countdown, restartCountdown: startCountdown };
}