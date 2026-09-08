import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

const C = {
  bg: "#050816",
  surface: "#0B1020",
  border: "#202B49",
  primary: "#7C5CFF",
  primary2: "#A18CFF",
  text: "#FFFFFF",
  muted: "#98A3BF",
  dim: "#68728C",
  green: "#35D49A",
  red: "#FF5C7A",
};

type AuthMode = "login" | "signup" | "forgot";

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const title = useMemo(() => {
    if (mode === "signup") return "Create your account";
    if (mode === "forgot") return "Reset your password";
    return "Welcome back";
  }, [mode]);

  const submit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return Alert.alert("Email required", "Enter your email address.");

    if (mode === "forgot") {
      setLoading(true);
      setNotice("");
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: "destinyai://reset-password",
        });
        if (error) throw error;
        setNotice("If an account exists for this email, a password reset link has been sent.");
      } catch (error: any) {
        Alert.alert("Reset failed", error?.message || "Unable to send the reset email.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (password.length < 8) {
      return Alert.alert("Password too short", "Use at least 8 characters.");
    }

    if (mode === "signup") {
      if (!name.trim()) return Alert.alert("Name required", "Enter your name.");
      if (password !== confirm) return Alert.alert("Passwords do not match", "Check both password fields.");
    }

    setLoading(true);
    setNotice("");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { full_name: name.trim() } },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice("Account created. Check your email and verify your address before signing in.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      Alert.alert("Authentication failed", error?.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.logo}><Text style={styles.logoText}>✦</Text></View>
          <Text style={styles.brand}>Destiny AI</Text>
          <Text style={styles.tagline}>Your AI companion for work, learning and creation.</Text>

          <View style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>
              {mode === "signup" ? "Start your personal AI workspace." : mode === "forgot" ? "Enter your account email." : "Sign in to continue to your workspace."}
            </Text>

            {mode === "signup" && (
              <TextInput value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={C.dim} style={styles.input} autoCapitalize="words" />
            )}
            <TextInput value={email} onChangeText={setEmail} placeholder="Email address" placeholderTextColor={C.dim} style={styles.input} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />

            {mode !== "forgot" && (
              <>
                <TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={C.dim} style={styles.input} secureTextEntry autoCapitalize="none" />
                {mode === "signup" && <TextInput value={confirm} onChangeText={setConfirm} placeholder="Confirm password" placeholderTextColor={C.dim} style={styles.input} secureTextEntry autoCapitalize="none" />}
              </>
            )}

            {!!notice && <View style={styles.notice}><Text style={styles.noticeText}>{notice}</Text></View>}

            <TouchableOpacity disabled={loading} style={[styles.primary, loading && styles.disabled]} onPress={submit}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Log in"}</Text>}
            </TouchableOpacity>

            {mode === "login" && (
              <TouchableOpacity onPress={() => { setMode("forgot"); setNotice(""); }} style={styles.linkButton}>
                <Text style={styles.link}>Forgot password?</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>{mode === "signup" ? "Already have an account?" : "Don't have an account?"}</Text>
            <TouchableOpacity onPress={() => { setMode(mode === "signup" ? "login" : "signup"); setNotice(""); }}>
              <Text style={styles.link}>{mode === "signup" ? " Log in" : " Create account"}</Text>
            </TouchableOpacity>
          </View>

          {mode === "forgot" && <TouchableOpacity onPress={() => { setMode("login"); setNotice(""); }}><Text style={styles.back}>← Back to login</Text></TouchableOpacity>}
          <Text style={styles.footer}>Secure authentication powered by Supabase.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: "center", padding: 24, maxWidth: 560, width: "100%", alignSelf: "center" },
  logo: { width: 74, height: 74, borderRadius: 24, backgroundColor: C.primary, alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 14 },
  logoText: { color: "#fff", fontSize: 38, fontWeight: "900" },
  brand: { color: C.text, fontSize: 30, fontWeight: "900", textAlign: "center" },
  tagline: { color: C.muted, textAlign: "center", fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 28 },
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 24, padding: 20 },
  title: { color: C.text, fontSize: 24, fontWeight: "800", marginBottom: 7 },
  subtitle: { color: C.muted, fontSize: 14, lineHeight: 20, marginBottom: 18 },
  input: { backgroundColor: "#080D1B", borderWidth: 1, borderColor: C.border, color: C.text, borderRadius: 14, minHeight: 52, paddingHorizontal: 15, marginBottom: 12, fontSize: 15 },
  primary: { minHeight: 52, borderRadius: 14, backgroundColor: C.primary, alignItems: "center", justifyContent: "center", marginTop: 4 },
  disabled: { opacity: 0.65 },
  primaryText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  linkButton: { alignItems: "center", paddingVertical: 15 },
  link: { color: C.primary2, fontWeight: "800" },
  notice: { backgroundColor: "rgba(53,212,154,0.10)", borderWidth: 1, borderColor: "rgba(53,212,154,0.25)", padding: 12, borderRadius: 12, marginBottom: 12 },
  noticeText: { color: C.green, fontSize: 13, lineHeight: 19 },
  switchRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 20 },
  switchText: { color: C.muted, fontSize: 14 },
  back: { color: C.primary2, textAlign: "center", marginTop: 18, fontWeight: "700" },
  footer: { color: C.dim, textAlign: "center", fontSize: 11, marginTop: 28 },
});
