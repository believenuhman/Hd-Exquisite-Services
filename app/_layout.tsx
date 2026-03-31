import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, router, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { CartProvider } from "@/context/CartContext";
import { AppSettingsProvider } from "@/context/AppSettingsContext";
import { AgeGateProvider, useAgeGate } from "@/context/AgeGateContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SplashOverlay } from "@/components/SplashOverlay";
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_900Black,
} from "@expo-google-fonts/playfair-display";
import {
  CormorantGaramond_400Regular,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
} from "@expo-google-fonts/cormorant-garamond";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

SplashScreen.preventAutoHideAsync();

function AgeGateGuard() {
  const { ageConfirmed, loading } = useAgeGate();

  useEffect(() => {
    if (!loading && ageConfirmed === false) {
      router.replace("/age-gate");
    }
  }, [ageConfirmed, loading]);

  return null;
}

function AuthGuard() {
  const { session, isGuest, loading: authLoading } = useAuth();
  const { ageConfirmed, loading: ageLoading } = useAgeGate();
  const segments = useSegments();

  useEffect(() => {
    if (authLoading || ageLoading) return;
    if (!ageConfirmed) return;

    const onAuthScreen = segments[0] === "auth";

    // Unauthenticated + not guest + not already on auth screen → show welcome
    if (!session && !isGuest && !onAuthScreen) {
      router.replace("/auth/welcome");
    }

    // Truly signed in + on auth screen → enter the app (no need to see login)
    if (session && onAuthScreen) {
      router.replace("/(tabs)");
    }
    // Guests can freely navigate to auth screens to sign up — no redirect
  }, [session, isGuest, authLoading, ageConfirmed, ageLoading, segments]);

  return null;
}

function RootLayoutNav() {
  return (
    <>
      <AgeGateGuard />
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="age-gate" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen
          name="product/[id]"
          options={{
            headerShown: false,
            presentation: "card",
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="checkout"
          options={{
            headerShown: false,
            presentation: "card",
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen
          name="order-tracking/[id]"
          options={{
            headerShown: false,
            presentation: "card",
            animation: "slide_from_right",
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [splashDone, setSplashDone] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_900Black,
    CormorantGaramond_400Regular,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AgeGateProvider>
          <AuthProvider>
            <AppSettingsProvider>
              <CartProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  
                    <RootLayoutNav />
                    {!splashDone && (
                      <SplashOverlay onFinish={() => setSplashDone(true)} />
                    )}
                  
                </GestureHandlerRootView>
              </CartProvider>
            </AppSettingsProvider>
          </AuthProvider>
        </AgeGateProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
