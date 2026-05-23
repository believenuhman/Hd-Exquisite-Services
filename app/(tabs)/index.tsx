import { Text, View, ScrollView } from "react-native";

export default function Home() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#050505", padding: 20 }}>
      <Text style={{ color: "#d4af37", fontSize: 32, fontWeight: "bold", marginTop: 40 }}>
        HD Exquisite Services
      </Text>

      <Text style={{ color: "white", fontSize: 18, marginTop: 10 }}>
        Premium drinks, wines, cocktails & delivery.
      </Text>

      <View style={{ marginTop: 30, padding: 20, borderRadius: 16, backgroundColor: "#111" }}>
        <Text style={{ color: "white", fontSize: 22, fontWeight: "bold" }}>
          Featured Drinks
        </Text>
        <Text style={{ color: "#aaa", marginTop: 10 }}>
          Products will load here next.
        </Text>
      </View>
    </ScrollView>
  );
}
