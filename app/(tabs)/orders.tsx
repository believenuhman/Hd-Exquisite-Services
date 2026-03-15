import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/colors";
import { supabase } from "@/lib/supabase";
import { ScreenBackground } from "@/components/ScreenBackground";
import { useAppSettings } from "@/context/AppSettingsContext";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  pending: { label: "Pending", color: "#E4A12B", icon: "time-outline" },
  confirmed: { label: "Confirmed", color: "#3B82F6", icon: "checkmark-circle-outline" },
  preparing: { label: "Preparing", color: "#8B5CF6", icon: "restaurant-outline" },
  out_for_delivery: { label: "Out for Delivery", color: "#10B981", icon: "bicycle-outline" },
  delivered: { label: "Delivered", color: "#10B981", icon: "checkmark-done-circle-outline" },
  cancelled: { label: "Cancelled", color: Colors.danger, icon: "close-circle-outline" },
};

interface Order {
  id: string;
  created_at: string;
  status: string;
  total: number;
  delivery_address: string;
  customer_name: string;
}

function OrderCard({ order, formatPrice }: { order: Order; formatPrice: (n: number) => string }) {
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
  const date = new Date(order.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Pressable
      onPress={() => router.push(`/order-tracking/${order.id}`)}
      style={styles.orderCard}
    >
      <View style={styles.orderTop}>
        <View>
          <Text style={styles.orderId}>Order #{order.id.slice(0, 8).toUpperCase()}</Text>
          <Text style={styles.orderDate}>{date}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: cfg.color + "22" }]}>
          <Ionicons name={cfg.icon as any} size={13} color={cfg.color} />
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
      <View style={styles.orderDivider} />
      <View style={styles.orderBottom}>
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.addressText} numberOfLines={1}>
            {order.delivery_address}
          </Text>
        </View>
        <Text style={styles.orderTotal}>{formatPrice(order.total)}</Text>
      </View>
    </Pressable>
  );
}

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { formatPrice } = useAppSettings();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const phone = await AsyncStorage.getItem("hd_saved_phone");
      if (!phone) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const { data } = await supabase
        .from("orders")
        .select("id,created_at,status,total,delivery_address,customer_name")
        .eq("customer_phone", phone)
        .order("created_at", { ascending: false });
      if (data) setOrders(data as Order[]);
    } catch (e) {
      console.warn("Orders fetch failed:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <ScreenBackground>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={Colors.goldAccent} size="large" />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: botPad + 90 },
          ]}
          showsVerticalScrollIndicator={false}
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
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="receipt-outline" size={40} color={Colors.textSecondary} />
              </View>
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptySub}>
                Your order history will appear here
              </Text>
              <Pressable
                onPress={() => router.push("/(tabs)")}
                style={styles.shopBtn}
              >
                <Text style={styles.shopBtnText}>Start Shopping</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <OrderCard order={item} formatPrice={formatPrice} />
          )}
        />
      )}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerTitle: {
    fontFamily: "PlayfairDisplay_900Black",
    fontSize: 28,
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 20, paddingTop: 4, gap: 12 },
  orderCard: {
    backgroundColor: "#13121A",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(228,161,43,0.18)",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  orderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  orderId: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  orderDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  orderDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginBottom: 12,
  },
  orderBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addressRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginRight: 12,
  },
  addressText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  orderTotal: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.goldAccent,
  },
  emptyWrap: {
    paddingTop: 80,
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 20,
    color: Colors.textPrimary,
  },
  emptySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  shopBtn: {
    marginTop: 8,
    backgroundColor: Colors.goldAccent,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 14,
  },
  shopBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#000",
  },
});
