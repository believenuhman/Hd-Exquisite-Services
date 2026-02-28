import React from "react";
import {
  ImageBackground,
  View,
  StyleSheet,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/colors";

const { width, height } = Dimensions.get("window");

interface ScreenBackgroundProps {
  children: React.ReactNode;
  intensity?: "light" | "medium" | "heavy";
}

export function ScreenBackground({
  children,
  intensity = "medium",
}: ScreenBackgroundProps) {
  const overlayOpacity =
    intensity === "light" ? 0.55 : intensity === "heavy" ? 0.2 : 0.38;

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require("@/assets/images/particle-bg.png")}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <LinearGradient
        colors={[
          `rgba(11,11,15,${1 - overlayOpacity})`,
          `rgba(11,11,15,${1 - overlayOpacity * 1.5})`,
          Colors.background,
        ]}
        style={StyleSheet.absoluteFill}
        locations={[0, 0.5, 1]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
