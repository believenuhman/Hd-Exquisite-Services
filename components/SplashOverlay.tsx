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

const PARTICLE_CONFIGS = [
  { x: 0.12, y: 0.18, size: 4, delay: 0 },
  { x: 0.85, y: 0.12, size: 3, delay: 300 },
  { x: 0.62, y: 0.28, size: 5, delay: 600 },
  { x: 0.22, y: 0.42, size: 3, delay: 900 },
  { x: 0.78, y: 0.52, size: 4, delay: 200 },
  { x: 0.08, y: 0.62, size: 3, delay: 700 },
  { x: 0.90, y: 0.68, size: 4, delay: 400 },
  { x: 0.48, y: 0.82, size: 3, delay: 1000 },
  { x: 0.33, y: 0.10, size: 5, delay: 150 },
  { x: 0.68, y: 0.88, size: 3, delay: 550 },
  { x: 0.04, y: 0.35, size: 4, delay: 800 },
  { x: 0.94, y: 0.40, size: 3, delay: 250 },
  { x: 0.55, y: 0.06, size: 4, delay: 450 },
  { x: 0.18, y: 0.75, size: 3, delay: 650 },
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
            toValue: 0.8,
            duration: 1500,
            useNativeDriver: UD,
          }),
          Animated.timing(translateY, {
            toValue: -20,
            duration: 2000,
            useNativeDriver: UD,
          }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: UD,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: UD,
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
  const logoScale = useRef(new Animated.Value(0.65)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          useNativeDriver: UD,
          tension: 55,
          friction: 8,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: UD,
        }),
        Animated.timing(glowScale, {
          toValue: 1.3,
          duration: 1400,
          useNativeDriver: UD,
        }),
      ]),
      Animated.delay(300),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: UD,
      }),
      Animated.delay(1400),
      Animated.timing(masterOpacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: UD,
      }),
    ]).start(() => {
      onFinish();
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: masterOpacity }]}>
      <ImageBackground
        source={require("@/assets/images/particle-bg.png")}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <LinearGradient
        colors={["rgba(11,11,15,0.45)", "rgba(11,11,15,0.3)", "rgba(11,11,15,0.65)"]}
        style={StyleSheet.absoluteFill}
        locations={[0, 0.5, 1]}
      />

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
          styles.glowRing2,
          {
            transform: [{ scale: glowScale }],
            opacity: logoOpacity,
          },
        ]}
      />

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
          source={require("@/assets/images/icon.png")}
          style={styles.sphereImage}
          contentFit="contain"
        />
      </Animated.View>

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
  },
  glowRing: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(214,162,74,0.14)",
    top: height * 0.5 - 200,
  },
  glowRing2: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(214,162,74,0.1)",
    top: height * 0.5 - 160,
  },
  logoWrapper: {
    marginBottom: 36,
  },
  sphereImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  textBlock: {
    alignItems: "center",
    gap: 8,
  },
  titleLine1: {
    fontSize: 28,
    letterSpacing: 7,
    color: Colors.textPrimary,
    fontFamily: "PlayfairDisplay_700Bold",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dividerLine: {
    width: 30,
    height: 1,
    backgroundColor: Colors.goldAccent,
    opacity: 0.6,
  },
  titleLine2: {
    fontSize: 16,
    letterSpacing: 8,
    color: Colors.goldAccent,
    fontFamily: "CormorantGaramond_600SemiBold",
  },
  tagline: {
    fontSize: 13,
    letterSpacing: 2,
    color: "rgba(255,255,255,0.5)",
    fontFamily: "CormorantGaramond_400Regular",
    marginTop: 6,
  },
});
