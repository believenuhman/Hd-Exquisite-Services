import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/colors";

const { width, height } = Dimensions.get("window");

const PARTICLE_CONFIGS = [
  { x: 0.15, y: 0.2, size: 3, delay: 0 },
  { x: 0.82, y: 0.15, size: 2, delay: 300 },
  { x: 0.6, y: 0.3, size: 4, delay: 600 },
  { x: 0.25, y: 0.45, size: 2, delay: 900 },
  { x: 0.75, y: 0.55, size: 3, delay: 200 },
  { x: 0.1, y: 0.65, size: 2, delay: 700 },
  { x: 0.88, y: 0.7, size: 3, delay: 400 },
  { x: 0.45, y: 0.8, size: 2, delay: 1000 },
  { x: 0.35, y: 0.12, size: 3, delay: 150 },
  { x: 0.65, y: 0.85, size: 2, delay: 550 },
  { x: 0.05, y: 0.38, size: 4, delay: 800 },
  { x: 0.92, y: 0.42, size: 2, delay: 250 },
];

function FloatingParticle({
  x,
  y,
  size,
  delay,
}: {
  x: number;
  y: number;
  size: number;
  delay: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0.7,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -18,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: x * width,
        top: y * height,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: Colors.goldAccent,
        opacity,
        transform: [{ translateY }],
      }}
    />
  );
}

interface SplashOverlayProps {
  onFinish: () => void;
}

export function SplashOverlay({ onFinish }: SplashOverlayProps) {
  const masterOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 60,
          friction: 8,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(glowScale, {
          toValue: 1.2,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(400),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.delay(1200),
      Animated.timing(masterOpacity, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish();
    });
  }, []);

  return (
    <Animated.View
      style={[styles.container, { opacity: masterOpacity }]}
      pointerEvents="none"
    >
      {PARTICLE_CONFIGS.map((p, i) => (
        <FloatingParticle key={i} {...p} />
      ))}

      <Animated.View
        style={[
          styles.glowRing,
          {
            transform: [{ scale: glowScale }],
            opacity: logoOpacity,
          },
        ]}
      />

      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <LinearGradient
          colors={[Colors.goldStart, Colors.goldEnd, Colors.goldStart]}
          style={styles.sphere}
          start={{ x: 0.2, y: 0.1 }}
          end={{ x: 0.8, y: 0.9 }}
        />
      </Animated.View>

      <Animated.View style={[styles.textContainer, { opacity: textOpacity }]}>
        <Text style={styles.brandName}>HD XQUISITE LIQUORS</Text>
        <View style={styles.divider} />
        <Text style={styles.tagline}>Premium Spirits. Delivered.</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  glowRing: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(214,162,74,0.12)",
    top: height / 2 - 170,
  },
  logoContainer: {
    marginBottom: 48,
    shadowColor: Colors.goldAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 40,
    elevation: 20,
  },
  sphere: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  textContainer: {
    alignItems: "center",
    gap: 10,
  },
  brandName: {
    fontSize: 20,
    letterSpacing: 6,
    color: Colors.textPrimary,
    fontFamily: "PlayfairDisplay_700Bold",
    textAlign: "center",
  },
  divider: {
    width: 60,
    height: 1,
    backgroundColor: Colors.goldAccent,
    opacity: 0.5,
  },
  tagline: {
    fontSize: 13,
    letterSpacing: 2.5,
    color: Colors.textSecondary,
    fontFamily: "CormorantGaramond_400Regular",
    textAlign: "center",
  },
});
