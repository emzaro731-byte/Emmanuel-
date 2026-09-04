import React, { useState } from "react";

import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import * as Speech from "expo-speech";

const BACKEND_URL =
  "https://vihbsfrwnslnmheowkhy.supabase.co/functions/v1/destiny-ai-chat";

export default function App() {
  const [messages, setMessages] = useState([
    {
      id: "1",
      role: "assistant",
      text: "Hello! I am Destiny AI. How can I help you today?",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const isImageRequest = (text) => {
    const words = [
      "create an image",
      "generate an image",
      "make an image",
      "create image",
      "generate image",
      "draw",
      "create a picture",
      "generate a picture",
    ];

    const lowerText = text.toLowerCase();

    return words.some((word) => lowerText.includes(word));
  };

  const sendMessage = async () => {
    const userText = input.trim();

    if (!userText || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      text: userText,
    };

    setMessages((previousMessages) => [
      ...previousMessages,
      userMessage,
    ]);

    setInput("");
    setLoading(true);

    try {
      const response = await fetch(BACKEND_URL, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          message: userText,
          type: isImageRequest(userText) ? "image" : "chat",
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      let replyText =
        data.reply ||
        data.message ||
        data.response ||
        "Sorry, I could not generate a response.";

      const imageUrl =
        data.imageUrl ||
        data.image_url ||
        data.url ||
        null;

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: replyText,
        image: imageUrl,
      };

      setMessages((previousMessages) => [
        ...previousMessages,
        aiMessage,
      ]);
    } catch (error) {
      console.log("Destiny AI Error:", error);

      const errorMessage = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        text:
          "I could not connect to the Destiny AI server. Please check your internet connection or backend configuration.",
      };

      setMessages((previousMessages) => [
        ...previousMessages,
        errorMessage,
      ]);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photos."
        );

        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const imageUri = result.assets[0].uri;

        const imageMessage = {
          id: Date.now().toString(),
          role: "user",
          text: "Image uploaded",
          image: imageUri,
        };

        setMessages((previousMessages) => [
          ...previousMessages,
          imageMessage,
        ]);
      }
    } catch (error) {
      console.log("Image Picker Error:", error);

      Alert.alert(
        "Error",
        "Unable to open your image gallery."
      );
    }
  };

  const speakMessage = (text) => {
    if (!text) return;

    Speech.stop();

    Speech.speak(text, {
      language: "en-US",
      rate: 0.9,
    });
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === "user";

    return (
      <View
        style={[
          styles.messageRow,
          isUser
            ? styles.userMessageRow
            : styles.aiMessageRow,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser
              ? styles.userBubble
              : styles.aiBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser
                ? styles.userText
                : styles.aiText,
            ]}
          >
            {item.text}
          </Text>

          {item.image ? (
            <Image
              source={{ uri: item.image }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          ) : null}

          {!isUser && (
            <TouchableOpacity
              style={styles.speakButton}
              onPress={() => speakMessage(item.text)}
            >
              <Text style={styles.speakText}>
                🔊 Listen
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#07111F"
      />

      {/* HEADER */}

      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>
            Destiny AI
          </Text>

          <Text style={styles.subtitle}>
            Your Intelligent Assistant
          </Text>
        </View>

        <View style={styles.onlineContainer}>
          <View style={styles.onlineDot} />

          <Text style={styles.onlineText}>
            Online
          </Text>
        </View>
      </View>

      {/* CHAT */}

      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* LOADING */}

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="small"
            color="#D4AF37"
          />

          <Text style={styles.loadingText}>
            Destiny AI is thinking...
          </Text>
        </View>
      )}

      {/* INPUT */}

      <KeyboardAvoidingView
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.imageButton}
            onPress={pickImage}
          >
            <Text style={styles.imageButtonText}>
              📎
            </Text>
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Message Destiny AI..."
            placeholderTextColor="#7D8796"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={2000}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!input.trim() || loading) &&
                styles.disabledButton,
            ]}
            onPress={sendMessage}
            disabled={!input.trim() || loading}
          >
            <Text style={styles.sendText}>
              ➤
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07111F",
  },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#172235",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  logo: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
  },

  subtitle: {
    color: "#8B95A5",
    fontSize: 12,
    marginTop: 3,
  },

  onlineContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 10,
    backgroundColor: "#22C55E",
    marginRight: 6,
  },

  onlineText: {
    color: "#22C55E",
    fontSize: 12,
  },

  messagesContainer: {
    padding: 16,
    paddingBottom: 20,
  },

  messageRow: {
    marginBottom: 14,
    flexDirection: "row",
  },

  userMessageRow: {
    justifyContent: "flex-end",
  },

  aiMessageRow: {
    justifyContent: "flex-start",
  },

  messageBubble: {
    maxWidth: "85%",
    padding: 14,
    borderRadius: 18,
  },

  userBubble: {
    backgroundColor: "#1D4ED8",
    borderBottomRightRadius: 5,
  },

  aiBubble: {
    backgroundColor: "#111C2E",
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: "#1E2D45",
  },

  messageText: {
    fontSize: 16,
    lineHeight: 23,
  },

  userText: {
    color: "#FFFFFF",
  },

  aiText: {
    color: "#E5E7EB",
  },

  messageImage: {
    width: 240,
    height: 240,
    borderRadius: 12,
    marginTop: 10,
  },

  speakButton: {
    marginTop: 10,
  },

  speakText: {
    color: "#D4AF37",
    fontSize: 12,
  },

  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },

  loadingText: {
    color: "#AAB4C3",
    marginLeft: 10,
    fontSize: 13,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#172235",
    backgroundColor: "#091526",
  },

  imageButton: {
    width: 45,
    height: 45,
    alignItems: "center",
    justifyContent: "center",
  },

  imageButtonText: {
    fontSize: 22,
  },

  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    backgroundColor: "#111C2E",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#FFFFFF",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#22324D",
  },

  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#D4AF37",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  disabledButton: {
    opacity: 0.5,
  },

  sendText: {
    fontSize: 22,
    color: "#07111F",
    fontWeight: "bold",
  },
});