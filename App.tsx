import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import * as Speech from "expo-speech";

const BACKEND_URL =
  "https://vihbsfrwnslnmheowkhy.supabase.co/functions/v1/destiny-ai-chat";

type Message = {
  id: string;
  role: "user" | "assistant";
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
};

type ApiResponse = {
  success?: boolean;
  type?: string;
  reply?: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  url?: string;
  error?: string;
  model?: string;
};

const isImageRequest = (text: string): boolean => {
  return [
    "create an image",
    "generate an image",
    "make an image",
    "create image",
    "generate image",
    "draw",
    "create a picture",
    "generate a picture",
  ].some((phrase) =>
    text.toLowerCase().includes(phrase)
  );
};

const isVideoRequest = (text: string): boolean => {
  return [
    "create a video",
    "generate a video",
    "make a video",
    "create video",
    "generate video",
    "text to video",
    "animate this",
  ].some((phrase) =>
    text.toLowerCase().includes(phrase)
  );
};

const isMusicRequest = (text: string): boolean => {
  return [
    "create music",
    "generate music",
    "make music",
    "create a song",
    "generate a song",
    "make a song",
    "compose music",
  ].some((phrase) =>
    text.toLowerCase().includes(phrase)
  );
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text:
        "Hello! I'm Destiny AI. Ask me anything, or ask me to create an image, video, or music.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    const text = input.trim();

    if (!text || loading) {
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      text,
    };

    setMessages((previous) => [
      ...previous,
      userMessage,
    ]);

    setInput("");
    setLoading(true);

    try {
      let type = "chat";

      if (isImageRequest(text)) {
        type = "image";
      } else if (isVideoRequest(text)) {
        type = "video";
      } else if (isMusicRequest(text)) {
        type = "music";
      }

      const response = await fetch(
        BACKEND_URL,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            message: text,
            type,
          }),
        }
      );

      const data: ApiResponse =
        await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(
          data.error ||
            `Server error: ${response.status}`
        );
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text:
          data.reply ||
          "Your request has been completed.",
        imageUrl:
          data.imageUrl ||
          (data.type === "image"
            ? data.url
            : undefined),
        videoUrl:
          data.videoUrl ||
          (data.type === "video"
            ? data.url
            : undefined),
        audioUrl:
          data.audioUrl ||
          (data.type === "music"
            ? data.url
            : undefined),
      };

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);
    } catch (error) {
      console.log(
        "Destiny AI error:",
        error
      );

      setMessages((previous) => [
        ...previous,
        {
          id: (Date.now() + 2).toString(),
          role: "assistant",
          text:
            error instanceof Error
              ? error.message
              : "Unable to connect to Destiny AI.",
        },
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

      if (
        result.canceled ||
        !result.assets?.length
      ) {
        return;
      }

      const imageUri =
        result.assets[0].uri;

      setMessages((previous) => [
        ...previous,
        {
          id: Date.now().toString(),
          role: "user",
          text: "Image selected",
          imageUrl: imageUri,
        },
      ]);
    } catch (error) {
      console.log(
        "Image picker:",
        error
      );

      Alert.alert(
        "Error",
        "Unable to open the gallery."
      );
    }
  };

  const speak = (text?: string) => {
    if (!text) {
      return;
    }

    Speech.stop();

    Speech.speak(text, {
      language: "en-US",
      rate: 0.9,
    });
  };

  const clearChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: "assistant",
        text:
          "New conversation started. How can I help you?",
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#050B14"
      />

      {/* HEADER */}

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            Destiny AI
          </Text>

          <Text style={styles.subtitle}>
            Intelligent AI Assistant
          </Text>
        </View>

        <TouchableOpacity
          style={styles.newButton}
          onPress={clearChat}
        >
          <Text style={styles.newButtonText}>
            +
          </Text>
        </TouchableOpacity>
      </View>

      {/* CHAT */}

      <ScrollView
        style={styles.chat}
        contentContainerStyle={
          styles.chatContent
        }
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((message) => {
          const isUser =
            message.role === "user";

          return (
            <View
              key={message.id}
              style={[
                styles.messageRow,
                isUser
                  ? styles.userRow
                  : styles.aiRow,
              ]}
            >
              {!isUser && (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    D
                  </Text>
                </View>
              )}

              <View
                style={[
                  styles.bubble,
                  isUser
                    ? styles.userBubble
                    : styles.aiBubble,
                ]}
              >
                {message.text && (
                  <Text
                    style={[
                      styles.messageText,
                      isUser
                        ? styles.userText
                        : styles.aiText,
                    ]}
                  >
                    {message.text}
                  </Text>
                )}

                {/* IMAGE */}

                {message.imageUrl && (
                  <Image
                    source={{
                      uri: message.imageUrl,
                    }}
                    style={styles.image}
                  />
                )}

                {/* VIDEO URL */}

                {message.videoUrl && (
                  <View style={styles.mediaBox}>
                    <Text
                      style={styles.mediaTitle}
                    >
                      🎬 Video generated
                    </Text>

                    <Text
                      selectable
                      style={styles.mediaUrl}
                    >
                      {message.videoUrl}
                    </Text>
                  </View>
                )}

                {/* AUDIO URL */}

                {message.audioUrl && (
                  <View style={styles.mediaBox}>
                    <Text
                      style={styles.mediaTitle}
                    >
                      🎵 Music generated
                    </Text>

                    <Text
                      selectable
                      style={styles.mediaUrl}
                    >
                      {message.audioUrl}
                    </Text>
                  </View>
                )}

                {/* SPEAK */}

                {!isUser &&
                  message.text && (
                    <TouchableOpacity
                      style={
                        styles.listenButton
                      }
                      onPress={() =>
                        speak(message.text)
                      }
                    >
                      <Text
                        style={
                          styles.listenText
                        }
                      >
                        🔊 Listen
                      </Text>
                    </TouchableOpacity>
                  )}
              </View>
            </View>
          );
        })}

        {loading && (
          <View style={styles.thinking}>
            <ActivityIndicator
              color="#D4AF37"
              size="small"
            />

            <Text
              style={styles.thinkingText}
            >
              Destiny AI is thinking...
            </Text>
          </View>
        )}
      </ScrollView>

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
            style={styles.attach}
            onPress={pickImage}
          >
            <Text
              style={styles.attachText}
            >
              +
            </Text>
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Message Destiny AI..."
            placeholderTextColor="#718096"
            multiline
            maxLength={4000}
          />

          <TouchableOpacity
            style={[
              styles.send,
              (!input.trim() || loading) &&
                styles.disabled,
            ]}
            onPress={sendMessage}
            disabled={
              !input.trim() || loading
            }
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050B14",
  },

  header: {
    height: 70,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#172235",
  },

  title: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "900",
  },

  subtitle: {
    color: "#7F8DA1",
    fontSize: 11,
    marginTop: 3,
  },

  newButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#111D2E",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#25364E",
  },

  newButtonText: {
    color: "#D4AF37",
    fontSize: 28,
  },

  chat: {
    flex: 1,
  },

  chatContent: {
    padding: 15,
    paddingBottom: 25,
  },

  messageRow: {
    flexDirection: "row",
    marginBottom: 17,
  },

  userRow: {
    justifyContent: "flex-end",
  },

  aiRow: {
    justifyContent: "flex-start",
  },

  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#101C2E",
    borderWidth: 1,
    borderColor: "#D4AF37",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  avatarText: {
    color: "#D4AF37",
    fontWeight: "900",
  },

  bubble: {
    maxWidth: "84%",
    padding: 14,
    borderRadius: 19,
  },

  userBubble: {
    backgroundColor: "#174EA6",
    borderBottomRightRadius: 5,
  },

  aiBubble: {
    backgroundColor: "#0D1828",
    borderWidth: 1,
    borderColor: "#1C2B40",
    borderBottomLeftRadius: 5,
  },

  messageText: {
    fontSize: 15,
    lineHeight: 23,
  },

  userText: {
    color: "#FFFFFF",
  },

  aiText: {
    color: "#E6EBF2",
  },

  image: {
    width: 245,
    height: 245,
    borderRadius: 14,
    marginTop: 10,
  },

  mediaBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#07111F",
    borderRadius: 12,
  },

  mediaTitle: {
    color: "#D4AF37",
    fontWeight: "800",
    marginBottom: 6,
  },

  mediaUrl: {
    color: "#9DAABC",
    fontSize: 11,
  },

  listenButton: {
    marginTop: 12,
  },

  listenText: {
    color: "#D4AF37",
    fontSize: 12,
    fontWeight: "700",
  },

  thinking: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    marginBottom: 10,
  },

  thinkingText: {
    color: "#8794A7",
    fontSize: 12,
    marginLeft: 8,
  },

  inputArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    backgroundColor: "#07101D",
    borderTopWidth: 1,
    borderTopColor: "#172235",
  },

  attach: {
    width: 45,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },

  attachText: {
    color: "#D4AF37",
    fontSize: 28,
  },

  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    backgroundColor: "#101C2E",
    borderWidth: 1,
    borderColor: "#22324A",
    borderRadius: 24,
    color: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },

  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#D4AF37",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  sendText: {
    color: "#07111F",
    fontSize: 21,
    fontWeight: "900",
  },

  disabled: {
    opacity: 0.4,
  },
});