import React from "react";

import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { StatusBar } from "expo-status-bar";

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.content}>

        <View style={styles.logoContainer}>
          <Text style={styles.logo}>
            ✦
          </Text>
        </View>

        <Text style={styles.title}>
          Destiny AI
        </Text>

        <Text style={styles.subtitle}>
          Your intelligent AI assistant
        </Text>

        <View style={styles.statusCard}>

          <View style={styles.greenDot} />

          <Text style={styles.statusText}>
            App is running successfully
          </Text>

        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#07111F",
  },

  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },

  logoContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#10233D",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 25,
    borderWidth: 2,
    borderColor: "#D4AF37",
  },

  logo: {
    fontSize: 60,
    color: "#D4AF37",
  },

  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 17,
    color: "#AAB7C4",
    textAlign: "center",
  },

  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 35,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: "#0D1B2A",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#1C3552",
  },

  greenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
    marginRight: 10,
  },

  statusText: {
    color: "#FFFFFF",
    fontSize: 15,
  },

});