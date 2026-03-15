import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Dimensions,
  Image,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { useAgeGate } from "@/context/AgeGateContext";
import { router } from "expo-router";

const { width, height } = Dimensions.get("window");
const UD = Platform.OS !== "web";

export default function AgeGateScreen() {
  const insets = useSafeAreaInsets();
  const { confirm } = useAgeGate();
  const opacity = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: UD }),
      Animated.timing(slideY, { toValue: 0, duration: 700, useNativeDriver: UD }),
    ]).start();
  }, []);

  const handleConfirm = async () => {
    await confirm();
    router.replace("/(tabs)");
  };

  const handleDecline = () => {
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0B0B0F", "#0E0B18", "#0B0B0F"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.glowOrb, styles.glow1]} />
      <View style={[styles.glowOrb, styles.glow2]} />

      <Animated.View style={[styles.content, { opacity, transform: [{ translateY: slideY }], paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0), paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) }]}>
        <Image
          source={require("@/assets/logo/hd-xquisite-logo-dark.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>HD XQUISITE{"\n"}LIQUORS</Text>
        <Text style={styles.subtitle}>Premium Spirits Delivery</Text>

        <View style={styles.divider} />

        <Text style={styles.heading}>Age Verification</Text>
        <Text style={styles.body}>
          You must be 18 years of age or older to enter this app. By continuing, you confirm that you are of legal drinking age in your jurisdiction.
        </Text>

        <Text style={styles.idNote}>
          Valid government-issued ID will be required upon delivery.
        </Text>

        <Pressable onPress={handleConfirm} style={styles.confirmBtn}>
          <LinearGradient
            colors={[Colors.goldStart, Colors.goldEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.confirmGrad}
          >
            <Text style={styles.confirmText}>I AM 18 OR OLDER — ENTER</Text>
          </LinearGradient>
        </Pressable>

        <Pressable onPress={handleDecline} style={styles.declineBtn}>
          <Text style={styles.declineText}>I am under 18 — Exit</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  glowOrb: { position: "absolute", borderRadius: 999, opacity: 0.18 },
  glow1: {
    width: 300, height: 300,
    top: -80, left: -80,
    backgroundColor: Colors.goldAccent,
  },
  glow2: {
    width: 250, height: 250,
    bottom: 80, right: -60,
    backgroundColor: Colors.goldStart,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 16,
  },
  title: {
    fontFamily: "PlayfairDisplay_900Black",
    fontSize: 28,
    color: Colors.textPrimary,
    textAlign: "center",
    letterSpacing: 3,
    lineHeight: 36,
  },
  subtitle: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 14,
    color: Colors.goldAccent,
    letterSpacing: 4,
    marginTop: 6,
    textTransform: "uppercase",
  },
  divider: {
    width: 60,
    height: 1,
    backgroundColor: Colors.goldAccent,
    opacity: 0.5,
    marginVertical: 28,
  },
  heading: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 22,
    color: Colors.textPrimary,
    marginBottom: 16,
    textAlign: "center",
  },
  body: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 20,
  },
  idNote: {
    fontFamily: "CormorantGaramond_600SemiBold",
    fontSize: 13,
    color: Colors.goldAccent,
    textAlign: "center",
    marginBottom: 36,
    letterSpacing: 0.5,
  },
  confirmBtn: { width: "100%", borderRadius: 14, overflow: "hidden", marginBottom: 16 },
  confirmGrad: { paddingVertical: 16, alignItems: "center" },
  confirmText: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 14,
    color: "#000",
    letterSpacing: 1.5,
  },
  declineBtn: { paddingVertical: 12 },
  declineText: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 15,
    color: "rgba(185,185,195,0.6)",
    textDecorationLine: "underline",
  },
});
