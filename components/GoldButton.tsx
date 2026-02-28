import React, { useRef } from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  Animated,
  View,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

interface GoldButtonProps {
  label: string;
  onPress: () => void;
  variant?: "filled" | "outline";
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  iconPosition?: "left" | "right";
  disabled?: boolean;
}

export function GoldButton({
  label,
  onPress,
  variant = "filled",
  icon,
  iconPosition = "right",
  disabled = false,
}: GoldButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: Platform.OS !== "web",
      speed: 30,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: Platform.OS !== "web",
      speed: 30,
    }).start();
  };

  const iconColor = variant === "filled" ? "#0B0B0F" : Colors.goldAccent;
  const iconSize = 18;

  return (
    <Animated.View
      style={[styles.wrapper, { transform: [{ scale }] }, disabled && styles.disabled]}
    >
      <Pressable
        onPress={disabled ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.pressable}
      >
        {variant === "filled" ? (
          <LinearGradient
            colors={[Colors.goldStart, Colors.goldEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          >
            {icon && iconPosition === "left" && (
              <Ionicons name={icon} size={iconSize} color={iconColor} />
            )}
            <Text style={[styles.filledText]}>{label}</Text>
            {icon && iconPosition === "right" && (
              <Ionicons name={icon} size={iconSize} color={iconColor} />
            )}
          </LinearGradient>
        ) : (
          <View style={styles.outline}>
            {icon && iconPosition === "left" && (
              <Ionicons name={icon} size={iconSize} color={iconColor} />
            )}
            <Text style={[styles.outlineText]}>{label}</Text>
            {icon && iconPosition === "right" && (
              <Ionicons name={icon} size={iconSize} color={iconColor} />
            )}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    overflow: "hidden",
  },
  pressable: {
    borderRadius: 16,
    overflow: "hidden",
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 17,
    gap: 8,
    borderRadius: 16,
  },
  outline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.goldAccent,
    backgroundColor: "rgba(214,162,74,0.07)",
  },
  filledText: {
    fontSize: 16,
    fontFamily: "PlayfairDisplay_700Bold",
    color: "#0B0B0F",
    letterSpacing: 0.5,
  },
  outlineText: {
    fontSize: 16,
    fontFamily: "PlayfairDisplay_700Bold",
    color: Colors.goldAccent,
    letterSpacing: 0.5,
  },
  disabled: {
    opacity: 0.5,
  },
});
