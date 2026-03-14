import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  View,
  ImageBackground,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Colors } from "@/constants/colors";

const { width, height } = Dimensions.get("window");
const UD = Platform.OS !== "web";
const LOGO_SIZE = 220;

const PARTICLE_CONFIGS = [
  { x: 0.10, y: 0.15, size: 4, delay: 0 },
  { x: 0.88, y: 0.10, size: 3, delay: 300 },
  { x: 0.65, y: 0.25, size: 5, delay: 600 },
  { x: 0.20, y: 0.44, size: 3, delay: 900 },
  { x: 0.80, y: 0.55, size: 4, delay: 200 },
  { x: 0.06, y: 0.65, size: 3, delay: 700 },
  { x: 0.92, y: 0.70, size: 4, delay: 400 },
  { x: 0.50, y: 0.84, size: 3, delay: 1000 },
  { x: 0.30, y: 0.08, size: 5, delay: 150 },
  { x: 0.70, y: 0.90, size: 3, delay: 550 },
  { x: 0.03, y: 0.32, size: 4, delay: 800 },
  { x: 0.95, y: 0.38, size: 3, delay: 250 },
  { x: 0.52, y: 0.04, size: 4, delay: 450 },
  { x: 0.16, y: 0.78, size: 3, delay: 650 },
];

function FloatingParticle({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.9, duration: 1500, useNativeDriver: UD }),
          Animated.timing(translateY, { toValue: -22, duration: 2200, useNativeDriver: UD }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 1200, useNativeDriver: UD }),
          Animated.timing(translateY, { toValue: 0, duration: 1200, useNativeDriver: UD }),
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
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const glowScale1 = useRef(new Animated.Value(0.5)).current;
  const glowScale2 = useRef(new Animated.Value(0.5)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(150),
      // Glow expands first
      Animated.parallel([
        Animated.timing(glowOpacity, { toValue: 1, duration: 500, useNativeDriver: UD }),
        Animated.timing(glowScale1, { toValue: 1, duration: 1200, useNativeDriver: UD }),
        Animated.timing(glowScale2, { toValue: 1, duration: 1600, useNativeDriver: UD }),
      ]),
    ]).start();

    Animated.sequence([
      Animated.delay(250),
      // Logo springs in
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          useNativeDriver: UD,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: UD }),
      ]),
      Animated.delay(350),
      // Text fades in
      Animated.timing(textOpacity, { toValue: 1, duration: 600, useNativeDriver: UD }),
      // Hold for 2 seconds total visible
      Animated.delay(1500),
      // Fade out everything
      Animated.timing(masterOpacity, { toValue: 0, duration: 550, useNativeDriver: UD }),
    ]).start(() => onFinish());
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: masterOpacity }]}>
      <ImageBackground
        source={require("@/assets/images/particle-bg.png")}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <LinearGradient
        colors={["rgba(9,9,12,0.55)", "rgba(9,9,12,0.35)", "rgba(9,9,12,0.72)"]}
        style={StyleSheet.absoluteFill}
        locations={[0, 0.5, 1]}
      />

      {PARTICLE_CONFIGS.map((p, i) => (
        <FloatingParticle key={i} {...p} />
      ))}

      {/* Outer magenta glow ring */}
      <Animated.View
        style={[
          styles.glowRingOuter,
          { transform: [{ scale: glowScale1 }], opacity: glowOpacity },
        ]}
      />
      {/* Inner gold glow ring */}
      <Animated.View
        style={[
          styles.glowRingInner,
          { transform: [{ scale: glowScale2 }], opacity: glowOpacity },
        ]}
      />

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={require("@/assets/logo/hd-xquisite-logo-dark.png")}
          style={styles.logoImage}
          contentFit="contain"
        />
      </Animated.View>

      {/* Brand text */}
      <Animated.View style={[styles.textBlock, { opacity: textOpacity }]}>
        <Text style={styles.titleLine1}>HD XQUISITE</Text>
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.titleLine2}>LIQUORS</Text>
          <View style={styles.dividerLine} />
        </View>
        <Text style={styles.tagline}>Premium Spirits. Delivered.</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    backgroundColor: "#09090C",
  },

  /* Glow rings */
  glowRingOuter: {
    position: "absolute",
    width: LOGO_SIZE + 140,
    height: LOGO_SIZE + 140,
    borderRadius: (LOGO_SIZE + 140) / 2,
    backgroundColor: "rgba(201,30,140,0.12)",
    top: height * 0.5 - (LOGO_SIZE + 140) / 2 - 40,
  },
  glowRingInner: {
    position: "absolute",
    width: LOGO_SIZE + 60,
    height: LOGO_SIZE + 60,
    borderRadius: (LOGO_SIZE + 60) / 2,
    backgroundColor: "rgba(228,161,43,0.1)",
    top: height * 0.5 - (LOGO_SIZE + 60) / 2 - 40,
  },

  /* Logo */
  logoWrapper: {
    marginBottom: 32,
    shadowColor: Colors.magenta,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
  },
  logoImage: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },

  /* Text */
  textBlock: {
    alignItems: "center",
    gap: 8,
  },
  titleLine1: {
    fontSize: 30,
    letterSpacing: 7,
    color: Colors.textPrimary,
    fontFamily: "PlayfairDisplay_700Bold",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dividerLine: {
    width: 36,
    height: 1,
    backgroundColor: Colors.goldAccent,
    opacity: 0.65,
  },
  titleLine2: {
    fontSize: 17,
    letterSpacing: 8,
    color: Colors.goldAccent,
    fontFamily: "CormorantGaramond_600SemiBold",
  },
  tagline: {
    fontSize: 13,
    letterSpacing: 2.2,
    color: "rgba(255,255,255,0.45)",
    fontFamily: "CormorantGaramond_400Regular",
    marginTop: 8,
  },
});
