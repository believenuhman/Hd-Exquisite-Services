import React from "react";
import {
  View,
  StyleSheet,
  ViewStyle,
} from "react-native";

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  radius?: number;
}

export function GlassCard({ children, style, radius = 20 }: GlassCardProps) {
  return (
    <View
      style={[
        styles.card,
        {
          borderRadius: radius,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(20,20,28,0.78)",
    borderWidth: 1,
    borderColor: "rgba(214,162,74,0.25)",
  },
});
