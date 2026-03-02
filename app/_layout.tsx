import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { CartProvider } from "@/context/CartContext";
import { AppSettingsProvider } from "@/context/AppSettingsContext";
import { AgeGateProvider, useAgeGate } from "@/context/AgeGateContext";
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

function RootLayoutNav() {
  return (
    <>
      <AgeGateGuard />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="age-gate" options={{ headerShown: false }} />
        <Stack.Screen
          name="product/[id]"
          options={{ headerShown: false, presentation: "card", animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="checkout"
          options={{ headerShown: false, presentation: "card", animation: "slide_from_bottom" }}
        />
        <Stack.Screen
          name="order-tracking/[id]"
          options={{ headerShown: false, presentation: "card", animation: "slide_from_right" }}
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
          <AppSettingsProvider>
            <CartProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <RootLayoutNav />
                  {!splashDone && (
                    <SplashOverlay onFinish={() => setSplashDone(true)} />
                  )}
                </KeyboardProvider>
              </GestureHandlerRootView>
            </CartProvider>
          </AppSettingsProvider>
        </AgeGateProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
