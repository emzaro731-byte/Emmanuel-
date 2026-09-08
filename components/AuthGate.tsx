import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { supabase } from "../lib/supabase";
import AuthScreen from "./AuthScreen";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setReady(true);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <View style={styles.logo}><Text style={styles.logoText}>✦</Text></View>
        <Text style={styles.title}>Destiny AI</Text>
        <ActivityIndicator color="#A18CFF" style={{ marginTop: 18 }} />
        <Text style={styles.subtitle}>Restoring your secure session…</Text>
      </View>
    );
  }

  return session ? <>{children}</> : <AuthScreen />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: "#050816", alignItems: "center", justifyContent: "center" },
  logo: { width: 72, height: 72, borderRadius: 22, backgroundColor: "#7C5CFF", alignItems: "center", justifyContent: "center" },
  logoText: { color: "#fff", fontSize: 38, fontWeight: "900" },
  title: { color: "#fff", fontSize: 26, fontWeight: "900", marginTop: 14 },
  subtitle: { color: "#68728C", fontSize: 13, marginTop: 10 },
});
