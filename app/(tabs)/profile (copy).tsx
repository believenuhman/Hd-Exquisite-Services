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
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(NAME_KEY),
      AsyncStorage.getItem(PHONE_KEY),
      AsyncStorage.getItem(ADDR_KEY),
    ]).then(([n, p, a]) => {
      if (n) setName(n);
      if (p) setPhone(p);
      if (a) setAddress(a);
    });
  }, []);

  const fetchOrders = useCallback(async () => {
    const savedPhone = await AsyncStorage.getItem(PHONE_KEY);
    if (!savedPhone) {
      setOrdersLoading(false);
      setRefreshing(false);
      return;
    }
    setOrdersLoading(true);
    try {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_phone", savedPhone)
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) setOrders(data as Order[]);
    } catch (e) {
      console.warn("Orders fetch failed:", e);
    } finally {
      setOrdersLoading(false);
      setRefreshing(false);
    }
  }, []);

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
              colors={[Colors.goldStart, Colors.goldEnd]}
              style={styles.avatarGrad}
            >
              <Ionicons name="person" size={36} color="#0B0B0F" />
            </LinearGradient>
          </View>
          <Text style={styles.heroName}>{name || "Guest Member"}</Text>
          <View style={styles.memberBadge}>
            <Ionicons
              name="diamond-outline"
              size={12}
              color={Colors.goldAccent}
            />
            <Text style={styles.memberBadgeText}>Premium Member</Text>
          </View>
          <Text style={styles.ordersCount}>{orders.length} Orders Placed</Text>
        </View>

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
            <View style={styles.infoRow}>
              <Ionicons
                name="person-outline"
                size={18}
                color={Colors.goldAccent}
              />
              {editMode ? (
                <TextInput
                  style={styles.infoInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor="rgba(185,185,195,0.4)"
                />
              ) : (
                <Text style={styles.infoText}>{name || "Not set"}</Text>
              )}
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.infoRow}>
              <Ionicons
                name="call-outline"
                size={18}
                color={Colors.goldAccent}
              />
              {editMode ? (
                <TextInput
                  style={styles.infoInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Phone number"
                  placeholderTextColor="rgba(185,185,195,0.4)"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.infoText}>{phone || "Not set"}</Text>
              )}
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.infoRow}>
              <Ionicons
                name="location-outline"
                size={18}
                color={Colors.goldAccent}
              />
              {editMode ? (
                <TextInput
                  style={[styles.infoInput, { flex: 1 }]}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Delivery address"
                  placeholderTextColor="rgba(185,185,195,0.4)"
                  multiline
                />
              ) : (
                <Text style={[styles.infoText, { flex: 1 }]}>
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
                  {saving ? "Saving…" : "Save Profile"}
                </Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>

        {/* Order History */}
        <View style={styles.cardSection}>
          <Text style={styles.cardTitle}>Order History</Text>
          {!phone ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="bag-outline"
                size={32}
                color="rgba(185,185,195,0.3)"
              />
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptyText}>
                Add your phone number above to see your order history.
              </Text>
            </View>
          ) : ordersLoading ? (
            <ActivityIndicator
              color={Colors.goldAccent}
              style={{ paddingVertical: 24 }}
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
                        backgroundColor: `${STATUS_COLORS[o.status] ?? Colors.goldAccent}20`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: STATUS_COLORS[o.status] ?? Colors.goldAccent },
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
                  <Text style={styles.orderTotal}>{formatPrice(o.total)}</Text>
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
          </View>
        </View>

        <Text style={styles.versionText}>HD Xquisite Liquors v2.0</Text>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = {
  scroll: {
    paddingHorizontal: 20,
  },

  heroSection: {
    alignItems: "center",
    marginBottom: 28,
  },

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
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },

  heroSub: {
    fontSize: 14,
    color: "#AAAAAA",
  },

  menuSection: {
    marginTop: 20,
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },

  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  menuLabel: {
    marginLeft: 12,
    fontSize: 16,
    color: "#FFFFFF",
  },

  versionText: {
    textAlign: "center",
    marginTop: 30,
    color: "#777777",
    fontSize: 12,
  },
} as const;
