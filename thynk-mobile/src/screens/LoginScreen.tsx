import React, { useState } from "react";
import { Text, View } from "react-native";
import { useAuth } from "../lib/auth";
import { Btn, C, Field, Screen } from "../ui";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function go() {
    if (!email || !password) { setError("Enter email and password"); return; }
    setBusy(true); setError("");
    const err = await signIn(email, password);
    if (err) setError(err);
    setBusy(false);
  }

  return (
    <Screen>
      <View style={{ alignItems: "center", marginTop: 80, marginBottom: 32 }}>
        <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#fff", fontSize: 28, fontWeight: "800" }}>T</Text>
        </View>
        <Text style={{ fontSize: 22, fontWeight: "800", color: C.ink, marginTop: 14 }}>Thynk Success</Text>
        <Text style={{ fontSize: 12, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginTop: 4 }}>Client Information System</Text>
      </View>
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
      {!!error && <Text style={{ color: C.red, marginBottom: 12 }}>{error}</Text>}
      <Btn title="Sign in" onPress={go} loading={busy} />
    </Screen>
  );
}
