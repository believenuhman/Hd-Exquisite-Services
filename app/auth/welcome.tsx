import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Platform,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenBackground } from "@/components/ScreenBackground";
import { GoldButton } from "@/components/GoldButton";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

const LOGO = require("@/assets/logo/hd-xquisite-logo-dark.png");

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { continueAsGuest } = useAuth();

  const handleGuestAccess = () => {
    continueAsGuest();
    router.replace("/(tabs)");
  };
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <ScreenBackground intensity="heavy">
      <View
        style={[
          styles.container,
          { paddingTop: topPad + 24, paddingBottom: botPad + 24 },
        ]}
      >
        {/* Logo + Brand */}
        <View style={styles.brandSection}>
          <View style={styles.logoGlowWrap}>
            <View style={styles.glowRing1} />
            <View style={styles.glowRing2} />
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          </View>

          <Text style={styles.brandName}>HD XQUISITE</Text>
          <Text style={styles.brandTagline}>LIQUORS</Text>
          <View style={styles.divider} />
          <Text style={styles.brandSub}>Premium Spirits Delivered</Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonsSection}>
          <GoldButton
            label="Log In"
            onPress={() => router.push("/auth/login")}
            icon="log-in-outline"
            iconPosition="right"
          />

          <View style={styles.buttonGap} />

          <GoldButton
            label="Create Account"
            onPress={() => router.push("/auth/signup")}
            variant="outline"
            icon="person-add-outline"
            iconPosition="right"
          />

          <View style={styles.guestRow}>
            <View style={styles.guestLine} />
            <Text style={styles.guestOr}>or</Text>
            <View style={styles.guestLine} />
          </View>

          <Pressable
            onPress={handleGuestAccess}
            style={styles.guestBtn}
          >
            <Ionicons
              name="storefront-outline"
              size={18}
              color={Colors.textSecondary}
            />
            <Text style={styles.guestBtnText}>Continue as Guest</Text>
          </Pressable>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          By continuing, you confirm you are 21+
        </Text>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "space-between",
  },
  brandSection: { alignItems: "center", flex: 1, justifyContent: "center" },
  logoGlowWrap: {
    width: 180,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  glowRing1: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1.5,
    borderColor: `${Colors.magenta}60`,
    shadowColor: Colors.magenta,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 0,
  },
  glowRing2: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: `${Colors.goldAccent}50`,
    shadowColor: Colors.goldAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 0,
  },
  logo: { width: 120, height: 120 },
  brandName: {
    fontFamily: "PlayfairDisplay_900Black",
    fontSize: 28,
    color: Colors.textPrimary,
    letterSpacing: 6,
  },
  brandTagline: {
    fontFamily: "CormorantGaramond_700Bold",
    fontSize: 18,
    color: Colors.goldAccent,
    letterSpacing: 10,
    marginTop: 2,
  },
  divider: {
    width: 60,
    height: 1,
    backgroundColor: `${Colors.goldAccent}60`,
    marginVertical: 14,
  },
  brandSub: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    letterSpacing: 2,
  },
  buttonsSection: {},
  buttonGap: { height: 12 },
  guestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 20,
  },
  guestLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  guestOr: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.3)",
  },
  guestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  guestBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.textSecondary,
  },
  footer: {
    textAlign: "center",
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.2)",
    marginTop: 16,
  },
});
