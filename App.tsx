import React, { useState } from "react";

import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! 👋 I'm Destiny AI. How can I help you today?",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = () => {
    const text = input.trim();

    if (!text || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };

    setMessages((previous) => [...previous, userMessage]);

    setInput("");
    setLoading(true);

    // Temporary AI response for testing
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Destiny AI is working successfully! 🚀 Your real AI connection will be added next.",
      };

      setMessages((previous) => [...previous, aiMessage]);

      setLoading(false);
    }, 800);
  };

  const newChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: "assistant",
        content: "Hello! 👋 I'm Destiny AI. What would you like to do?",
      },
    ]);
  };

  const clearChat = () => {
    setMessages([]);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";

    return (
      <View
        style={[
          styles.messageRow,
          isUser ? styles.userRow : styles.aiRow,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.aiBubble,
          ]}
        >
          {!isUser && (
            <Text style={styles.aiName}>DESTINY AI</Text>
          )}

          <Text style={styles.messageText}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>D</Text>
        </View>

        <View style={styles.headerText}>
          <Text style={styles.title}>Destiny AI</Text>
          <Text style={styles.online}>● Online</Text>
        </View>

        <TouchableOpacity
          style={styles.newChatButton}
          onPress={newChat}
        >
          <Text style={styles.newChatText}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* CHAT */}
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.chatContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* LOADING */}
      {loading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            Destiny AI is thinking...
          </Text>
        </View>
      )}

      {/* CLEAR */}
      {messages.length > 0 && (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={clearChat}
        >
          <Text style={styles.clearText}>Clear Chat</Text>
        </TouchableOpacity>
      )}

      {/* INPUT */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask Destiny AI anything..."
            placeholderTextColor="#718096"
            value={input}
            onChangeText={setInput}
            multiline
          />

          <TouchableOpacity
            style={styles.sendButton}
            onPress={sendMessage}
          >
            <Text style={styles.sendText}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07111F",
  },

  header: {
    height: 72,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#14243A",
    backgroundColor: "#091827",
  },

  logo: {
    width: 45,
    height: 45,
    borderRadius: 23,
    textAlign: "center",
    textAlignVertical: "center",
    backgroundColor: "#D4AF37",
    color: "#07111F",
    fontSize: 25,
    fontWeight: "bold",
  },

  headerText: {
    flex: 1,
    marginLeft: 12,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "bold",
  },

  online: {
    color: "#22C55E",
    fontSize: 12,
    marginTop: 2,
  },

  newChatButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#10233D",
  },

  newChatText: {
    color: "#D4AF37",
    fontSize: 28,
  },

  chatContainer: {
    padding: 16,
    paddingBottom: 20,
  },

  messageRow: {
    marginVertical: 7,
    flexDirection: "row",
  },

  userRow: {
    justifyContent: "flex-end",
  },

  aiRow: {
    justifyContent: "flex-start",
  },

  messageBubble: {
    maxWidth: "82%",
    padding: 14,
    borderRadius: 18,
  },

  userBubble: {
    backgroundColor: "#D4AF37",
    borderBottomRightRadius: 4,
  },

  aiBubble: {
    backgroundColor: "#10233D",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#1C3552",
  },

  aiName: {
    color: "#D4AF37",
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 6,
  },

  messageText: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 22,
  },

  loadingContainer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },

  loadingText: {
    color: "#AAB7C4",
    fontSize: 13,
    fontStyle: "italic",
  },

  clearButton: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },

  clearText: {
    color: "#718096",
    fontSize: 13,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#14243A",
    backgroundColor: "#091827",
  },

  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    backgroundColor: "#10233D",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    color: "#FFFFFF",
    fontSize: 16,
  },

  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginLeft: 10,
    backgroundColor: "#D4AF37",
    justifyContent: "center",
    alignItems: "center",
  },

  sendText: {
    color: "#07111F",
    fontSize: 22,
    fontWeight: "bold",
  },
});