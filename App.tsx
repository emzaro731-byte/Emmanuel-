import "react-native-url-polyfill/auto";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import Clipboard from "@react-native-clipboard/clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "./lib/supabase";

/* =========================================================
   TYPES
========================================================= */

type Screen =
  | "chat"
  | "studio"
  | "settings"
  | "profile";

type ChatMode =
  | "Chat"
  | "Code"
  | "Study"
  | "Write"
  | "Creative";

type Role = "user" | "assistant";

type Message = {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
};

type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
};

/* =========================================================
   CONSTANTS
========================================================= */

const STORAGE_KEY = "destiny_ai_conversations_v1";

/*
  IMPORTANT:
  Replace this with your real Supabase project URL.
  Example:
  https://abcdefghijkl.supabase.co
*/
const SUPABASE_URL = "YOUR_SUPABASE_URL";

const AI_FUNCTION_NAME = "destiny-ai";

const COLORS = {
  background: "#050816",
  surface: "#0B1020",
  surface2: "#10172B",
  surface3: "#151D35",
  border: "#202A46",
  primary: "#7C5CFF",
  primary2: "#9A82FF",
  text: "#FFFFFF",
  muted: "#9BA5C0",
  userBubble: "#6D4AFF",
  assistantBubble: "#10172B",
  danger: "#FF5C7A",
  success: "#32D583",
};

/* =========================================================
   HELPERS
========================================================= */

