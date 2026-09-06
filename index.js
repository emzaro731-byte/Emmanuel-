import React from "react";
import { AppRegistry, StyleSheet, Text, View } from "react-native";
import App from "./App";

const APP_NAME = "DestinyAI";

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

AppRegistry.registerComponent(APP_NAME, () => () => (
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
));
