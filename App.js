import React, { useEffect, useRef, useState } from "react";

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
  Modal,
  Pressable,
  Keyboard,
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import * as Speech from "expo-speech";

const BACKEND_URL =
  "https://vihbsfrwnslnmheowkhy.supabase.co/functions/v1/destiny-ai-chat";

const GOLD = "#D4AF37";
const BG = "#050B14";
const PANEL = "#0B1422";
const CARD = "#101C2E";
const BORDER = "#1C2B40";

export default function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("Destiny AI");
  const [showModels, setShowModels] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const listRef = useRef(null);

  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        text:
          "Hello! I'm Destiny AI. I'm ready to help you write, learn, code, research, create images, and more.",
      },
    ]);
  }, []);

  const isImageRequest = (text) => {
    const phrases = [
      "create an image",
      "generate an image",
      "make an image",
      "create image",
      "generate image",
      "draw",
      "create a picture",
      "generate a picture",
      "make a picture",
      "design an image",
    ];

    const value = text.toLowerCase();

    return phrases.some((phrase) => value.includes(phrase));
  };

  const newChat = () => {
    Keyboard.dismiss();

    setMessages([
      {
        id: Date.now().toString(),
        role: "assistant",
        text:
          "New conversation started. What would you like to create today?",
      },
    ]);

    setInput("");
  };

  const sendMessage = async () => {
    const text = input.trim();

    if (!text || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    setTimeout(() => {
      listRef.current?.scrollToEnd({
        animated: true,
      });
    }, 100);

    try {
      const response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          type: isImageRequest(text) ? "image" : "chat",
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      const reply =
        data.reply ||
        data.message ||
        data.response ||
        "I couldn't generate a response.";

      const image =
        data.imageUrl ||
        data.image_url ||
        data.image ||
        data.url ||
        null;

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: reply,
        image,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.log("Destiny AI:", error);

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          role: "assistant",
          text:
            "I couldn't connect to Destiny AI right now. Please check your internet connection and make sure your Supabase Edge Function is deployed.",
        },
      ]);
    } finally {
      setLoading(false);

      setTimeout(() => {
        listRef.current?.scrollToEnd({
          animated: true,
        });
      }, 200);
    }
  };

  const pickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "Please allow Destiny AI to access your photos."
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          quality: 0.85,
        });

      if (result.canceled) return;

      const uri = result.assets?.[0]?.uri;

      if (!uri) return;

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "user",
          text: "Image uploaded",
          image: uri,
        },
      ]);

      Alert.alert(
        "Image selected",
        "The image has been added to this conversation."
      );
    } catch (error) {
      console.log(error);

      Alert.alert(
        "Error",
        "Unable to open your gallery."
      );
    }
  };

  const speakMessage = (text) => {
    if (!text) return;

    Speech.stop();

    Speech.speak(text, {
      language: "en-US",
      rate: 0.9,
      pitch: 1,
    });
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === "user";

    return (
      <View
        style={[
          styles.messageRow,
          isUser
            ? styles.userRow
            : styles.assistantRow,
        ]}
      >
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Text style={styles.aiAvatarText}>D</Text>
          </View>
        )}

        <View
          style={[
            styles.messageBubble,
            isUser
              ? styles.userBubble
              : styles.assistantBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser
                ? styles.userMessageText
                : styles.assistantMessageText,
            ]}
          >
            {item.text}
          </Text>

          {item.image && (
            <Image
              source={{ uri: item.image }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          )}

          {!isUser && item.text && (
            <TouchableOpacity
              style={styles.listenButton}
              onPress={() =>
                speakMessage(item.text)
              }
            >
              <Text style={styles.listenText}>
                🔊 Listen
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (showWelcome) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={BG}
        />

        <View style={styles.welcomeContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoLetter}>D</Text>
          </View>

          <Text style={styles.welcomeTitle}>
            Destiny AI
          </Text>

          <Text style={styles.welcomeSubtitle}>
            Your intelligent AI companion
          </Text>

          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>
              ✦ Powerful AI
            </Text>

            <Text style={styles.featureText}>
              Ask questions, write, code, learn,
              research and create.
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>
              ✦ Creative tools
            </Text>

            <Text style={styles.featureText}>
              Generate images and work with
              multimedia through your AI.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.startButton}
            onPress={() => setShowWelcome(false)}
          >
            <Text style={styles.startButtonText}>
              Get Started
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        !darkMode && styles.lightContainer,
      ]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={BG}
      />

      {/* HEADER */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={newChat}
        >
          <Text style={styles.headerIcon}>＋</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.modelSelector}
          onPress={() => setShowModels(true)}
        >
          <Text style={styles.modelName}>
            {selectedModel}
          </Text>

          <Text style={styles.arrow}>
            ▾
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowSettings(true)}
        >
          <Text style={styles.headerIcon}>☰</Text>
        </TouchableOpacity>
      </View>

      {/* CHAT */}

      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          styles.messagesContainer
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {/* THINKING */}

      {loading && (
        <View style={styles.thinking}>
          <ActivityIndicator
            size="small"
            color={GOLD}
          />

          <Text style={styles.thinkingText}>
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
        <View style={styles.inputArea}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={pickImage}
          >
            <Text style={styles.attachText}>
              ＋
            </Text>
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Message Destiny AI..."
            placeholderTextColor="#728096"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={4000}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!input.trim() || loading) &&
                styles.disabledSend,
            ]}
            onPress={sendMessage}
            disabled={
              !input.trim() || loading
            }
          >
            <Text style={styles.sendIcon}>
              ➤
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* MODEL MODAL */}

      <Modal
        visible={showModels}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setShowModels(false)
        }
      >
        <Pressable
          style={styles.modalBackground}
          onPress={() => setShowModels(false)}
        >
          <View style={styles.modelModal}>
            <Text style={styles.modalTitle}>
              Choose AI Model
            </Text>

            {[
              "Destiny AI",
              "Fast AI",
              "Creative AI",
              "Code AI",
              "Research AI",
            ].map((model) => (
              <TouchableOpacity
                key={model}
                style={styles.modelOption}
                onPress={() => {
                  setSelectedModel(model);
                  setShowModels(false);
                }}
              >
                <Text
                  style={[
                    styles.modelOptionText,
                    selectedModel === model &&
                      styles.selectedModel,
                  ]}
                >
                  {model}
                </Text>

                {selectedModel === model && (
                  <Text style={styles.check}>
                    ✓
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* SETTINGS */}

      <Modal
        visible={showSettings}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setShowSettings(false)
        }
      >
        <View style={styles.settingsOverlay}>
          <View style={styles.settingsPanel}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>
                Settings
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setShowSettings(false)
                }
              >
                <Text style={styles.closeButton}>
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.profileCard}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileLetter}>
                  D
                </Text>
              </View>

              <View>
                <Text style={styles.profileName}>
                  Destiny AI
                </Text>

                <Text style={styles.profileSub}>
                  AI Assistant
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setDarkMode(!darkMode)}
            >
              <Text style={styles.settingText}>
                🌙 Dark Mode
              </Text>

              <Text style={styles.settingValue}>
                {darkMode ? "ON" : "OFF"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={newChat}
            >
              <Text style={styles.settingText}>
                🗑 New Chat
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() =>
                Alert.alert(
                  "Destiny AI",
                  "Version 1.0.0"
                )
              }
            >
              <Text style={styles.settingText}>
                ℹ About
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  lightContainer: {
    backgroundColor: "#F5F7FA",
  },

  /* WELCOME */

  welcomeContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },

  logoCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: CARD,
    borderWidth: 2,
    borderColor: GOLD,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },

  logoLetter: {
    color: GOLD,
    fontSize: 48,
    fontWeight: "900",
  },

  welcomeTitle: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "900",
    textAlign: "center",
  },

  welcomeSubtitle: {
    color: "#8B98AA",
    textAlign: "center",
    fontSize: 15,
    marginTop: 8,
    marginBottom: 35,
  },

  featureCard: {
    backgroundColor: PANEL,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
  },

  featureTitle: {
    color: GOLD,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },

  featureText: {
    color: "#AAB5C5",
    fontSize: 14,
    lineHeight: 21,
  },

  startButton: {
    backgroundColor: GOLD,
    height: 55,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },

  startButtonText: {
    color: "#07111F",
    fontSize: 16,
    fontWeight: "900",
  },

  /* HEADER */

  header: {
    height: 66,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: BG,
  },

  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PANEL,
  },

  headerIcon: {
    color: "#FFFFFF",
    fontSize: 24,
  },

  modelSelector: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: PANEL,
  },

  modelName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  arrow: {
    color: GOLD,
    fontSize: 16,
    marginLeft: 7,
  },

  /* MESSAGES */

  messagesContainer: {
    padding: 16,
    paddingBottom: 25,
  },

  messageRow: {
    flexDirection: "row",
    marginBottom: 18,
    alignItems: "flex-start",
  },

  userRow: {
    justifyContent: "flex-end",
  },

  assistantRow: {
    justifyContent: "flex-start",
  },

  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#18263A",
    borderWidth: 1,
    borderColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  aiAvatarText: {
    color: GOLD,
    fontWeight: "900",
  },

  messageBubble: {
    maxWidth: "82%",
    padding: 14,
    borderRadius: 19,
  },

  userBubble: {
    backgroundColor: "#1748A5",
    borderBottomRightRadius: 5,
  },

  assistantBubble: {
    backgroundColor: PANEL,
    borderWidth: 1,
    borderColor: BORDER,
    borderBottomLeftRadius: 5,
  },

  messageText: {
    fontSize: 15,
    lineHeight: 23,
  },

  userMessageText: {
    color: "#FFFFFF",
  },

  assistantMessageText: {
    color: "#E4E9F0",
  },

  messageImage: {
    width: 230,
    height: 230,
    borderRadius: 14,
    marginTop: 10,
  },

  listenButton: {
    marginTop: 12,
  },

  listenText: {
    color: GOLD,
    fontSize: 12,
    fontWeight: "700",
  },

  /* THINKING */

  thinking: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },

  thinkingText: {
    color: "#8996A8",
    marginLeft: 9,
    fontSize: 12,
  },

  /* INPUT */

  inputArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: "#07101D",
  },

  attachButton: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },

  attachText: {
    color: GOLD,
    fontSize: 28,
  },

  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 24,
    paddingHorizontal: 17,
    paddingVertical: 12,
    color: "#FFFFFF",
    fontSize: 15,
  },

  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  disabledSend: {
    opacity: 0.4,
  },

  sendIcon: {
    color: "#07111F",
    fontSize: 21,
    fontWeight: "900",
  },

  /* MODEL MODAL */

  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },

  modelModal: {
    backgroundColor: PANEL,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 22,
    paddingBottom: 35,
  },

  modalTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 14,
  },

  modelOption: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  modelOptionText: {
    color: "#C5CFDC",
    fontSize: 15,
  },

  selectedModel: {
    color: GOLD,
    fontWeight: "800",
  },

  check: {
    color: GOLD,
    fontSize: 20,
  },

  /* SETTINGS */

  settingsOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },

  settingsPanel: {
    backgroundColor: PANEL,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 35,
  },

  settingsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },

  settingsTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },

  closeButton: {
    color: "#FFFFFF",
    fontSize: 20,
  },

  profileCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#18263A",
    borderWidth: 1,
    borderColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  profileLetter: {
    color: GOLD,
    fontSize: 23,
    fontWeight: "900",
  },

  profileName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  profileSub: {
    color: "#8794A7",
    marginTop: 3,
    fontSize: 12,
  },

  settingRow: {
    height: 55,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  settingText: {
    color: "#FFFFFF",
    fontSize: 15,
  },

  settingValue: {
    color: GOLD,
    fontWeight: "800",
    fontSize: 12,
  },
});