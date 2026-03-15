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

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const handleSignUp = async () => {
    setError(null);
    if (!fullName.trim()) return setError("Please enter your full name.");
    if (!email.trim()) return setError("Please enter your email.");
    if (!/\S+@\S+\.\S+/.test(email)) return setError("Please enter a valid email.");
    if (!password) return setError("Please enter a password.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");

    setLoading(true);
    const { error: err } = await signUp(email, password, fullName, phone);
    setLoading(false);
    if (err) {
      if (err.toLowerCase().includes("already")) {
        setError("An account with this email already exists.");
      } else {
        setError(err);
      }
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <ScreenBackground intensity="heavy">
        <View
          style={[
            styles.successWrap,
            { paddingTop: topPad + 24, paddingBottom: botPad + 40 },
          ]}
        >
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color={Colors.goldAccent} />
          </View>
          <Text style={styles.successHeading}>Account Created!</Text>
          <Text style={styles.successSub}>
            Check your email to verify your account, then log in.
          </Text>
          <View style={styles.successBtnWrap}>
            <GoldButton
              label="Go to Log In"
              onPress={() => router.replace("/auth/login")}
              icon="log-in-outline"
              iconPosition="right"
            />
          </View>
        </View>
      </ScreenBackground>
    );
  }

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

        <Text style={styles.heading}>Create Account</Text>
        <Text style={styles.subheading}>Join the HD Xquisite family</Text>

        <View style={styles.form}>
          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputWrap}>
              <Ionicons
                name="person-outline"
                size={18}
                color={Colors.goldAccent}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={(t) => { setFullName(t); setError(null); }}
                placeholder="Your full name"
                placeholderTextColor="rgba(185,185,195,0.35)"
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>

          {/* Email */}
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
                ref={emailRef}
                style={styles.input}
                value={email}
                onChangeText={(t) => { setEmail(t); setError(null); }}
                placeholder="your@email.com"
                placeholderTextColor="rgba(185,185,195,0.35)"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => phoneRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number <Text style={styles.optional}>(optional)</Text></Text>
            <View style={styles.inputWrap}>
              <Ionicons
                name="call-outline"
                size={18}
                color={Colors.goldAccent}
                style={styles.inputIcon}
              />
              <TextInput
                ref={phoneRef}
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+1 (555) 000-0000"
                placeholderTextColor="rgba(185,185,195,0.35)"
                keyboardType="phone-pad"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>

          {/* Password */}
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
                placeholder="Min. 6 characters"
                placeholderTextColor="rgba(185,185,195,0.35)"
                secureTextEntry={!showPassword}
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                blurOnSubmit={false}
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

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={Colors.goldAccent}
                style={styles.inputIcon}
              />
              <TextInput
                ref={confirmRef}
                style={[styles.input, styles.inputFlex]}
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); setError(null); }}
                placeholder="Repeat password"
                placeholderTextColor="rgba(185,185,195,0.35)"
                secureTextEntry={!showConfirmPassword}
                returnKeyType="done"
                onSubmitEditing={handleSignUp}
              />
              <Pressable
                onPress={() => setShowConfirmPassword((p) => !p)}
                style={styles.eyeBtn}
                hitSlop={8}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="rgba(185,185,195,0.5)"
                />
              </Pressable>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator
              color={Colors.goldAccent}
              style={styles.loader}
            />
          ) : (
            <GoldButton
              label="Create Account"
              onPress={handleSignUp}
              icon="person-add-outline"
              iconPosition="right"
            />
          )}
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Already have an account? </Text>
          <Pressable onPress={() => router.replace("/auth/login")}>
            <Text style={styles.switchLink}>Log In</Text>
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
  logoWrap: { alignItems: "center", marginBottom: 24 },
  logo: { width: 80, height: 80 },
  heading: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 26,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 6,
  },
  subheading: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 28,
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
  inputGroup: { marginBottom: 16 },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.goldAccent,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  optional: {
    color: Colors.textSecondary,
    textTransform: "none",
    letterSpacing: 0,
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
  successWrap: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  successIcon: { marginBottom: 24 },
  successHeading: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 28,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 12,
  },
  successSub: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 17,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 36,
  },
  successBtnWrap: { width: "100%" },
});
