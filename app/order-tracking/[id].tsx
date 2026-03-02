import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Colors } from "@/constants/colors";
import { ScreenBackground } from "@/components/ScreenBackground";
import { supabase, Order, OrderItem } from "@/lib/supabase";
import { useAppSettings } from "@/context/AppSettingsContext";

const STATUS_STEPS: { key: Order["status"]; label: string; icon: string }[] = [
  { key: "received", label: "Order Received", icon: "checkmark-circle" },
  { key: "packing", label: "Packing Your Order", icon: "cube" },
  { key: "out_for_delivery", label: "Out for Delivery", icon: "bicycle" },
  { key: "delivered", label: "Delivered", icon: "home" },
];

const STATUS_ORDER = ["received", "packing", "out_for_delivery", "delivered", "refused"];

function getStepIndex(status: string) {
  return STATUS_ORDER.indexOf(status);
}

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { formatPrice } = useAppSettings();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    try {
      const [{ data: o }, { data: i }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id).single(),
        supabase.from("order_items").select("*").eq("order_id", id),
      ]);
      if (o) setOrder(o as Order);
      if (i) setItems(i as OrderItem[]);
    } catch (e) {
      console.warn("Order fetch failed:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 30000);
    return () => clearInterval(interval);
  }, [fetchOrder]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrder();
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  if (loading) {
    return (
      <ScreenBackground>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={Colors.goldAccent} size="large" />
        </View>
      </ScreenBackground>
    );
  }

  if (!order) {
    return (
      <ScreenBackground>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={styles.emptyTitle}>Order not found</Text>
          <Pressable onPress={() => router.replace("/(tabs)")} style={styles.homeBtn}>
            <Text style={styles.homeBtnText}>Go Home</Text>
          </Pressable>
        </View>
      </ScreenBackground>
    );
  }

  const currentStep = getStepIndex(order.status);
  const isRefused = order.status === "refused";

  return (
    <ScreenBackground>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => router.replace("/(tabs)")} style={styles.backBtn}>
          <Ionicons name="home-outline" size={20} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Order Tracking</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.goldAccent} />}
      >
        <View style={styles.orderIdCard}>
          <Text style={styles.orderIdLabel}>Order ID</Text>
          <Text style={styles.orderId}>{order.id.slice(0, 8).toUpperCase()}</Text>
          <Text style={styles.orderDate}>{new Date(order.created_at).toLocaleString()}</Text>
        </View>

        {isRefused ? (
          <View style={styles.refusedCard}>
            <Ionicons name="close-circle" size={40} color={Colors.danger} />
            <Text style={styles.refusedTitle}>Order Refused</Text>
            {order.refusal_reason && (
              <Text style={styles.refusedReason}>{order.refusal_reason}</Text>
            )}
          </View>
        ) : (
          <View style={styles.timelineCard}>
            {STATUS_STEPS.map((step, idx) => {
              const done = idx < currentStep;
              const active = idx === currentStep;
              return (
                <View key={step.key} style={styles.timelineRow}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, done && styles.dotDone, active && styles.dotActive]}>
                      {done ? (
                        <Ionicons name="checkmark" size={14} color="#000" />
                      ) : active ? (
                        <LinearGradient
                          colors={[Colors.goldStart, Colors.goldEnd]}
                          style={StyleSheet.absoluteFill}
                        />
                      ) : null}
                    </View>
                    {idx < STATUS_STEPS.length - 1 && (
                      <View style={[styles.timelineLine, done && styles.lineDone]} />
                    )}
                  </View>
                  <View style={styles.timelineInfo}>
                    <Text style={[styles.timelineLabel, (done || active) && styles.timelineLabelActive]}>
                      {step.label}
                    </Text>
                    {active && (
                      <Text style={styles.timelineActive}>In progress…</Text>
                    )}
                  </View>
                  <Ionicons
                    name={step.icon as any}
                    size={20}
                    color={done || active ? Colors.goldAccent : "rgba(185,185,195,0.25)"}
                  />
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.summaryCard}>
          {items.map((i) => (
            <View key={i.id} style={styles.summaryRow}>
              <Text style={styles.itemName}>{i.name} ×{i.qty}</Text>
              <Text style={styles.itemPrice}>{formatPrice(i.unit_price * i.qty)}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryVal}>{formatPrice(order.subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryVal}>{formatPrice(order.delivery_fee)}</Text>
          </View>
          <View style={[styles.summaryRow, { marginTop: 8 }]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalVal}>{formatPrice(order.total)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Delivery Info</Text>
        <View style={styles.deliveryCard}>
          <View style={styles.deliveryRow}>
            <Ionicons name="person-outline" size={16} color={Colors.goldAccent} />
            <Text style={styles.deliveryText}>{order.customer_name}</Text>
          </View>
          <View style={styles.deliveryRow}>
            <Ionicons name="call-outline" size={16} color={Colors.goldAccent} />
            <Text style={styles.deliveryText}>{order.customer_phone}</Text>
          </View>
          <View style={styles.deliveryRow}>
            <Ionicons name="location-outline" size={16} color={Colors.goldAccent} />
            <Text style={styles.deliveryText}>{order.delivery_address}</Text>
          </View>
          {order.delivery_notes && (
            <View style={styles.deliveryRow}>
              <Ionicons name="document-text-outline" size={16} color={Colors.goldAccent} />
              <Text style={styles.deliveryText}>{order.delivery_notes}</Text>
            </View>
          )}
        </View>

        <Pressable onPress={() => router.replace("/(tabs)")} style={styles.continueBtn}>
          <Text style={styles.continueBtnText}>Continue Shopping</Text>
        </Pressable>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 20,
    color: Colors.textPrimary,
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8, gap: 20 },
  orderIdCard: {
    backgroundColor: "rgba(20,20,28,0.78)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(214,162,74,0.15)",
    padding: 20,
    alignItems: "center",
  },
  orderIdLabel: { color: Colors.goldAccent, fontFamily: "CormorantGaramond_600SemiBold", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 },
  orderId: { color: Colors.textPrimary, fontFamily: "PlayfairDisplay_700Bold", fontSize: 24, letterSpacing: 2 },
  orderDate: { color: Colors.textSecondary, fontFamily: "CormorantGaramond_400Regular", fontSize: 13, marginTop: 6 },
  timelineCard: {
    backgroundColor: "rgba(20,20,28,0.78)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(214,162,74,0.15)",
    padding: 20,
  },
  timelineRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 0 },
  timelineLeft: { width: 40, alignItems: "center" },
  timelineDot: {
    width: 28, height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(185,185,195,0.25)",
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  dotDone: { backgroundColor: Colors.goldAccent, borderColor: Colors.goldAccent },
  dotActive: { borderColor: Colors.goldAccent, overflow: "hidden" },
  timelineLine: { width: 2, flex: 1, minHeight: 32, backgroundColor: "rgba(185,185,195,0.15)", marginVertical: 4 },
  lineDone: { backgroundColor: Colors.goldAccent },
  timelineInfo: { flex: 1, paddingLeft: 12, paddingBottom: 24 },
  timelineLabel: { color: "rgba(185,185,195,0.45)", fontFamily: "CormorantGaramond_600SemiBold", fontSize: 15 },
  timelineLabelActive: { color: Colors.textPrimary },
  timelineActive: { color: Colors.goldAccent, fontFamily: "CormorantGaramond_400Regular", fontSize: 13, marginTop: 2 },
  refusedCard: {
    backgroundColor: "rgba(20,20,28,0.78)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,77,77,0.25)",
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  refusedTitle: { color: Colors.danger, fontFamily: "PlayfairDisplay_700Bold", fontSize: 20 },
  refusedReason: { color: Colors.textSecondary, fontFamily: "CormorantGaramond_400Regular", fontSize: 15, textAlign: "center" },
  sectionTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 16, color: Colors.textPrimary },
  summaryCard: {
    backgroundColor: "rgba(20,20,28,0.78)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(214,162,74,0.15)",
    padding: 16,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  itemName: { color: Colors.textSecondary, fontFamily: "CormorantGaramond_400Regular", fontSize: 14, flex: 1 },
  itemPrice: { color: Colors.textSecondary, fontFamily: "CormorantGaramond_400Regular", fontSize: 14 },
  divider: { height: 1, backgroundColor: "rgba(214,162,74,0.15)", marginVertical: 8 },
  summaryLabel: { color: "rgba(185,185,195,0.6)", fontFamily: "CormorantGaramond_400Regular", fontSize: 14 },
  summaryVal: { color: Colors.textPrimary, fontFamily: "CormorantGaramond_600SemiBold", fontSize: 14 },
  totalLabel: { color: Colors.textPrimary, fontFamily: "PlayfairDisplay_700Bold", fontSize: 16 },
  totalVal: { color: Colors.goldAccent, fontFamily: "PlayfairDisplay_700Bold", fontSize: 16 },
  deliveryCard: {
    backgroundColor: "rgba(20,20,28,0.78)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(214,162,74,0.15)",
    padding: 16,
    gap: 12,
  },
  deliveryRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  deliveryText: { color: Colors.textSecondary, fontFamily: "CormorantGaramond_400Regular", fontSize: 15, flex: 1 },
  continueBtn: {
    borderWidth: 1,
    borderColor: Colors.goldAccent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  continueBtnText: { color: Colors.goldAccent, fontFamily: "PlayfairDisplay_700Bold", fontSize: 14, letterSpacing: 1 },
  emptyTitle: { color: Colors.textPrimary, fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, marginBottom: 20 },
  homeBtn: { borderWidth: 1, borderColor: Colors.goldAccent, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  homeBtnText: { color: Colors.goldAccent, fontFamily: "CormorantGaramond_600SemiBold", fontSize: 15 },
  danger: Colors.danger,
});
