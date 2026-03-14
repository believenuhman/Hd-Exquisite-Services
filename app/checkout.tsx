import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { ScreenBackground } from "@/components/ScreenBackground";
import { useCart } from "@/context/CartContext";
import { useAppSettings } from "@/context/AppSettingsContext";
import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ADDR_KEY = "hd_saved_address";
const PHONE_KEY = "hd_saved_phone";
const NAME_KEY = "hd_saved_name";

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  keyboardType?: any;
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMulti]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="rgba(185,185,195,0.4)"
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );
}

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { items, subtotal, clearCart } = useCart();
  const { settings, zones, formatPrice } = useAppSettings();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [ageCheck, setAgeCheck] = useState(false);
  const [idCheck, setIdCheck] = useState(false);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
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

  const selectedZone = zones.find((z) => z.id === zoneId);
  const deliveryFee = selectedZone ? selectedZone.fee : 0;
  const total = subtotal + deliveryFee;

  const handlePlaceOrder = async () => {
    if (!name.trim()) return Alert.alert("Required", "Please enter your name.");
    if (!phone.trim()) return Alert.alert("Required", "Please enter your phone number.");
    if (!address.trim()) return Alert.alert("Required", "Please enter your delivery address.");
    if (!zoneId) return Alert.alert("Required", "Please select a delivery zone.");
    if (!ageCheck) return Alert.alert("Required", "Please confirm you are 18+.");
    if (!idCheck) return Alert.alert("Required", "Please confirm you have a valid ID.");
    if (items.length === 0) return Alert.alert("Cart empty", "Add items to your cart first.");

    setLoading(true);
    try {
      await Promise.all([
        AsyncStorage.setItem(NAME_KEY, name),
        AsyncStorage.setItem(PHONE_KEY, phone),
        AsyncStorage.setItem(ADDR_KEY, address),
      ]);

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          customer_name: name,
          customer_phone: phone,
          delivery_address: address,
          delivery_notes: notes || null,
          age_confirmed: ageCheck,
          status: "received",
          subtotal,
          delivery_fee: deliveryFee,
          total,
          currency_code: settings?.currency_code ?? "USD",
          currency_symbol: settings?.currency_symbol ?? "$",
          zone_id: zoneId,
        })
        .select()
        .single();

      if (orderErr) throw orderErr;

      const orderItems = items.map((i) => ({
        order_id: order.id,
        product_id: i.product.id,
        name: i.product.name,
        qty: i.quantity,
        unit_price: i.product.price,
      }));

      const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
      if (itemsErr) throw itemsErr;

      clearCart();
      router.replace({ pathname: "/order-tracking/[id]", params: { id: order.id } });
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <ScreenBackground>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: botPad + 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>Delivery Details</Text>
        <Field label="Full Name" value={name} onChange={setName} placeholder="John Doe" />
        <Field label="Phone" value={phone} onChange={setPhone} placeholder="+1 246 000 0000" keyboardType="phone-pad" />
        <Field label="Delivery Address" value={address} onChange={setAddress} placeholder="123 Main St, Bridgetown" multiline />
        <Field label="Delivery Notes (optional)" value={notes} onChange={setNotes} placeholder="Leave at gate, call on arrival…" multiline />

        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Delivery Zone</Text>
        <View style={styles.zonesGrid}>
          {zones.map((z) => (
            <Pressable key={z.id} onPress={() => setZoneId(z.id)} style={styles.zonePill}>
              {zoneId === z.id ? (
                <LinearGradient
                  colors={[Colors.goldStart, Colors.goldEnd]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.zonePillInner}
                >
                  <Text style={styles.zonePillActiveText}>{z.name}</Text>
                  <Text style={styles.zonePillActiveFee}>{formatPrice(z.fee)}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.zonePillInner}>
                  <Text style={styles.zonePillText}>{z.name}</Text>
                  <Text style={styles.zonePillFee}>{formatPrice(z.fee)}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Order Summary</Text>
        <View style={styles.summaryCard}>
          {items.map((i) => (
            <View key={i.product.id} style={styles.summaryRow}>
              <Text style={styles.summaryItemName}>{i.product.name} ×{i.quantity}</Text>
              <Text style={styles.summaryItemPrice}>{formatPrice(i.product.price * i.quantity)}</Text>
            </View>
          ))}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>{selectedZone ? formatPrice(deliveryFee) : "Select zone"}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrice(total)}</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Confirmations</Text>
        <Pressable onPress={() => setAgeCheck((v) => !v)} style={styles.checkRow}>
          <View style={[styles.checkbox, ageCheck && styles.checkboxActive]}>
            {ageCheck && <Ionicons name="checkmark" size={14} color="#000" />}
          </View>
          <Text style={styles.checkText}>I confirm I am 18 years of age or older</Text>
        </Pressable>
        <Pressable onPress={() => setIdCheck((v) => !v)} style={styles.checkRow}>
          <View style={[styles.checkbox, idCheck && styles.checkboxActive]}>
            {idCheck && <Ionicons name="checkmark" size={14} color="#000" />}
          </View>
          <Text style={styles.checkText}>I understand a valid ID is required upon delivery</Text>
        </Pressable>

        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Payment</Text>
        <View style={styles.paymentCard}>
          <View style={styles.paymentOption}>
            <Ionicons name="cash-outline" size={22} color={Colors.goldAccent} />
            <Text style={styles.paymentLabel}>Cash on Delivery</Text>
            <View style={styles.selectedBadge}>
              <Text style={styles.selectedBadgeText}>Selected</Text>
            </View>
          </View>
          <View style={[styles.paymentOption, styles.paymentDisabled]}>
            <Ionicons name="card-outline" size={22} color="rgba(185,185,195,0.3)" />
            <Text style={[styles.paymentLabel, { color: "rgba(185,185,195,0.3)" }]}>Card Payment</Text>
            <Text style={styles.comingSoon}>Coming Soon</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.ctaContainer, { paddingBottom: botPad + 16 }]}>
        <Pressable onPress={handlePlaceOrder} disabled={loading} style={styles.ctaBtn}>
          <LinearGradient
            colors={[Colors.goldStart, Colors.goldEnd]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.ctaGrad}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.ctaText}>PLACE ORDER — {formatPrice(total)}</Text>
            )}
          </LinearGradient>
        </Pressable>
      </View>
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  sectionTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: {
    fontFamily: "CormorantGaramond_600SemiBold",
    fontSize: 12,
    color: Colors.goldAccent,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(214,162,74,0.2)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 16,
  },
  inputMulti: { minHeight: 80, textAlignVertical: "top", paddingTop: 12 },
  zonesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  zonePill: { borderRadius: 10, overflow: "hidden", marginBottom: 0 },
  zonePillInner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(214,162,74,0.2)",
    borderRadius: 10,
    alignItems: "center",
  },
  zonePillText: { color: Colors.textSecondary, fontFamily: "CormorantGaramond_600SemiBold", fontSize: 14 },
  zonePillFee: { color: "rgba(185,185,195,0.5)", fontFamily: "CormorantGaramond_400Regular", fontSize: 12, marginTop: 2 },
  zonePillActiveText: { color: "#000", fontFamily: "CormorantGaramond_700Bold", fontSize: 14 },
  zonePillActiveFee: { color: "rgba(0,0,0,0.7)", fontFamily: "CormorantGaramond_400Regular", fontSize: 12, marginTop: 2 },
  summaryCard: {
    backgroundColor: "rgba(20,20,28,0.78)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(214,162,74,0.15)",
    padding: 16,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  summaryItemName: { color: Colors.textSecondary, fontFamily: "CormorantGaramond_400Regular", fontSize: 14, flex: 1 },
  summaryItemPrice: { color: Colors.textSecondary, fontFamily: "CormorantGaramond_400Regular", fontSize: 14 },
  summaryDivider: { height: 1, backgroundColor: "rgba(214,162,74,0.15)", marginVertical: 10 },
  summaryLabel: { color: "rgba(185,185,195,0.7)", fontFamily: "CormorantGaramond_400Regular", fontSize: 14 },
  summaryValue: { color: Colors.textPrimary, fontFamily: "CormorantGaramond_600SemiBold", fontSize: 14 },
  totalRow: { marginTop: 4, marginBottom: 0 },
  totalLabel: { color: Colors.textPrimary, fontFamily: "PlayfairDisplay_700Bold", fontSize: 16 },
  totalValue: { color: Colors.goldAccent, fontFamily: "PlayfairDisplay_700Bold", fontSize: 16 },
  checkRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14, gap: 12 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: Colors.goldAccent,
    alignItems: "center", justifyContent: "center",
    marginTop: 1,
  },
  checkboxActive: { backgroundColor: Colors.goldAccent, borderColor: Colors.goldAccent },
  checkText: { color: Colors.textSecondary, fontFamily: "CormorantGaramond_400Regular", fontSize: 15, flex: 1, lineHeight: 22 },
  paymentCard: {
    backgroundColor: "rgba(20,20,28,0.78)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(214,162,74,0.15)",
    overflow: "hidden",
  },
  paymentOption: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: "rgba(214,162,74,0.1)" },
  paymentDisabled: { opacity: 0.6 },
  paymentLabel: { color: Colors.textPrimary, fontFamily: "CormorantGaramond_600SemiBold", fontSize: 15, flex: 1 },
  selectedBadge: { backgroundColor: "rgba(214,162,74,0.2)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  selectedBadgeText: { color: Colors.goldAccent, fontFamily: "CormorantGaramond_600SemiBold", fontSize: 11 },
  comingSoon: { color: "rgba(185,185,195,0.4)", fontFamily: "CormorantGaramond_400Regular", fontSize: 12 },
  ctaContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "rgba(11,11,15,0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(214,162,74,0.1)",
  },
  ctaBtn: { borderRadius: 14, overflow: "hidden" },
  ctaGrad: { paddingVertical: 16, alignItems: "center" },
  ctaText: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 15, color: "#000", letterSpacing: 1 },
});
