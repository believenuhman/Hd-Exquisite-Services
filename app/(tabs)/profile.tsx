import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

interface MenuItemProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  sublabel?: string;
  onPress?: () => void;
  showBadge?: boolean;
}

function MenuItem({ icon, label, sublabel, onPress, showBadge }: MenuItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
      onPress={onPress}
    >
      <View style={styles.menuIconWrapper}>
        <Ionicons name={icon} size={20} color={Colors.goldAccent} />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuLabel}>{label}</Text>
        {sublabel && <Text style={styles.menuSublabel}>{sublabel}</Text>}
      </View>
      <View style={styles.menuRight}>
        {showBadge && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>New</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
      </View>
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: topPadding + 12,
            paddingBottom: bottomPadding + (Platform.OS === "web" ? 84 : 90),
          },
        ]}
      >
        <Text style={styles.screenTitle}>Profile</Text>

        <View style={styles.profileCard}>
          <LinearGradient
            colors={["rgba(214,162,74,0.12)", "rgba(214,162,74,0.03)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={[Colors.goldStart, Colors.goldEnd]}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>HD</Text>
            </LinearGradient>
            <View style={styles.avatarBadge}>
              <Ionicons name="star" size={10} color="#0B0B0F" />
            </View>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>HD Xquisite Member</Text>
            <Text style={styles.profileEmail}>member@hdxquisite.com</Text>
            <View style={styles.memberBadge}>
              <LinearGradient
                colors={[Colors.goldStart, Colors.goldEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.memberBadgeGradient}
              >
                <Ionicons name="diamond" size={10} color="#0B0B0F" />
                <Text style={styles.memberBadgeText}>Premium Member</Text>
              </LinearGradient>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          {[
            { label: "Orders", value: "0" },
            { label: "Wishlist", value: "0" },
            { label: "Reviews", value: "0" },
          ].map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <SectionHeader title="Account" />
        <View style={styles.menuSection}>
          <MenuItem
            icon="person-outline"
            label="Personal Information"
            sublabel="Name, email, phone"
          />
          <MenuItem
            icon="location-outline"
            label="Delivery Addresses"
            sublabel="Manage saved addresses"
          />
          <MenuItem
            icon="card-outline"
            label="Payment Methods"
            sublabel="Cards, wallets"
          />
        </View>

        <SectionHeader title="Orders" />
        <View style={styles.menuSection}>
          <MenuItem
            icon="receipt-outline"
            label="Order History"
            sublabel="View past orders"
          />
          <MenuItem
            icon="time-outline"
            label="Track Delivery"
            sublabel="Live delivery tracking"
          />
        </View>

        <SectionHeader title="Preferences" />
        <View style={styles.menuSection}>
          <MenuItem
            icon="notifications-outline"
            label="Notifications"
            sublabel="Deals, restocks, promotions"
            showBadge
          />
          <MenuItem
            icon="heart-outline"
            label="Favorites"
            sublabel="Your saved spirits"
          />
          <MenuItem
            icon="settings-outline"
            label="App Settings"
            sublabel="Theme, language, region"
          />
        </View>

        <SectionHeader title="Support" />
        <View style={styles.menuSection}>
          <MenuItem
            icon="help-circle-outline"
            label="Help Center"
            sublabel="FAQs and guides"
          />
          <MenuItem
            icon="chatbubble-outline"
            label="Contact Us"
            sublabel="24/7 premium support"
          />
        </View>

        <Pressable style={styles.signoutBtn}>
          <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
          <Text style={styles.signoutText}>Sign Out</Text>
        </Pressable>

        <Text style={styles.versionText}>HD Xquisite Liquors v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  screenTitle: {
    fontSize: 30,
    color: Colors.textPrimary,
    fontFamily: "PlayfairDisplay_700Bold",
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: "hidden",
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 22,
    fontFamily: "PlayfairDisplay_700Bold",
    color: "#0B0B0F",
  },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.goldAccent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.card,
  },
  profileInfo: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    fontSize: 17,
    color: Colors.textPrimary,
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: 0.2,
  },
  profileEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "CormorantGaramond_400Regular",
  },
  memberBadge: {
    borderRadius: 20,
    overflow: "hidden",
    alignSelf: "flex-start",
    marginTop: 6,
  },
  memberBadgeGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  memberBadgeText: {
    fontSize: 10,
    fontFamily: "CormorantGaramond_600SemiBold",
    color: "#0B0B0F",
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  statValue: {
    fontSize: 22,
    color: Colors.textGold,
    fontFamily: "PlayfairDisplay_700Bold",
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: "CormorantGaramond_400Regular",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "CormorantGaramond_600SemiBold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  menuSection: {
    backgroundColor: Colors.card,
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
    gap: 14,
  },
  menuItemPressed: {
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  menuIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(214,162,74,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuContent: {
    flex: 1,
    gap: 2,
  },
  menuLabel: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: "CormorantGaramond_600SemiBold",
    letterSpacing: 0.2,
  },
  menuSublabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: "CormorantGaramond_400Regular",
  },
  menuRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  newBadge: {
    backgroundColor: Colors.goldAccent,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  newBadgeText: {
    fontSize: 10,
    color: "#0B0B0F",
    fontFamily: "CormorantGaramond_600SemiBold",
  },
  signoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: "rgba(255,77,77,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,77,77,0.12)",
    marginBottom: 20,
  },
  signoutText: {
    fontSize: 15,
    color: Colors.danger,
    fontFamily: "CormorantGaramond_600SemiBold",
    letterSpacing: 0.3,
  },
  versionText: {
    textAlign: "center",
    fontSize: 11,
    color: "rgba(255,255,255,0.15)",
    fontFamily: "CormorantGaramond_400Regular",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
});