const makeId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const formatTime = (dateString: string): string => {
  const date = new Date(dateString);

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const createWelcomeConversation = (): Conversation => {
  const now = new Date().toISOString();

  return {
    id: makeId(),
    title: "New conversation",
    messages: [],
    createdAt: now,
    updatedAt: now,
    pinned: false,
  };
};

/* =========================================================
   ICON COMPONENT
========================================================= */

function Icon({
  name,
  size = 22,
  color = COLORS.text,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const icons: Record<string, string> = {
    menu: "☰",
    plus: "+",
    send: "➤",
    search: "⌕",
    settings: "⚙",
    user: "◉",
    chat: "▢",
    studio: "✦",
    copy: "▣",
    trash: "⌫",
    pin: "📌",
    close: "×",
    back: "‹",
    more: "⋯",
    logout: "↪",
    image: "▧",
    mic: "◉",
    sparkle: "✦",
    check: "✓",
    edit: "✎",
  };

  return (
    <Text
      style={{
        color,
        fontSize: size,
        fontWeight: "700",
      }}
    >
      {icons[name] ?? "•"}
    </Text>
  );
}

/* =========================================================
   MAIN APP
========================================================= */

export default function App() {
  const [screen, setScreen] = useState<Screen>("chat");

  const [conversations, setConversations] = useState<
    Conversation[]
  >([]);

  const [activeConversationId, setActiveConversationId] =
    useState<string | null>(null);

  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");

  const [sidebarVisible, setSidebarVisible] =
    useState(false);

  const [mode, setMode] = useState<ChatMode>("Chat");

  const [showModePicker, setShowModePicker] =
    useState(false);

  const [profileVisible, setProfileVisible] =
    useState(false);

  const [userEmail, setUserEmail] = useState("");

  const [studioPrompt, setStudioPrompt] =
    useState("");

  const [selectedImage, setSelectedImage] =
    useState<string | null>(null);

  const [darkMode] = useState(true);

  const listRef = useRef<FlatList<Message>>(null);

  const pulse = useRef(
    new Animated.Value(1)
  ).current;

  /* =======================================================
     LOAD SESSION
  ======================================================= */

  useEffect(() => {
    loadApp();
  }, []);

  const loadApp = async () => {
    try {
      const stored =
        await AsyncStorage.getItem(STORAGE_KEY);

      if (stored) {
        const parsed: Conversation[] =
          JSON.parse(stored);

        if (Array.isArray(parsed) && parsed.length) {
          setConversations(parsed);
          setActiveConversationId(parsed[0].id);
        } else {
          createConversation();
        }
      } else {
        createConversation();
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user?.email) {
        setUserEmail(session.user.email);
      }
    } catch (error) {
      console.log("Load error:", error);

      createConversation();
    }
  };

  /* =======================================================
     SAVE CONVERSATIONS
  ======================================================= */

  useEffect(() => {
    if (!conversations.length) {
      return;
    }

    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(conversations)
    ).catch((error) => {
      console.log("Save error:", error);
    });
  }, [conversations]);

  /* =======================================================
     AUTH LISTENER
  ======================================================= */

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserEmail(session?.user?.email ?? "");
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /* =======================================================
     ACTIVE CONVERSATION
  ======================================================= */

  const activeConversation = useMemo(() => {
    return (
      conversations.find(
        (conversation) =>
          conversation.id === activeConversationId
      ) ?? null
    );
  }, [
    conversations,
    activeConversationId,
  ]);

  const messages =
    activeConversation?.messages ?? [];

  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return [...conversations].sort(
        (a, b) =>
          Number(Boolean(b.pinned)) -
            Number(Boolean(a.pinned)) ||
          new Date(b.updatedAt).getTime() -
            new Date(a.updatedAt).getTime()
      );
    }

    return conversations.filter(
      (conversation) =>
        conversation.title
          .toLowerCase()
          .includes(query) ||
        conversation.messages.some((item) =>
          item.content
            .toLowerCase()
            .includes(query)
        )
    );
  }, [conversations, search]);

  /* =======================================================
     ANIMATION
  ======================================================= */

  useEffect(() => {
    if (!loading) {
      pulse.setValue(1);
      return;
    }

    const animation =
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.08,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ])
      );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [loading, pulse]);

  /* =======================================================
     CREATE CONVERSATION
  ======================================================= */

  const createConversation = () => {
    const conversation =
      createWelcomeConversation();

    setConversations((previous) => [
      conversation,
      ...previous,
    ]);

    setActiveConversationId(conversation.id);

    setScreen("chat");
    setSidebarVisible(false);
    setMessage("");
  };

  /* =======================================================
     UPDATE CONVERSATION
  ======================================================= */

  const updateConversation = (
    conversationId: string,
    updater: (
      conversation: Conversation
    ) => Conversation
  ) => {
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === conversationId
          ? updater(conversation)
          : conversation
      )
    );
  };

  /* =======================================================
     SEND MESSAGE
  ======================================================= */

  const sendMessage = async () => {
    const text = message.trim();

    if (!text || loading) {
      return;
    }

    let conversationId =
      activeConversationId;

    if (!conversationId) {
      const conversation =
        createWelcomeConversation();

      conversationId = conversation.id;

      setConversations((previous) => [
        conversation,
        ...previous,
      ]);

      setActiveConversationId(conversationId);
    }

    const userMessage: Message = {
      id: makeId(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessage("");
    setLoading(true);

    updateConversation(
      conversationId,
      (conversation) => ({
        ...conversation,
        title:
          conversation.messages.length === 0
            ? text.slice(0, 40)
            : conversation.title,
        messages: [
          ...conversation.messages,
          userMessage,
        ],
        updatedAt: new Date().toISOString(),
      })
    );

    try {
      if (
        !SUPABASE_URL ||
        SUPABASE_URL === "YOUR_SUPABASE_URL"
      ) {
        throw new Error(
          "Supabase URL has not been configured."
        );
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const history = [
        ...(activeConversation?.messages ?? []),
        userMessage,
      ].map((item) => ({
        role: item.role,
        content: item.content,
      }));

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/${AI_FUNCTION_NAME}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token
              ? {
                  Authorization: `Bearer ${session.access_token}`,
                }
              : {}),
          },
          body: JSON.stringify({
            message: text,
            prompt: text,
            mode,
            messages: history,
          }),
        }
      );

      const raw = await response.text();

      let data: any = {};

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = {
          response: raw,
        };
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Server error ${response.status}`
        );
      }

      const assistantText =
        data?.response ??
        data?.answer ??
        data?.message ??
        data?.content ??
        data?.text ??
        "I received your message, but no response was returned.";

      const assistantMessage: Message = {
        id: makeId(),
        role: "assistant",
        content: String(assistantText),
        createdAt: new Date().toISOString(),
      };

      updateConversation(
        conversationId,
        (conversation) => ({
          ...conversation,
          messages: [
            ...conversation.messages,
            assistantMessage,
          ],
          updatedAt: new Date().toISOString(),
        })
      );
    } catch (error: any) {
      console.log("AI error:", error);

      const errorMessage: Message = {
        id: makeId(),
        role: "assistant",
        content:
          error?.message ||
          "Sorry, I couldn't connect to Destiny AI right now.",
        createdAt: new Date().toISOString(),
      };

      updateConversation(
        conversationId,
        (conversation) => ({
          ...conversation,
          messages: [
            ...conversation.messages,
            errorMessage,
          ],
          updatedAt: new Date().toISOString(),
        })
      );
    } finally {
      setLoading(false);

      setTimeout(() => {
        listRef.current?.scrollToEnd({
          animated: true,
        });
      }, 150);
    }
  };

  /* =======================================================
     COPY
  ======================================================= */

  const copyMessage = (text: string) => {
    Clipboard.setString(text);

    Alert.alert(
      "Copied",
      "Message copied to clipboard."
    );
  };

  /* =======================================================
     DELETE CONVERSATION
  ======================================================= */

  const deleteConversation = (
    conversationId: string
  ) => {
    Alert.alert(
      "Delete conversation",
      "Are you sure you want to delete this conversation?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setConversations((previous) =>
              previous.filter(
                (item) =>
                  item.id !== conversationId
              )
            );

            if (
              activeConversationId ===
              conversationId
            ) {
              const remaining =
                conversations.filter(
                  (item) =>
                    item.id !== conversationId
                );

              if (remaining.length) {
                setActiveConversationId(
                  remaining[0].id
                );
              } else {
                createConversation();
              }
            }
          },
        },
      ]
    );
  };

  /* =======================================================
     PIN
  ======================================================= */

  const togglePin = (
    conversationId: string
  ) => {
    updateConversation(
      conversationId,
      (conversation) => ({
        ...conversation,
        pinned: !conversation.pinned,
      })
    );
  };

  /* =======================================================
     LOGOUT
  ======================================================= */

  const logout = async () => {
    try {
      await supabase.auth.signOut();

      setUserEmail("");

      setProfileVisible(false);

      Alert.alert(
        "Signed out",
        "You have been signed out."
      );
    } catch (error: any) {
      Alert.alert(
        "Logout failed",
        error?.message ||
          "Unable to sign out."
      );
    }
  };

  /* =======================================================
     IMAGE PICKER
  ======================================================= */

  const pickImage = () => {
    Alert.alert(
      "Image picker",
      "Native image picker can be added next using react-native-image-picker."
    );
  };

  /* =======================================================
     SPEECH
  ======================================================= */

  const speakMessage = (_text: string) => {
    Alert.alert(
      "Voice",
      "Native text-to-speech can be added next using react-native-tts."
    );
  };

  /* =======================================================
     MEDIA GENERATION
  ======================================================= */

  const generateMedia = async (
    type: "image" | "video" | "music"
  ) => {
    const prompt = studioPrompt.trim();

    if (!prompt) {
      Alert.alert(
        "Enter a prompt",
        "Describe what you want Destiny AI to create."
      );

      return;
    }

    if (
      !SUPABASE_URL ||
      SUPABASE_URL === "YOUR_SUPABASE_URL"
    ) {
      Alert.alert(
        "Supabase not configured",
        "Add your Supabase project URL first."
      );

      return;
    }

    try {
      setLoading(true);

      const functionName =
        type === "image"
          ? "generate-image"
          : type === "video"
          ? "generate-video"
          : "generate-music";

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/${functionName}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token
              ? {
                  Authorization: `Bearer ${session.access_token}`,
                }
              : {}),
          },
          body: JSON.stringify({
            prompt,
          }),
        }
      );

      const raw = await response.text();

      let data: any = {};

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = {
          response: raw,
        };
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Generation failed (${response.status})`
        );
      }

      Alert.alert(
        "Generation complete",
        data?.message ||
          `Your ${type} request was sent successfully.`
      );
    } catch (error: any) {
      Alert.alert(
        "Generation failed",
        error?.message ||
          "Unable to generate media."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     MESSAGE RENDER
  ======================================================= */

  const renderMessage = ({
    item,
  }: {
    item: Message;
  }) => {
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
          <Animated.View
            style={[
              styles.avatar,
              {
                transform: [
                  {
                    scale: loading
                      ? pulse
                      : 1,
                  },
                ],
              },
            ]}
          >
            <Text style={styles.avatarText}>
              ✦
            </Text>
          </Animated.View>
        )}

        <View
          style={[
            styles.messageContainer,
            isUser
              ? styles.userContainer
              : styles.assistantContainer,
          ]}
        >
          <View
            style={[
              styles.messageBubble,
              isUser
                ? styles.userBubble
                : styles.assistantBubble,
            ]}
          >
            <Text style={styles.messageText}>
              {item.content}
            </Text>
          </View>

          <View
            style={[
              styles.messageActions,
              isUser
                ? styles.userActions
                : styles.assistantActions,
            ]}
          >
            <Text style={styles.timeText}>
              {formatTime(item.createdAt)}
            </Text>

            {!isUser && (
              <>
                <TouchableOpacity
                  onPress={() =>
                    copyMessage(item.content)
                  }
                  style={styles.actionButton}
                >
                  <Icon
                    name="copy"
                    size={16}
                    color={COLORS.muted}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    speakMessage(item.content)
                  }
                  style={styles.actionButton}
                >
                  <Icon
                    name="mic"
                    size={15}
                    color={COLORS.muted}
                  />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    );
  };

  /* =======================================================
     EMPTY CHAT
  ======================================================= */

  const renderEmptyChat = () => {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.largeLogo}>
          <Text style={styles.largeLogoText}>
            ✦
          </Text>
        </View>

        <Text style={styles.welcomeTitle}>
          Welcome to Destiny AI
        </Text>

        <Text style={styles.welcomeSubtitle}>
          Your intelligent AI companion for
          conversation, coding, study, writing
          and creativity.
        </Text>

        <View style={styles.suggestionGrid}>
          {[
            {
              title: "Ask anything",
              text: "Explain quantum physics simply",
            },
            {
              title: "Write",
              text: "Write a professional email",
            },
            {
              title: "Code",
              text: "Build a React Native app",
            },
            {
              title: "Study",
              text: "Help me prepare for an exam",
            },
          ].map((item) => (
            <TouchableOpacity
              key={item.title}
              style={styles.suggestionCard}
              onPress={() => {
                setMessage(item.text);
              }}
            >
              <Text style={styles.suggestionTitle}>
                {item.title}
              </Text>

              <Text
                style={styles.suggestionText}
                numberOfLines={2}
              >
                {item.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  /* =======================================================
     CHAT SCREEN
  ======================================================= */

  const renderChatScreen = () => {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        {messages.length === 0 ? (
          <ScrollView
            contentContainerStyle={
              styles.emptyScroll
            }
            keyboardShouldPersistTaps="handled"
          >
            {renderEmptyChat()}
          </ScrollView>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={
              styles.messagesContent
            }
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({
                animated: false,
              })
            }
          />
        )}

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator
              size="small"
              color={COLORS.primary2}
            />

            <Text style={styles.loadingText}>
              Destiny AI is thinking...
            </Text>
          </View>
        )}

        <View style={styles.composerArea}>
          <TouchableOpacity
            style={styles.modeButton}
            onPress={() =>
              setShowModePicker(true)
            }
          >
            <Icon
              name="sparkle"
              size={17}
              color={COLORS.primary2}
            />

            <Text style={styles.modeText}>
              {mode}
            </Text>
          </TouchableOpacity>

          <View style={styles.composer}>
            <TouchableOpacity
              onPress={pickImage}
              style={styles.composerIcon}
            >
              <Icon
                name="image"
                size={21}
                color={COLORS.muted}
              />
            </TouchableOpacity>

            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Message Destiny AI..."
              placeholderTextColor="#68718A"
              multiline
              style={styles.textInput}
              onSubmitEditing={() => {
                if (Platform.OS !== "ios") {
                  sendMessage();
                }
              }}
            />

            <TouchableOpacity
              onPress={sendMessage}
              disabled={
                !message.trim() || loading
              }
              style={[
                styles.sendButton,
                (!message.trim() || loading) &&
                  styles.sendButtonDisabled,
              ]}
            >
              <Icon
                name="send"
                size={18}
                color={
                  message.trim() && !loading
                    ? "#FFFFFF"
                    : "#626A7D"
                }
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.disclaimer}>
            Destiny AI can make mistakes. Check
            important information.
          </Text>
        </View>
      </KeyboardAvoidingView>
    );
  };

  /* =======================================================
     STUDIO SCREEN
  ======================================================= */

  const renderStudio = () => {
    return (
      <ScrollView
        contentContainerStyle={styles.studioContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.studioHero}>
          <View style={styles.studioIcon}>
            <Text style={styles.studioIconText}>
              ✦
            </Text>
          </View>

          <Text style={styles.studioTitle}>
            Destiny Studio
          </Text>

          <Text style={styles.studioSubtitle}>
            Create images, videos and music with
            AI.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          Creation prompt
        </Text>

        <View style={styles.promptBox}>
          <TextInput
            value={studioPrompt}
            onChangeText={setStudioPrompt}
            multiline
            placeholder="Describe what you want to create..."
            placeholderTextColor="#68718A"
            style={styles.studioInput}
          />
        </View>

        {selectedImage && (
          <Image
            source={{
              uri: selectedImage,
            }}
            style={styles.selectedImage}
          />
        )}

        <TouchableOpacity
          style={styles.uploadButton}
          onPress={pickImage}
        >
          <Icon
            name="image"
            size={19}
            color={COLORS.text}
          />

          <Text style={styles.uploadText}>
            Add reference image
          </Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>
          Create
        </Text>

        <View style={styles.creationGrid}>
          <TouchableOpacity
            style={styles.creationCard}
            onPress={() =>
              generateMedia("image")
            }
          >
            <Text style={styles.creationIcon}>
              🖼
            </Text>

            <Text style={styles.creationTitle}>
              Image
            </Text>

            <Text style={styles.creationDescription}>
              Generate an AI image
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.creationCard}
            onPress={() =>
              generateMedia("video")
            }
          >
            <Text style={styles.creationIcon}>
              🎬
            </Text>

            <Text style={styles.creationTitle}>
              Video
            </Text>

            <Text style={styles.creationDescription}>
              Create an AI video
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.creationCard}
            onPress={() =>
              generateMedia("music")
            }
          >
            <Text style={styles.creationIcon}>
              ♪
            </Text>

            <Text style={styles.creationTitle}>
              Music
            </Text>

            <Text style={styles.creationDescription}>
              Generate AI music
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  /* =======================================================
     SETTINGS SCREEN
  ======================================================= */

  const renderSettings = () => {
    return (
      <ScrollView
        contentContainerStyle={
          styles.settingsContent
        }
      >
        <Text style={styles.pageTitle}>
          Settings
        </Text>

        <Text style={styles.pageSubtitle}>
          Manage your Destiny AI experience.
        </Text>

        <View style={styles.settingsCard}>
          <Text style={styles.settingsHeading}>
            Appearance
          </Text>

          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingTitle}>
                Dark mode
              </Text>

              <Text style={styles.settingDescription}>
                Destiny AI dark interface
              </Text>
            </View>

            <View style={styles.toggle}>
              <View style={styles.toggleDot} />
            </View>
          </View>
        </View>

        <View style={styles.settingsCard}>
          <Text style={styles.settingsHeading}>
            AI Mode
          </Text>

          {(
            [
              "Chat",
              "Code",
              "Study",
              "Write",
              "Creative",
            ] as ChatMode[]
          ).map((item) => (
            <TouchableOpacity
              key={item}
              style={styles.settingRow}
              onPress={() => setMode(item)}
            >
              <Text style={styles.settingTitle}>
                {item}
              </Text>

              {mode === item && (
                <Icon
                  name="check"
                  size={19}
                  color={COLORS.success}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.dangerButton}
          onPress={() =>
            Alert.alert(
              "Clear conversations",
              "Delete all locally stored conversations?",
              [
                {
                  text: "Cancel",
                  style: "cancel",
                },
                {
                  text: "Clear",
                  style: "destructive",
                  onPress: async () => {
                    await AsyncStorage.removeItem(
                      STORAGE_KEY
                    );

                    const conversation =
                      createWelcomeConversation();

                    setConversations([
                      conversation,
                    ]);

                    setActiveConversationId(
                      conversation.id
                    );
                  },
                },
              ]
            )
          }
        >
          <Icon
            name="trash"
            size={19}
            color={COLORS.danger}
          />

          <Text style={styles.dangerText}>
            Clear conversations
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  /* =======================================================
     PROFILE SCREEN
  ======================================================= */

  const renderProfile = () => {
    return (
      <ScrollView
        contentContainerStyle={
          styles.profileContent
        }
      >
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>
            {userEmail
              ? userEmail
                  .charAt(0)
                  .toUpperCase()
              : "D"}
          </Text>
        </View>

        <Text style={styles.profileName}>
          Destiny AI User
        </Text>

        <Text style={styles.profileEmail}>
          {userEmail || "Not signed in"}
        </Text>

        <View style={styles.profileCard}>
          <Text style={styles.settingsHeading}>
            Account
          </Text>

          <View style={styles.profileRow}>
            <Text style={styles.settingTitle}>
              Email
            </Text>

            <Text
              style={styles.profileValue}
              numberOfLines={1}
            >
              {userEmail || "—"}
            </Text>
          </View>
        </View>

        {userEmail && (
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={logout}
          >
            <Icon
              name="logout"
              size={19}
              color={COLORS.danger}
            />

            <Text style={styles.logoutText}>
              Sign out
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  };

  /* =======================================================
     SIDEBAR
  ======================================================= */

  const renderSidebar = () => {
    return (
      <Modal
        visible={sidebarVisible}
        animationType="slide"
        transparent
        onRequestClose={() =>
          setSidebarVisible(false)
        }
      >
        <View style={styles.sidebarOverlay}>
          <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
              <View style={styles.brandRow}>
                <View style={styles.smallLogo}>
                  <Text style={styles.smallLogoText}>
                    ✦
                  </Text>
                </View>

                <Text style={styles.brandText}>
                  Destiny AI
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  setSidebarVisible(false)
                }
              >
                <Icon
                  name="close"
                  size={27}
                  color={COLORS.text}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.newChatButton}
              onPress={createConversation}
            >
              <Icon
                name="plus"
                size={21}
                color="#FFFFFF"
              />

              <Text style={styles.newChatText}>
                New chat
              </Text>
            </TouchableOpacity>

            <View style={styles.searchBox}>
              <Icon
                name="search"
                size={21}
                color={COLORS.muted}
              />

              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search chats"
                placeholderTextColor="#68718A"
                style={styles.searchInput}
              />
            </View>

            <Text style={styles.sidebarLabel}>
              Conversations
            </Text>

            <FlatList
              data={filteredConversations}
              keyExtractor={(item) => item.id}
              contentContainerStyle={
                styles.conversationList
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.conversationItem,
                    item.id ===
                      activeConversationId &&
                      styles.conversationActive,
                  ]}
                  onPress={() => {
                    setActiveConversationId(
                      item.id
                    );

                    setScreen("chat");

                    setSidebarVisible(false);
                  }}
                  onLongPress={() =>
                    togglePin(item.id)
                  }
                >
                  <Icon
                    name="chat"
                    size={18}
                    color={COLORS.muted}
                  />

                  <View
                    style={
                      styles.conversationInfo
                    }
                  >
                    <Text
                      style={
                        styles.conversationTitle
                      }
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>

                    <Text
                      style={
                        styles.conversationPreview
                      }
                      numberOfLines={1}
                    >
                      {item.messages.length
                        ? item.messages[
                            item.messages.length -
                              1
                          ].content
                        : "New conversation"}
                    </Text>
                  </View>

                  {item.pinned && (
                    <Icon
                      name="pin"
                      size={14}
                      color={COLORS.primary2}
                    />
                  )}

                  <TouchableOpacity
                    onPress={() =>
                      deleteConversation(
                        item.id
                      )
                    }
                  >
                    <Icon
                      name="trash"
                      size={16}
                      color={COLORS.muted}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text
                  style={
                    styles.emptyConversationText
                  }
                >
                  No conversations found.
                </Text>
              }
            />
          </View>
        </View>
      </Modal>
    );
  };

  /* =======================================================
     MODE MODAL
  ======================================================= */

  const renderModeModal = () => {
    return (
      <Modal
        visible={showModePicker}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setShowModePicker(false)
        }
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() =>
            setShowModePicker(false)
          }
        >
          <Pressable
            style={styles.modeModal}
            onPress={(event) =>
              event.stopPropagation()
            }
          >
            <Text style={styles.modeModalTitle}>
              Choose AI mode
            </Text>

            {(
              [
                "Chat",
                "Code",
                "Study",
                "Write",
                "Creative",
              ] as ChatMode[]
            ).map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.modeOption,
                  mode === item &&
                    styles.modeOptionActive,
                ]}
                onPress={() => {
                  setMode(item);
                  setShowModePicker(false);
                }}
              >
                <Text
                  style={[
                    styles.modeOptionText,
                    mode === item &&
                      styles.modeOptionTextActive,
                  ]}
                >
                  {item}
                </Text>

                {mode === item && (
                  <Icon
                    name="check"
                    size={19}
                    color={COLORS.primary2}
                  />
                )}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  /* =======================================================
     PROFILE MODAL
  ======================================================= */

  const renderProfileModal = () => {
    return (
      <Modal
        visible={profileVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setProfileVisible(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.profileModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Profile
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setProfileVisible(false)
                }
              >
                <Icon
                  name="close"
                  size={27}
                  color={COLORS.text}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.modalAvatar}>
              <Text style={styles.modalAvatarText}>
                {userEmail
                  ? userEmail
                      .charAt(0)
                      .toUpperCase()
                  : "D"}
              </Text>
            </View>

            <Text style={styles.modalProfileName}>
              Destiny AI User
            </Text>

            <Text
              style={styles.modalProfileEmail}
              numberOfLines={1}
            >
              {userEmail ||
                "No email account connected"}
            </Text>

            <TouchableOpacity
              style={styles.profileMenuButton}
              onPress={() => {
                setProfileVisible(false);
                setScreen("profile");
              }}
            >
              <Icon
                name="user"
                size={19}
                color={COLORS.primary2}
              />

              <Text style={styles.profileMenuText}>
                View profile
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileMenuButton}
              onPress={() => {
                setProfileVisible(false);
                setScreen("settings");
              }}
            >
              <Icon
                name="settings"
                size={19}
                color={COLORS.primary2}
              />

              <Text style={styles.profileMenuText}>
                Settings
              </Text>
            </TouchableOpacity>

            {userEmail && (
              <TouchableOpacity
                style={styles.profileLogout}
                onPress={logout}
              >
                <Icon
                  name="logout"
                  size={19}
                  color={COLORS.danger}
                />

                <Text style={styles.profileLogoutText}>
                  Sign out
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  /* =======================================================
     HEADER
  ======================================================= */

  const getScreenTitle = () => {
    if (screen === "studio") {
      return "Studio";
    }

    if (screen === "settings") {
      return "Settings";
    }

    if (screen === "profile") {
      return "Profile";
    }

    return activeConversation?.title ||
      "Destiny AI";
  };

  /* =======================================================
     MAIN RENDER
  ======================================================= */

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        darkMode && styles.darkSafeArea,
      ]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.background}
      />

      <View style={styles.app}>
        {/* HEADER */}

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              if (screen === "chat") {
                setSidebarVisible(true);
              } else {
                setScreen("chat");
              }
            }}
          >
            <Icon
              name={
                screen === "chat"
                  ? "menu"
                  : "back"
              }
              size={24}
              color={COLORS.text}
            />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text
              style={styles.headerTitle}
              numberOfLines={1}
            >
              {getScreenTitle()}
            </Text>

            {screen === "chat" && (
              <TouchableOpacity
                style={styles.headerMode}
                onPress={() =>
                  setShowModePicker(true)
                }
              >
                <Text style={styles.headerModeText}>
                  {mode}
                </Text>

                <Text
                  style={styles.headerChevron}
                >
                  ▾
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              if (screen === "chat") {
                createConversation();
              } else {
                setProfileVisible(true);
              }
            }}
          >
            <Icon
              name={
                screen === "chat"
                  ? "plus"
                  : "user"
              }
              size={23}
              color={COLORS.text}
            />
          </TouchableOpacity>
        </View>

        {/* CONTENT */}

        <View style={styles.content}>
          {screen === "chat" &&
            renderChatScreen()}

          {screen === "studio" &&
            renderStudio()}

          {screen === "settings" &&
            renderSettings()}

          {screen === "profile" &&
            renderProfile()}
        </View>

        {/* BOTTOM NAV */}

        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setScreen("chat")}
          >
            <Icon
              name="chat"
              size={21}
              color={
                screen === "chat"
                  ? COLORS.primary2
                  : COLORS.muted
              }
            />

            <Text
              style={[
                styles.navText,
                screen === "chat" &&
                  styles.navTextActive,
              ]}
            >
              Chat
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setScreen("studio")}
          >
            <Icon
              name="studio"
              size={21}
              color={
                screen === "studio"
                  ? COLORS.primary2
                  : COLORS.muted
              }
            />

            <Text
              style={[
                styles.navText,
                screen === "studio" &&
                  styles.navTextActive,
              ]}
            >
              Studio
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() =>
              setScreen("settings")
            }
          >
            <Icon
              name="settings"
              size={21}
              color={
                screen === "settings"
                  ? COLORS.primary2
                  : COLORS.muted
              }
            />

            <Text
              style={[
                styles.navText,
                screen === "settings" &&
                  styles.navTextActive,
              ]}
            >
              Settings
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() =>
              setScreen("profile")
            }
          >
            <Icon
              name="user"
              size={21}
              color={
                screen === "profile"
                  ? COLORS.primary2
                  : COLORS.muted
              }
            />

            <Text
              style={[
                styles.navText,
                screen === "profile" &&
                  styles.navTextActive,
              ]}
            >
              Profile
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderSidebar()}
      {renderModeModal()}
      {renderProfileModal()}
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  darkSafeArea: {
    backgroundColor: COLORS.background,
  },

  app: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    flex: 1,
  },

  /* HEADER */

  header: {
    height: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },

  headerButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
  },

  headerCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 10,
  },

  headerTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
    maxWidth: "85%",
  },

  headerMode: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },

  headerModeText: {
    color: COLORS.muted,
    fontSize: 11,
  },

  headerChevron: {
    color: COLORS.muted,
    fontSize: 12,
    marginLeft: 3,
  },

  /* EMPTY CHAT */

  emptyScroll: {
    flexGrow: 1,
  },

  emptyContainer: {
    flex: 1,
    minHeight: 560,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingVertical: 40,
  },

  largeLogo: {
    width: 78,
    height: 78,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#17112F",
    borderWidth: 1,
    borderColor: "#352B63",
    marginBottom: 22,
  },

  largeLogoText: {
    color: COLORS.primary2,
    fontSize: 42,
  },

  welcomeTitle: {
    color: COLORS.text,
    fontSize: 27,
    fontWeight: "800",
    textAlign: "center",
  },

  welcomeSubtitle: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 10,
    maxWidth: 360,
  },

  suggestionGrid: {
    width: "100%",
    marginTop: 30,
  },

  suggestionCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 15,
    marginBottom: 10,
  },

  suggestionTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 5,
  },

  suggestionText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
  },

  /* MESSAGES */

  messagesContent: {
    paddingHorizontal: 13,
    paddingVertical: 20,
    paddingBottom: 25,
  },

  messageRow: {
    flexDirection: "row",
    marginBottom: 19,
  },

  userRow: {
    justifyContent: "flex-end",
  },

  assistantRow: {
    justifyContent: "flex-start",
  },

  avatar: {
    width: 31,
    height: 31,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#17112F",
    borderWidth: 1,
    borderColor: "#3B2F6F",
    marginRight: 8,
    marginTop: 3,
  },

  avatarText: {
    color: COLORS.primary2,
    fontSize: 17,
  },

  messageContainer: {
    maxWidth: "83%",
  },

  userContainer: {
    alignItems: "flex-end",
  },

  assistantContainer: {
    alignItems: "flex-start",
  },

  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },

  userBubble: {
    backgroundColor: COLORS.userBubble,
    borderBottomRightRadius: 5,
  },

  assistantBubble: {
    backgroundColor: COLORS.assistantBubble,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 5,
  },

  messageText: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 22,
  },

  messageActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },

  userActions: {
    justifyContent: "flex-end",
  },

  assistantActions: {
    justifyContent: "flex-start",
  },

  timeText: {
    color: "#606A83",
    fontSize: 10,
    marginRight: 5,
  },

  actionButton: {
    padding: 5,
    marginHorizontal: 1,
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 8,
  },

  loadingText: {
    color: COLORS.muted,
    fontSize: 12,
    marginLeft: 8,
  },

  /* COMPOSER */

  composerArea: {
    paddingHorizontal: 10,
    paddingTop: 7,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },

  modeButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 7,
  },

  modeText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 5,
  },

  composer: {
    minHeight: 50,
    maxHeight: 135,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 19,
    paddingHorizontal: 7,
    paddingVertical: 6,
  },

  composerIcon: {
    width: 39,
    height: 39,
    alignItems: "center",
    justifyContent: "center",
  },

  textInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    maxHeight: 110,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },

  sendButton: {
    width: 39,
    height: 39,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },

  sendButtonDisabled: {
    backgroundColor: "#20263A",
  },

  disclaimer: {
    color: "#505A72",
    textAlign: "center",
    fontSize: 9,
    marginTop: 5,
  },

  /* BOTTOM NAV */

  bottomNav: {
    height: 65,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  navText: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 4,
  },

  navTextActive: {
    color: COLORS.primary2,
    fontWeight: "700",
  },

  /* SIDEBAR */

  sidebarOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
  },

  sidebar: {
    width: "87%",
    maxWidth: 390,
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop:
      Platform.OS === "android" ? 25 : 45,
    paddingHorizontal: 13,
  },

  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  smallLogo: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#17112F",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  smallLogoText: {
    color: COLORS.primary2,
    fontSize: 20,
  },

  brandText: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
  },

  newChatButton: {
    height: 47,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    marginBottom: 12,
  },

  newChatText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 8,
  },

  searchBox: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
  },

  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    marginLeft: 8,
  },

  sidebarLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 21,
    marginBottom: 9,
  },

  conversationList: {
    paddingBottom: 30,
  },

  conversationItem: {
    minHeight: 61,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 10,
    marginBottom: 5,
  },

  conversationActive: {
    backgroundColor: COLORS.surface2,
  },

  conversationInfo: {
    flex: 1,
    marginLeft: 9,
    marginRight: 7,
  },

  conversationTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
  },

  conversationPreview: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 3,
  },

  emptyConversationText: {
    color: COLORS.muted,
    textAlign: "center",
    marginTop: 30,
    fontSize: 13,
  },

  /* STUDIO */

  studioContent: {
    padding: 18,
    paddingBottom: 40,
  },

  studioHero: {
    alignItems: "center",
    paddingVertical: 15,
  },

  studioIcon: {
    width: 65,
    height: 65,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#17112F",
    borderWidth: 1,
    borderColor: "#352B63",
    marginBottom: 13,
  },

  studioIconText: {
    color: COLORS.primary2,
    fontSize: 34,
  },

  studioTitle: {
    color: COLORS.text,
    fontSize: 25,
    fontWeight: "800",
  },

  studioSubtitle: {
    color: COLORS.muted,
    fontSize: 13,
    textAlign: "center",
    marginTop: 7,
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 22,
    marginBottom: 9,
  },

  promptBox: {
    minHeight: 145,
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },

  studioInput: {
    flex: 1,
    minHeight: 120,
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 21,
    textAlignVertical: "top",
  },

  uploadButton: {
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 10,
  },

  uploadText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 8,
  },

  selectedImage: {
    width: "100%",
    height: 190,
    borderRadius: 15,
    marginTop: 10,
  },

  creationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  creationCard: {
    width: "31.5%",
    minHeight: 125,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    padding: 12,
  },

  creationIcon: {
    fontSize: 25,
    marginBottom: 9,
  },

  creationTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },

  creationDescription: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 5,
  },

  /* SETTINGS */

  settingsContent: {
    padding: 18,
    paddingBottom: 40,
  },

  pageTitle: {
    color: COLORS.text,
    fontSize: 27,
    fontWeight: "800",
  },

  pageSubtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 5,
    marginBottom: 20,
  },

  settingsCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 15,
    marginBottom: 15,
  },

  settingsHeading: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
    paddingTop: 15,
    paddingBottom: 5,
  },

  settingRow: {
    minHeight: 57,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#171E34",
  },

  settingTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
  },

  settingDescription: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 3,
  },

  toggle: {
    width: 45,
    height: 25,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    paddingHorizontal: 3,
  },

  toggleDot: {
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-end",
  },

  dangerButton: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#21121B",
    borderWidth: 1,
    borderColor: "#512033",
    borderRadius: 14,
  },

  dangerText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 8,
  },

  /* PROFILE */

  profileContent: {
    alignItems: "center",
    padding: 20,
  },

  profileAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
  },

  profileAvatarText: {
    color: "#FFFFFF",
    fontSize: 35,
    fontWeight: "800",
  },

  profileName: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 15,
  },

  profileEmail: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 5,
  },

  profileCard: {
    width: "100%",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 15,
    marginTop: 25,
  },

  profileRow: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  profileValue: {
    color: COLORS.muted,
    fontSize: 12,
    maxWidth: "55%",
  },

  logoutButton: {
    width: "100%",
    minHeight: 50,
    marginTop: 15,
    borderRadius: 14,
    backgroundColor: "#21121B",
    borderWidth: 1,
    borderColor: "#512033",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  logoutText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 8,
  },

  /* MODALS */

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.70)",
    justifyContent: "center",
    padding: 18,
  },

  modeModal: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 17,
  },

  modeModalTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 10,
  },

  modeOption: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 11,
    paddingHorizontal: 12,
  },

  modeOptionActive: {
    backgroundColor: COLORS.surface2,
  },

  modeOptionText: {
    color: COLORS.muted,
    fontSize: 14,
  },

  modeOptionTextActive: {
    color: COLORS.text,
    fontWeight: "700",
  },

  profileModal: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 22,
    padding: 20,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  modalTitle: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: "800",
  },

  modalAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 25,
  },

  modalAvatarText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
  },

  modalProfileName: {
    color: COLORS.text,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 12,
  },

  modalProfileEmail: {
    color: COLORS.muted,
    textAlign: "center",
    fontSize: 12,
    marginTop: 4,
  },

  profileMenuButton: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface2,
    borderRadius: 13,
    paddingHorizontal: 14,
    marginTop: 10,
  },

  profileMenuText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 10,
  },

  profileLogout: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#21121B",
    borderRadius: 13,
    marginTop: 15,
  },

  profileLogoutText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 8,
  },
});