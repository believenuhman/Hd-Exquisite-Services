import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";

const { width } = Dimensions.get("window");
const DRAWER_W = Math.min(width * 0.80, 320);
const UD = Platform.OS !== "web";

interface DrawerMenuProps {
  open: boolean;
  onClose: () => void;
}

interface MenuItem {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  route: string;
}

const MENU_ITEMS: MenuItem[] = [
  { label: "Home", icon: "home-outline", route: "/(tabs)/index" },
  { label: "Categories", icon: "grid-outline", route: "/(tabs)/search" },
  { label: "My Cart", icon: "bag-outline", route: "/(tabs)/cart" },
  { label: "Orders", icon: "receipt-outline", route: "/(tabs)/orders" },
  { label: "Profile", icon: "person-outline", route: "/(tabs)/profile" },
  { label: "Contact Support", icon: "chatbubble-ellipses-outline", route: "/(tabs)/profile" },
  { label: "Settings", icon: "settings-outline", route: "/(tabs)/profile" },
];

export function DrawerMenu({ open, onClose }: DrawerMenuProps) {
  const slideX = useRef(new Animated.Value(-DRAWER_W)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.spring(slideX, {
          toValue: 0,
          useNativeDriver: UD,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: UD,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideX, {
          toValue: -DRAWER_W,
          duration: 260,
          useNativeDriver: UD,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: UD,
        }),
      ]).start();
    }
  }, [open]);

  const handleNav = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    setTimeout(() => router.push(route as any), 180);
  };

  if (!open && (slideX as any)._value === -DRAWER_W) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents={open ? "auto" : "none"}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Drawer panel */}
      <Animated.View
        style={[
          styles.drawer,
          { transform: [{ translateX: slideX }] },
        ]}
      >
        <LinearGradient
          colors={["#13111A", "#09090C"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Gold border right edge */}
        <View style={styles.borderRight} />

        <View
          style={[
            styles.drawerContent,
            {
              paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 16,
              paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 24,
            },
          ]}
        >
          {/* Logo + brand */}
          <View style={styles.brandRow}>
            <Image
              source={require("@/assets/logo/hd-xquisite-logo-dark.png")}
              style={styles.drawerLogo}
              resizeMode="contain"
            />
            <View style={styles.brandText}>
              <Text style={styles.brandName}>HD XQUISITE</Text>
              <Text style={styles.brandSub}>LIQUORS</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Menu items */}
          <View style={styles.menuList}>
            {MENU_ITEMS.map((item, idx) => (
              <Pressable
                key={idx}
                onPress={() => handleNav(item.route)}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && styles.menuItemPressed,
                ]}
              >
                <View style={styles.menuIconWrap}>
                  <Ionicons name={item.icon} size={20} color={Colors.goldAccent} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color="rgba(228,161,43,0.35)"
                />
              </Pressable>
            ))}
          </View>

          <View style={styles.divider} />

          {/* Footer tagline */}
          <Text style={styles.footerText}>Premium Spirits. Delivered.</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.62)",
  },
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_W,
    overflow: "hidden",
  },
  borderRight: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(228,161,43,0.22)",
    zIndex: 10,
  },
  drawerContent: {
    flex: 1,
    paddingHorizontal: 24,
  },

  /* Brand */
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  drawerLogo: { width: 52, height: 52 },
  brandText: { gap: 1 },
  brandName: {
    fontFamily: "PlayfairDisplay_900Black",
    fontSize: 16,
    color: Colors.goldAccent,
    letterSpacing: 2,
  },
  brandSub: {
    fontFamily: "CormorantGaramond_600SemiBold",
    fontSize: 13,
    color: "rgba(228,161,43,0.6)",
    letterSpacing: 3,
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(228,161,43,0.14)",
    marginVertical: 18,
  },

  /* Menu items */
  menuList: { gap: 4 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  menuItemPressed: { backgroundColor: "rgba(228,161,43,0.08)" },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(228,161,43,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },

  /* Footer */
  footerText: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.3)",
    textAlign: "center",
    letterSpacing: 1.5,
  },
});
