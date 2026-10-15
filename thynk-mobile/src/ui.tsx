import React, { useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle,
} from "react-native";

export const C = {
  accent: "#E8611A", ink: "#1C1917", muted: "#78716C", faint: "#A8A29E",
  line: "#E7E5E4", bg: "#FAFAF9", card: "#FFFFFF", green: "#16A34A", amber: "#D97706", red: "#DC2626",
};

export function Screen({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  const body = scroll
    ? <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
    : <View style={{ flex: 1, padding: 16 }}>{children}</View>;
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {body}
    </KeyboardAvoidingView>
  );
}

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void }) {
  const inner = [s.card, style];
  return onPress
    ? <Pressable onPress={onPress} style={({ pressed }) => [...inner, pressed && { opacity: 0.7 }]}>{children}</Pressable>
    : <View style={inner}>{children}</View>;
}

export function Btn({ title, onPress, kind = "primary", disabled, loading }:
  { title: string; onPress: () => void; kind?: "primary" | "secondary" | "danger"; disabled?: boolean; loading?: boolean }) {
  const bg = kind === "primary" ? C.accent : kind === "danger" ? "#FEE2E2" : "#fff";
  const fg = kind === "primary" ? "#fff" : kind === "danger" ? "#B91C1C" : C.ink;
  return (
    <Pressable disabled={disabled || loading} onPress={onPress}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, borderColor: kind === "secondary" ? C.line : bg, opacity: disabled || pressed ? 0.6 : 1 }]}>
      {loading ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, fontWeight: "700", fontSize: 14 }}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, ...p }: { label: string } & TextInputProps) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput placeholderTextColor={C.faint} {...p}
        style={[s.input, p.multiline && { minHeight: 80, textAlignVertical: "top" }, p.style]} />
    </View>
  );
}

export function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <Field label={label} value={value} keyboardType="numeric" onChangeText={t => onChange(t.replace(/[^0-9.]/g, ""))} />;
}

export function Select({ label, value, options, onChange }:
  { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const cur = options.find(o => o.value === value);
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.label}>{label}</Text>
      <Pressable style={[s.input, { flexDirection: "row", justifyContent: "space-between" }]} onPress={() => setOpen(true)}>
        <Text style={{ color: cur ? C.ink : C.faint }}>{cur?.label ?? "Select…"}</Text>
        <Text style={{ color: C.faint }}>▾</Text>
      </Pressable>
      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          <View style={s.sheet}>
            <Text style={[s.label, { marginBottom: 8 }]}>{label}</Text>
            <ScrollView>
              {options.map(o => (
                <Pressable key={o.value} onPress={() => { onChange(o.value); setOpen(false); }}
                  style={[s.opt, o.value === value && { backgroundColor: "#FFF7ED" }]}>
                  <Text style={{ color: C.ink, fontWeight: o.value === value ? "700" : "400" }}>{o.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export function Badge({ text, bg = "#F5F4F0", color = C.muted }: { text: string; bg?: string | null; color?: string | null }) {
  return (
    <View style={{ backgroundColor: bg ?? "#F5F4F0", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: "flex-start" }}>
      <Text style={{ color: color ?? C.muted, fontSize: 11.5, fontWeight: "700" }}>{text}</Text>
    </View>
  );
}

export function Segmented({ value, options, onChange }:
  { value: string; options: { value: string; label: string; disabled?: boolean }[]; onChange: (v: string) => void }) {
  return (
    <View style={{ flexDirection: "row", backgroundColor: "#F0EEEC", borderRadius: 10, padding: 3, marginBottom: 14 }}>
      {options.map(o => (
        <Pressable key={o.value} disabled={o.disabled} onPress={() => onChange(o.value)}
          style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center",
            backgroundColor: o.value === value ? "#fff" : "transparent", opacity: o.disabled ? 0.4 : 1 }}>
          <Text style={{ fontSize: 12.5, fontWeight: "700", color: o.value === value ? C.accent : C.muted }}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export const Loading = () => <View style={{ padding: 40 }}><ActivityIndicator color={C.accent} /></View>;
export const Empty = ({ text }: { text: string }) =>
  <Text style={{ textAlign: "center", color: C.faint, padding: 28, fontSize: 13.5 }}>{text}</Text>;
export const H = ({ children }: { children: React.ReactNode }) =>
  <Text style={{ fontSize: 13, fontWeight: "800", color: C.ink, marginBottom: 8, marginTop: 4 }}>{children}</Text>;

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 14, marginBottom: 10 },
  btn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignItems: "center", borderWidth: 1, marginBottom: 10 },
  label: { fontSize: 11.5, fontWeight: "700", color: C.muted, marginBottom: 4 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: C.ink },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 24 },
  sheet: { backgroundColor: "#fff", borderRadius: 14, padding: 16, maxHeight: "70%" },
  opt: { paddingVertical: 12, paddingHorizontal: 10, borderRadius: 8 },
});
