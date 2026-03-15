import React, { useState } from "react";
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
import { supabase } from "@/lib/supabase";

const LOGO = require("@/assets/logo/hd-xquisite-logo-dark.png");

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setError(null);
    if (!email.trim()) return setError("Please enter your email address.");
    if (!/\S+@\S+\.\S+/.test(email)) return setError("Please enter a valid email.");

    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: "hdxquisiteliquors://auth/reset" }
    );
    setLoading(false);

    if (err) {
      setError(err.message);
    } else {
      setSent(true);
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

        {sent ? (
          <View style={styles.sentWrap}>
            <Ionicons
              name="paper-plane-outline"
              size={52}
              color={Colors.goldAccent}
            />
            <Text style={styles.heading}>Email Sent</Text>
            <Text style={styles.sentText}>
              We've sent a password reset link to{"\n"}
              <Text style={styles.sentEmail}>{email}</Text>
            </Text>
            <Text style={styles.sentSub}>
              Check your inbox and follow the link to reset your password.
            </Text>
            <View style={styles.sentBtnWrap}>
              <GoldButton
                label="Back to Log In"
                onPress={() => router.replace("/auth/login")}
                variant="outline"
                icon="arrow-back-outline"
                iconPosition="left"
              />
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.heading}>Reset Password</Text>
            <Text style={styles.subheading}>
              Enter your email and we'll send you a reset link.
            </Text>

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
                    returnKeyType="send"
                    onSubmitEditing={handleSend}
                  />
                </View>
              </View>

              {loading ? (
                <ActivityIndicator
                  color={Colors.goldAccent}
                  style={styles.loader}
                />
              ) : (
                <GoldButton
                  label="Send Reset Link"
                  onPress={handleSend}
                  icon="send-outline"
                  iconPosition="right"
                />
              )}
            </View>

            <Pressable
              onPress={() => router.back()}
              style={styles.backLinkWrap}
            >
              <Ionicons
                name="arrow-back-outline"
                size={15}
                color={Colors.textSecondary}
              />
              <Text style={styles.backLink}>Back to Log In</Text>
            </Pressable>
          </>
        )}
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
    fontSize: 26,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  subheading: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
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
  inputGroup: { marginBottom: 20 },
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
  loader: { paddingVertical: 10 },
  backLinkWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 28,
  },
  backLink: {
    fontFamily: "CormorantGaramond_600SemiBold",
    fontSize: 15,
    color: Colors.textSecondary,
  },
  sentWrap: { alignItems: "center", paddingTop: 12, gap: 14 },
  sentText: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  sentEmail: {
    fontFamily: "CormorantGaramond_700Bold",
    color: Colors.goldAccent,
  },
  sentSub: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
    lineHeight: 22,
  },
  sentBtnWrap: { width: "100%", marginTop: 12 },
});
