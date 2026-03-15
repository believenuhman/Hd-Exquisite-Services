import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Platform,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScreenBackground } from "@/components/ScreenBackground";
import { GoldButton } from "@/components/GoldButton";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

const LOGO = require("@/assets/logo/hd-xquisite-logo-dark.png");

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    setError(null);
    if (!email.trim()) return setError("Please enter your email.");
    if (!password) return setError("Please enter your password.");

    setLoading(true);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) {
      setError(err.includes("Invalid") ? "Invalid email or password." : err);
    }
  };

  return (
    <ScreenBackground intensity="heavy">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 16, paddingBottom: botPad + 40 },
        ]}
      >
        {/* Back */}
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.goldAccent} />
        </Pressable>

        {/* Logo */}
        <View style={styles.logoWrap}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        </View>

        {/* Heading */}
        <Text style={styles.heading}>Welcome Back</Text>
        <Text style={styles.subheading}>Sign in to your account</Text>

        {/* Form */}
        <View style={styles.form}>
          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrap}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={Colors.goldAccent}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(t) => { setEmail(t); setError(null); }}
                placeholder="your@email.com"
                placeholderTextColor="rgba(185,185,195,0.35)"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={Colors.goldAccent}
                style={styles.inputIcon}
              />
              <TextInput
                ref={passwordRef}
                style={[styles.input, styles.inputFlex]}
                value={password}
                onChangeText={(t) => { setPassword(t); setError(null); }}
                placeholder="••••••••"
                placeholderTextColor="rgba(185,185,195,0.35)"
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <Pressable
                onPress={() => setShowPassword((p) => !p)}
                style={styles.eyeBtn}
                hitSlop={8}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="rgba(185,185,195,0.5)"
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={() => router.push("/auth/forgot-password")}
            style={styles.forgotWrap}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </Pressable>

          {loading ? (
            <ActivityIndicator
              color={Colors.goldAccent}
              style={styles.loader}
            />
          ) : (
            <GoldButton
              label="Log In"
              onPress={handleLogin}
              icon="log-in-outline"
              iconPosition="right"
            />
          )}
        </View>

        {/* Sign Up Link */}
        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Don't have an account? </Text>
          <Pressable onPress={() => router.replace("/auth/signup")}>
            <Text style={styles.switchLink}>Sign Up</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const INPUT_BG = "rgba(20,20,28,0.8)";
const BORDER = "rgba(214,162,74,0.18)";

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 26 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(228,161,43,0.08)",
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  logoWrap: { alignItems: "center", marginBottom: 28 },
  logo: { width: 90, height: 90 },
  heading: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 28,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 6,
  },
  subheading: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 32,
  },
  form: { gap: 0 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(220,53,69,0.12)",
    borderWidth: 1,
    borderColor: "rgba(220,53,69,0.3)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.danger,
    flex: 1,
  },
  inputGroup: { marginBottom: 18 },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.goldAccent,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: INPUT_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 16,
    color: Colors.textPrimary,
  },
  inputFlex: { flex: 1 },
  eyeBtn: { paddingLeft: 8 },
  forgotWrap: { alignSelf: "flex-end", marginBottom: 24, marginTop: 2 },
  forgotText: {
    fontFamily: "CormorantGaramond_600SemiBold",
    fontSize: 14,
    color: Colors.magenta,
  },
  loader: { paddingVertical: 10 },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
  },
  switchText: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 15,
    color: Colors.textSecondary,
  },
  switchLink: {
    fontFamily: "CormorantGaramond_700Bold",
    fontSize: 15,
    color: Colors.goldAccent,
  },
});
