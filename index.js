import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { registerRootComponent } from "expo";
import App from "./App";
import AuthGate from "./components/AuthGate";

class AppErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Destiny AI startup error:", error, info);
  }

  render() {
    if (this.state.error) {
      const message = this.state.error?.message || String(this.state.error);
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Destiny AI</Text>
          <Text style={styles.subtitle}>The app encountered an error while starting.</Text>
          <Text style={styles.error}>{message}</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07111f",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: "#d9b45b",
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 12,
  },
  subtitle: {
    color: "#ffffff",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 18,
  },
  error: {
    color: "#ffb4ab",
    fontSize: 13,
    textAlign: "center",
  },
});

function Root() {
  return (
    <AppErrorBoundary>
      <AuthGate>
        <App />
      </AuthGate>
    </AppErrorBoundary>
  );
}

registerRootComponent(Root);
