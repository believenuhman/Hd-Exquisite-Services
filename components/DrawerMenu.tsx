import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Modal,
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

const { width, height } = Dimensions.get("window");
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
  { label: "Home",            icon: "home-outline",                  route: "/(tabs)/index"   },
  { label: "Categories",      icon: "grid-outline",                  route: "/(tabs)/search"  },
  { label: "My Cart",         icon: "bag-outline",                   route: "/(tabs)/cart"    },
  { label: "Orders",          icon: "receipt-outline",               route: "/(tabs)/orders"  },
  { label: "Profile",         icon: "person-outline",                route: "/(tabs)/profile" },
  { label: "Contact Support", icon: "chatbubble-ellipses-outline",   route: "/(tabs)/profile" },
  { label: "Settings",        icon: "settings-outline",              route: "/(tabs)/profile" },
];

export function DrawerMenu({ open, onClose }: DrawerMenuProps) {
  const slideX        = useRef(new Animated.Value(-DRAWER_W)).current;
  const bgOpacity     = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const topPad   = Platform.OS === "web" ? 67  : insets.top;
  const botPad   = Platform.OS === "web" ? 34  : insets.bottom;

  /* ── open / close animations ── */
  useEffect(() => {
    if (open) {
      setVisible(true);                     // mount before animating in
      Animated.parallel([
        Animated.spring(slideX, {
          toValue: 0,
          useNativeDriver: UD,
          tension: 70,
          friction: 12,
        }),
        Animated.timing(bgOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: UD,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideX, {
          toValue: -DRAWER_W,
          duration: 240,
          useNativeDriver: UD,
        }),
        Animated.timing(bgOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: UD,
        }),
      ]).start(({ finished }) => {
        if (finished) setVisible(false);    // unmount after sliding out
      });
    }
  }, [open]);

  /* ── navigate & close ── */
  const handleNav = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    // wait for close animation before pushing to avoid visual jank
    setTimeout(() => router.push(route as any), 260);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* ── dim backdrop — tap to close ── */}
      <Animated.View
        style={[styles.backdrop, { opacity: bgOpacity }]}
        pointerEvents={open ? "auto" : "none"}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* ── slide-in drawer panel ── */}
      <Animated.View
        style={[styles.drawer, { transform: [{ translateX: slideX }] }]}
        pointerEvents={open ? "auto" : "none"}
      >
        {/* Dark gradient fill */}
        <LinearGradient
          colors={["#17141F", "#09090C"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Gold right-edge border */}
        <View style={styles.borderRight} />

        {/* Content */}
        <View
          style={[
            styles.content,
            { paddingTop: topPad + 20, paddingBottom: botPad + 24 },
          ]}
        >
          {/* ── Brand header ── */}
          <View style={styles.brandRow}>
            <Image
              source={require("@/assets/logo/hd-xquisite-logo-dark.png")}
              style={styles.drawerLogo}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.brandName}>HD XQUISITE</Text>
              <Text style={styles.brandSub}>LIQUORS</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* ── Menu items ── */}
          <View style={styles.menuList}>
            {MENU_ITEMS.map((item, idx) => (
              <Pressable
                key={idx}
                onPress={() => handleNav(item.route)}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && styles.menuItemActive,
                ]}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name={item.icon} size={20} color={Colors.goldAccent} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Ionicons
                  name="chevron-forward"
                  size={15}
                  color="rgba(228,161,43,0.3)"
                />
              </Pressable>
            ))}
          </View>

          <View style={styles.divider} />

          <Text style={styles.tagline}>Premium Spirits. Delivered.</Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  /* Full-screen dim layer */
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    width,
    height,
    backgroundColor: "rgba(0,0,0,0.65)",
  },

  /* Sliding drawer panel */
  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
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
    backgroundColor: "rgba(228,161,43,0.25)",
    zIndex: 1,
  },

  content: {
    flex: 1,
    paddingHorizontal: 22,
  },

  /* Brand */
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  drawerLogo: { width: 50, height: 50 },
  brandName: {
    fontFamily: "PlayfairDisplay_900Black",
    fontSize: 15,
    color: Colors.goldAccent,
    letterSpacing: 2,
  },
  brandSub: {
    fontFamily: "CormorantGaramond_600SemiBold",
    fontSize: 12,
    color: "rgba(228,161,43,0.55)",
    letterSpacing: 3.5,
    marginTop: 1,
  },

  /* Divider */
  divider: {
    height: 1,
    backgroundColor: "rgba(228,161,43,0.12)",
    marginVertical: 16,
  },

  /* Menu list */
  menuList: { gap: 2 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  menuItemActive: {
    backgroundColor: "rgba(228,161,43,0.09)",
  },
  iconWrap: {
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
  tagline: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.28)",
    textAlign: "center",
    letterSpacing: 1.6,
  },
});
