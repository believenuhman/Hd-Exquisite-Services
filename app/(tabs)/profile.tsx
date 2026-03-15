import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/colors";
import { ScreenBackground } from "@/components/ScreenBackground";
import { supabase, Order } from "@/lib/supabase";
import { useAppSettings } from "@/context/AppSettingsContext";
import { useAuth } from "@/context/AuthContext";

const ADDR_KEY = "hd_saved_address";
const PHONE_KEY = "hd_saved_phone";
const NAME_KEY = "hd_saved_name";

const STATUS_COLORS: Record<string, string> = {
  received: Colors.goldAccent,
  packing: "#9B59B6",
  out_for_delivery: "#3498DB",
  delivered: "#2ECC71",
  refused: Colors.danger,
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { formatPrice } = useAppSettings();
  const { user, isGuest, signOut } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const isSignedIn = !!user;

  const [name, setName] = useState(
    user?.user_metadata?.full_name ?? ""
  );
  const [phone, setPhone] = useState(
    user?.user_metadata?.phone ?? ""
  );
  const [address, setAddress] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isSignedIn) {
      AsyncStorage.getItem(ADDR_KEY).then((a) => { if (a) setAddress(a); });
    } else {
      Promise.all([
        AsyncStorage.getItem(NAME_KEY),
        AsyncStorage.getItem(PHONE_KEY),
        AsyncStorage.getItem(ADDR_KEY),
      ]).then(([n, p, a]) => {
        if (n) setName(n);
        if (p) setPhone(p);
        if (a) setAddress(a);
      });
    }
  }, [isSignedIn]);

  const fetchOrders = useCallback(async () => {
    const lookupPhone = isSignedIn
      ? user?.user_metadata?.phone
      : await AsyncStorage.getItem(PHONE_KEY);

    if (!lookupPhone) {
      setOrdersLoading(false);
      setRefreshing(false);
      return;
    }
    setOrdersLoading(true);
    try {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_phone", lookupPhone)
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) setOrders(data as Order[]);
    } catch (e) {
      console.warn("Orders fetch failed:", e);
    } finally {
      setOrdersLoading(false);
      setRefreshing(false);
    }
  }, [isSignedIn, user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSave = async () => {
    setSaving(true);
    await Promise.all([
      AsyncStorage.setItem(NAME_KEY, name),
      AsyncStorage.setItem(PHONE_KEY, phone),
      AsyncStorage.setItem(ADDR_KEY, address),
    ]);
    setSaving(false);
    setEditMode(false);
    fetchOrders();
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            setSigningOut(true);
            await signOut();
            setSigningOut(false);
          },
        },
      ]
    );
  };

  const displayName = isSignedIn
    ? user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Member"
    : name || "Guest";

  const displayEmail = user?.email ?? null;

  return (
    <ScreenBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 14, paddingBottom: botPad + 100 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchOrders();
            }}
            tintColor={Colors.goldAccent}
          />
        }
      >
        {/* Hero */}
        <View style={styles.heroSection}>
          <View style={styles.avatarRing}>
            <LinearGradient
              colors={
                isSignedIn
                  ? [Colors.goldStart, Colors.goldEnd]
                  : ["rgba(180,180,190,0.3)", "rgba(120,120,130,0.2)"]
              }
              style={styles.avatarGrad}
            >
              <Ionicons
                name="person"
                size={36}
                color={isSignedIn ? "#0B0B0F" : "rgba(185,185,195,0.6)"}
              />
            </LinearGradient>
          </View>
          <Text style={styles.heroName}>{displayName}</Text>

          {isSignedIn ? (
            <>
              {displayEmail && (
                <Text style={styles.heroEmail}>{displayEmail}</Text>
              )}
              <View style={styles.memberBadge}>
                <Ionicons
                  name="diamond-outline"
                  size={12}
                  color={Colors.goldAccent}
                />
                <Text style={styles.memberBadgeText}>Premium Member</Text>
              </View>
              <Text style={styles.ordersCount}>
                {orders.length} Orders Placed
              </Text>
            </>
          ) : (
            <View style={styles.guestBadge}>
              <Ionicons
                name="person-outline"
                size={12}
                color={Colors.textSecondary}
              />
              <Text style={styles.guestBadgeText}>Guest</Text>
            </View>
          )}
        </View>

        {/* Guest CTA Banner */}
        {!isSignedIn && (
          <Pressable
            style={styles.guestCtaBanner}
            onPress={() => router.push("/auth/welcome")}
          >
            <LinearGradient
              colors={["rgba(201,30,140,0.12)", "rgba(228,161,43,0.10)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.guestCtaGrad}
            >
              <View style={styles.guestCtaLeft}>
                <Ionicons
                  name="lock-open-outline"
                  size={22}
                  color={Colors.goldAccent}
                />
                <View>
                  <Text style={styles.guestCtaTitle}>
                    Create a Free Account
                  </Text>
                  <Text style={styles.guestCtaSub}>
                    Track orders, save preferences & more
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.goldAccent}
              />
            </LinearGradient>
          </Pressable>
        )}

        {/* Profile Info */}
        <View style={styles.cardSection}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>My Profile</Text>
            <Pressable
              onPress={() => setEditMode(!editMode)}
              style={styles.editBtn}
            >
              <Ionicons
                name={editMode ? "close" : "pencil-outline"}
                size={16}
                color={Colors.goldAccent}
              />
              <Text style={styles.editBtnText}>
                {editMode ? "Cancel" : "Edit"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.infoCard}>
            {/* Name row */}
            <View style={styles.infoRow}>
              <Ionicons
                name="person-outline"
                size={18}
                color={Colors.goldAccent}
              />
              {!isSignedIn && editMode ? (
                <TextInput
                  style={styles.infoInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor="rgba(185,185,195,0.4)"
                />
              ) : (
                <Text style={styles.infoText}>{displayName}</Text>
              )}
            </View>

            <View style={styles.rowDivider} />

            {/* Email row (signed-in only) */}
            {isSignedIn && displayEmail && (
              <>
                <View style={styles.infoRow}>
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={Colors.goldAccent}
                  />
                  <Text style={styles.infoText}>{displayEmail}</Text>
                </View>
                <View style={styles.rowDivider} />
              </>
            )}

            {/* Phone row */}
            <View style={styles.infoRow}>
              <Ionicons
                name="call-outline"
                size={18}
                color={Colors.goldAccent}
              />
              {!isSignedIn && editMode ? (
                <TextInput
                  style={styles.infoInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Phone number"
                  placeholderTextColor="rgba(185,185,195,0.4)"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.infoText}>
                  {isSignedIn
                    ? user?.user_metadata?.phone || "Not set"
                    : phone || "Not set"}
                </Text>
              )}
            </View>

            <View style={styles.rowDivider} />

            {/* Address row */}
            <View style={styles.infoRow}>
              <Ionicons
                name="location-outline"
                size={18}
                color={Colors.goldAccent}
              />
              {editMode ? (
                <TextInput
                  style={[styles.infoInput, styles.infoInputFlex]}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Delivery address"
                  placeholderTextColor="rgba(185,185,195,0.4)"
                  multiline
                />
              ) : (
                <Text style={[styles.infoText, styles.infoInputFlex]}>
                  {address || "Not set"}
                </Text>
              )}
            </View>
          </View>

          {editMode && (
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={styles.saveBtn}
            >
              <LinearGradient
                colors={[Colors.goldStart, Colors.goldEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveGrad}
              >
                <Text style={styles.saveBtnText}>
                  {saving ? "Saving…" : "Save Changes"}
                </Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>

        {/* Order History */}
        <View style={styles.cardSection}>
          <Text style={styles.cardTitle}>Order History</Text>

          {!isSignedIn && !phone ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="bag-outline"
                size={32}
                color="rgba(185,185,195,0.3)"
              />
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptyText}>
                {isGuest
                  ? "Create an account to view your full order history."
                  : "Add your phone number above to see your order history."}
              </Text>
            </View>
          ) : ordersLoading ? (
            <ActivityIndicator
              color={Colors.goldAccent}
              style={styles.activityPad}
            />
          ) : orders.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="bag-outline"
                size={32}
                color="rgba(185,185,195,0.3)"
              />
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptyText}>
                Place your first order and it will appear here.
              </Text>
            </View>
          ) : (
            orders.map((o) => (
              <Pressable
                key={o.id}
                onPress={() =>
                  router.push({
                    pathname: "/order-tracking/[id]",
                    params: { id: o.id },
                  })
                }
                style={styles.orderCard}
              >
                <View style={styles.orderCardTop}>
                  <Text style={styles.orderId}>
                    #{o.id.slice(0, 8).toUpperCase()}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: `${
                          STATUS_COLORS[o.status] ?? Colors.goldAccent
                        }20`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            STATUS_COLORS[o.status] ?? Colors.goldAccent,
                        },
                      ]}
                    >
                      {o.status.replace(/_/g, " ")}
                    </Text>
                  </View>
                </View>
                <View style={styles.orderCardBottom}>
                  <Text style={styles.orderDate}>
                    {new Date(o.created_at).toLocaleDateString()}
                  </Text>
                  <Text style={styles.orderTotal}>
                    {formatPrice(o.total)}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={Colors.goldAccent}
                  style={styles.orderChevron}
                />
              </Pressable>
            ))
          )}
        </View>

        {/* Quick Links */}
        <View style={styles.cardSection}>
          <Text style={styles.cardTitle}>More</Text>
          <View style={styles.infoCard}>
            <Pressable
              style={styles.menuItem}
              onPress={() => router.push("/(tabs)/search")}
            >
              <Ionicons
                name="search-outline"
                size={20}
                color={Colors.goldAccent}
              />
              <Text style={styles.menuLabel}>Browse Products</Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={Colors.textSecondary}
              />
            </Pressable>
            <View style={styles.rowDivider} />
            <Pressable
              style={styles.menuItem}
              onPress={() => router.push("/(tabs)/cart")}
            >
              <Ionicons
                name="bag-outline"
                size={20}
                color={Colors.goldAccent}
              />
              <Text style={styles.menuLabel}>My Cart</Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={Colors.textSecondary}
              />
            </Pressable>

            {!isSignedIn && (
              <>
                <View style={styles.rowDivider} />
                <Pressable
                  style={styles.menuItem}
                  onPress={() => router.push("/auth/welcome")}
                >
                  <Ionicons
                    name="person-add-outline"
                    size={20}
                    color={Colors.magenta}
                  />
                  <Text style={[styles.menuLabel, { color: Colors.magenta }]}>
                    Sign In / Create Account
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={Colors.magenta}
                  />
                </Pressable>
              </>
            )}

            {isSignedIn && (
              <>
                <View style={styles.rowDivider} />
                <Pressable
                  style={styles.menuItem}
                  onPress={handleSignOut}
                  disabled={signingOut}
                >
                  <Ionicons
                    name="log-out-outline"
                    size={20}
                    color={Colors.danger}
                  />
                  <Text style={[styles.menuLabel, { color: Colors.danger }]}>
                    {signingOut ? "Signing Out…" : "Sign Out"}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

        <Text style={styles.versionText}>HD Xquisite Liquors v2.0</Text>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20 },
  heroSection: { alignItems: "center", marginBottom: 20 },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    padding: 3,
    backgroundColor: "rgba(214,162,74,0.2)",
    marginBottom: 12,
  },
  avatarGrad: {
    flex: 1,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  heroName: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 22,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  heroEmail: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(214,162,74,0.1)",
    borderWidth: 1,
    borderColor: "rgba(214,162,74,0.25)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
  },
  memberBadgeText: {
    fontFamily: "CormorantGaramond_600SemiBold",
    fontSize: 12,
    color: Colors.goldAccent,
    letterSpacing: 1,
  },
  guestBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(185,185,195,0.08)",
    borderWidth: 1,
    borderColor: "rgba(185,185,195,0.15)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
  },
  guestBadgeText: {
    fontFamily: "CormorantGaramond_600SemiBold",
    fontSize: 12,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  ordersCount: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  guestCtaBanner: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(201,30,140,0.3)",
  },
  guestCtaGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  guestCtaLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  guestCtaTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  guestCtaSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  cardSection: { marginBottom: 24 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 18,
    color: Colors.textPrimary,
  },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  editBtnText: {
    fontFamily: "CormorantGaramond_600SemiBold",
    fontSize: 14,
    color: Colors.goldAccent,
  },
  infoCard: {
    backgroundColor: "rgba(20,20,28,0.78)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(214,162,74,0.15)",
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  infoText: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 15,
    color: Colors.textSecondary,
  },
  infoInput: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 15,
    color: Colors.textPrimary,
  },
  infoInputFlex: { flex: 1 },
  rowDivider: { height: 1, backgroundColor: "rgba(214,162,74,0.08)" },
  saveBtn: { marginTop: 12, borderRadius: 14, overflow: "hidden" },
  saveGrad: { paddingVertical: 14, alignItems: "center" },
  saveBtnText: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 14,
    color: "#000",
  },
  activityPad: { paddingVertical: 24 },
  emptyState: { alignItems: "center", paddingVertical: 28, gap: 8 },
  emptyTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 16,
    color: Colors.textSecondary,
  },
  emptyText: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 14,
    color: "rgba(185,185,195,0.5)",
    textAlign: "center",
  },
  orderCard: {
    backgroundColor: "rgba(20,20,28,0.78)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(214,162,74,0.15)",
    padding: 14,
    marginBottom: 10,
    paddingRight: 32,
    position: "relative",
  },
  orderCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  orderId: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 14,
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: {
    fontFamily: "CormorantGaramond_600SemiBold",
    fontSize: 12,
    textTransform: "capitalize",
  },
  orderCardBottom: { flexDirection: "row", justifyContent: "space-between" },
  orderDate: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  orderTotal: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 14,
    color: Colors.goldAccent,
  },
  orderChevron: {
    position: "absolute",
    right: 12,
    top: "50%",
    marginTop: -7,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  menuLabel: {
    flex: 1,
    fontFamily: "CormorantGaramond_600SemiBold",
    fontSize: 15,
    color: Colors.textSecondary,
  },
  versionText: {
    textAlign: "center",
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 12,
    color: "rgba(185,185,195,0.3)",
    marginTop: 8,
  },
});
