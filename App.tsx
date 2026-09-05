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
  Clipboard,
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

import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "./lib/supabase";


/* =========================================================
   TYPES
========================================================= */

type Screen =
  | "auth"
  | "chat"
  | "studio"
  | "settings"
  | "profile";

type AuthMode =
  | "login"
  | "signup";

type AiMode =
  | "Chat"
  | "Code"
  | "Study"
  | "Write"
  | "Creative";

type MediaType =
  | "image"
  | "video"
  | "music";

type MessageRole =
  | "user"
  | "assistant";

type Message = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  imageUrl?: string;
};

type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
};


/* =========================================================
   CONSTANTS
========================================================= */

const STORAGE_KEY =
  "destiny_ai_conversations_v1";

const SUPABASE_URL =
  "YOUR_SUPABASE_URL";


const COLORS = {
  background: "#050816",
  surface: "#0C1224",
  surfaceLight: "#121A31",
  border: "#202B48",

  primary: "#7C5CFF",
  primaryDark: "#5638D9",

  blue: "#2D8CFF",
  cyan: "#22D3EE",

  gold: "#F6C453",

  text: "#FFFFFF",
  textSecondary: "#9AA6C5",
  textMuted: "#64708E",

  userBubble: "#6D4AFF",
  aiBubble: "#121A2D",

  success: "#22C55E",
  danger: "#EF4444",
};


/* =========================================================
   SIMPLE NATIVE ICON
   No Expo icons required
========================================================= */

function Icon({
  name,
  size = 22,
  color = "#FFFFFF",
}: {
  name: string;
  size?: number;
  color?: string;
}) {

  const icons: Record<string, string> = {
    menu: "☰",
    close: "×",
    person: "●",
    sparkles: "✦",
    search: "⌕",
    add: "+",
    trash: "⌫",
    bookmark: "★",
    bookmarkOutline: "☆",
    chat: "▰",
    chats: "▱",
    settings: "⚙",
    create: "✎",
    code: "</>",
    school: "🎓",
    image: "▧",
    video: "▶",
    music: "♫",
    arrowUp: "↑",
    copy: "▣",
    volume: "🔊",
    chevron: "›",
    moon: "☾",
    brain: "♧",
    shield: "✓",
    info: "ⓘ",
    logout: "↪",
  };

  return (
    <Text
      style={{
        fontSize: size,
        color,
        lineHeight: size + 3,
        fontWeight: "700",
      }}
    >
      {icons[name] || "•"}
    </Text>
  );
}


/* =========================================================
   APP
========================================================= */

export default function App() {

  const [loading, setLoading] =
    useState(true);

  const [screen, setScreen] =
    useState<Screen>("auth");

  const [authMode, setAuthMode] =
    useState<AuthMode>("login");

  const [session, setSession] =
    useState<any>(null);


  /* =======================================================
     CHAT STATE
  ======================================================= */

  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [activeConversationId, setActiveConversationId] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState("");

  const [aiMode, setAiMode] =
    useState<AiMode>("Chat");

  const [sending, setSending] =
    useState(false);

  const [sidebarVisible, setSidebarVisible] =
    useState(false);

  const [searchText, setSearchText] =
    useState("");

  const [profileVisible, setProfileVisible] =
    useState(false);


  /* =======================================================
     AUTH
  ======================================================= */

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [authLoading, setAuthLoading] =
    useState(false);


  /* =======================================================
     STUDIO
  ======================================================= */

  const [studioPrompt, setStudioPrompt] =
    useState("");

  const [studioLoading, setStudioLoading] =
    useState(false);

  const [selectedImage, setSelectedImage] =
    useState<string | null>(null);


  /* =======================================================
     ANIMATION
  ======================================================= */

  const fadeAnim =
    useRef(new Animated.Value(0)).current;


  /* =======================================================
     INITIALIZE
  ======================================================= */

  useEffect(() => {

    loadApp();

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, newSession) => {

          setSession(newSession);

          if (newSession) {
            setScreen("chat");
          } else {
            setScreen("auth");
          }

        }
      );

    return () =>
      subscription.unsubscribe();

  }, []);


  async function loadApp() {

    try {

      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      setSession(session);

      if (session) {
        setScreen("chat");
      }

      await loadConversations();

      Animated.timing(
        fadeAnim,
        {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }
      ).start();

    } catch (error) {

      console.log(error);

    } finally {

      setLoading(false);

    }

  }


  /* =======================================================
     LOCAL STORAGE
  ======================================================= */

  async function loadConversations() {

    try {

      const saved =
        await AsyncStorage.getItem(
          STORAGE_KEY
        );

      if (saved) {

        const data =
          JSON.parse(saved);

        setConversations(data);

        if (data.length > 0) {

          setActiveConversationId(
            data[0].id
          );

        }

      }

    } catch (error) {

      console.log(
        "Error loading conversations:",
        error
      );

    }

  }


  async function saveConversations(
    data: Conversation[]
  ) {

    try {

      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
      );

    } catch (error) {

      console.log(
        "Error saving conversations:",
        error
      );

    }

  }


  useEffect(() => {

    saveConversations(
      conversations
    );

  }, [conversations]);


  /* =======================================================
     ACTIVE CONVERSATION
  ======================================================= */

  const activeConversation =
    useMemo(() => {

      return conversations.find(
        conversation =>
          conversation.id ===
          activeConversationId
      );

    }, [
      conversations,
      activeConversationId,
    ]);


  /* =======================================================
     CREATE CHAT
  ======================================================= */

  function createNewChat() {

    const newConversation:
      Conversation = {

      id:
        Date.now().toString(),

      title:
        "New Conversation",

      messages: [],

      createdAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString(),

      pinned: false,
    };


    setConversations(
      previous => [
        newConversation,
        ...previous,
      ]
    );

    setActiveConversationId(
      newConversation.id
    );

    setSidebarVisible(false);

    setScreen("chat");

  }


  /* =======================================================
     DELETE
  ======================================================= */

  function deleteConversation(
    id: string
  ) {

    Alert.alert(
      "Delete Conversation",
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

            setConversations(
              previous =>
                previous.filter(
                  conversation =>
                    conversation.id !== id
                )
            );

            if (
              activeConversationId === id
            ) {

              setActiveConversationId(
                null
              );

            }

          },
        },
      ]
    );

  }


  /* =======================================================
     PIN
  ======================================================= */

  function togglePin(
    id: string
  ) {

    setConversations(
      previous =>
        previous.map(
          conversation => {

            if (
              conversation.id === id
            ) {

              return {
                ...conversation,
                pinned:
                  !conversation.pinned,
              };

            }

            return conversation;

          }
        )
    );

  }


  /* =======================================================
     AUTH
  ======================================================= */

  async function handleAuth() {

    if (
      !email.trim() ||
      !password.trim()
    ) {

      Alert.alert(
        "Missing Information",
        "Please enter your email and password."
      );

      return;

    }


    setAuthLoading(true);


    try {

      if (
        authMode === "signup"
      ) {

        const {
          error,
        } =
          await supabase.auth.signUp({
            email:
              email.trim(),
            password,
          });

        if (error)
          throw error;


        Alert.alert(
          "Account Created",
          "Your Destiny AI account has been created."
        );

      } else {

        const {
          error,
        } =
          await supabase.auth
            .signInWithPassword({
              email:
                email.trim(),
              password,
            });

        if (error)
          throw error;

      }

    } catch (error: any) {

      Alert.alert(
        "Authentication Error",
        error.message ||
          "Something went wrong."
      );

    } finally {

      setAuthLoading(false);

    }

  }


  /* =======================================================
     LOGOUT
  ======================================================= */

  async function logout() {

    Alert.alert(
      "Logout",
      "Do you want to logout of Destiny AI?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },

        {
          text: "Logout",
          style: "destructive",

          onPress:
            async () => {

              await supabase.auth.signOut();

              setProfileVisible(false);

            },
        },
      ]
    );

  }


  /* =======================================================
     SEND MESSAGE
  ======================================================= */

  async function sendMessage() {

    const text =
      message.trim();

    if (!text || sending)
      return;


    let conversationId =
      activeConversationId;


    if (!conversationId) {

      const newConversation:
        Conversation = {

        id:
          Date.now().toString(),

        title:
          text.slice(0, 35),

        messages: [],

        createdAt:
          new Date().toISOString(),

        updatedAt:
          new Date().toISOString(),

        pinned: false,
      };


      setConversations(
        previous => [
          newConversation,
          ...previous,
        ]
      );

      setActiveConversationId(
        newConversation.id
      );

      conversationId =
        newConversation.id;

    }


    const userMessage:
      Message = {

      id:
        `user-${Date.now()}`,

      role:
        "user",

      content:
        text,

      createdAt:
        new Date().toISOString(),
    };


    setMessage("");

    setSending(true);


    setConversations(
      previous =>
        previous.map(
          conversation => {

            if (
              conversation.id !==
              conversationId
            ) {
              return conversation;
            }


            const newTitle =
              conversation.messages.length === 0
                ? text.slice(0, 35)
                : conversation.title;


            return {

              ...conversation,

              title:
                newTitle,

              messages: [
                ...conversation.messages,
                userMessage,
              ],

              updatedAt:
                new Date().toISOString(),
            };

          }
        )
    );


    try {

      const response =
        await fetch(
          `${SUPABASE_URL}/functions/v1/destiny-ai`,
          {
            method:
              "POST",

            headers: {

              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${
                  session?.access_token || ""
                }`,
            },

            body:
              JSON.stringify({

                message:
                  text,

                mode:
                  aiMode,

                conversation_id:
                  conversationId,
              }),
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.error ||
            "AI request failed"
        );

      }


      const aiText =
        data.response ||
        data.message ||
        "Sorry, I could not generate a response.";


      const assistantMessage:
        Message = {

        id:
          `ai-${Date.now()}`,

        role:
          "assistant",

        content:
          aiText,

        createdAt:
          new Date().toISOString(),
      };


      setConversations(
        previous =>
          previous.map(
            conversation => {

              if (
                conversation.id !==
                conversationId
              ) {
                return conversation;
              }


              return {

                ...conversation,

                messages: [
                  ...conversation.messages,
                  assistantMessage,
                ],

                updatedAt:
                  new Date().toISOString(),
              };

            }
          )
      );


    } catch (error: any) {

      const errorMessage:
        Message = {

        id:
          `error-${Date.now()}`,

        role:
          "assistant",

        content:
          `⚠️ ${
            error.message ||
            "Unable to connect to Destiny AI."
          }`,

        createdAt:
          new Date().toISOString(),
      };


      setConversations(
        previous =>
          previous.map(
            conversation =>
              conversation.id ===
              conversationId
                ? {

                    ...conversation,

                    messages: [
                      ...conversation.messages,
                      errorMessage,
                    ],
                  }

                : conversation
          )
      );


    } finally {

      setSending(false);

    }

  }


  /* =======================================================
     COPY
  ======================================================= */

  function copyMessage(
    text: string
  ) {

    Clipboard.setString(text);

    Alert.alert(
      "Copied",
      "Message copied to clipboard."
    );

  }


  /* =======================================================
     SPEECH
     Native fallback.
  ======================================================= */

  function speakMessage(
    text: string
  ) {

    Alert.alert(
      "Text to Speech",
      "Native text-to-speech is not installed yet."
    );

  }


  /* =======================================================
     IMAGE PICKER
     Native fallback.
  ======================================================= */

  async function pickImage() {

    Alert.alert(
      "Image Picker",
      "Native image picker is not installed yet."
    );

  }


  /* =======================================================
     GENERATE MEDIA
  ======================================================= */

  async function generateMedia(
    type: MediaType
  ) {

    if (!studioPrompt.trim()) {

      Alert.alert(
        "Enter a Prompt",
        "Describe what you want Destiny AI to create."
      );

      return;

    }


    setStudioLoading(true);


    try {

      let endpoint = "";

      if (
        type === "image"
      ) {

        endpoint =
          "generate-image";

      }

      if (
        type === "video"
      ) {

        endpoint =
          "generate-video";

      }

      if (
        type === "music"
      ) {

        endpoint =
          "generate-music";

      }


      const response =
        await fetch(
          `${SUPABASE_URL}/functions/v1/${endpoint}`,
          {

            method:
              "POST",

            headers: {

              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${
                  session?.access_token || ""
                }`,
            },

            body:
              JSON.stringify({

                prompt:
                  studioPrompt,
              }),
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.error ||
            "Generation failed"
        );

      }


      Alert.alert(
        "Generation Started 🚀",
        data.message ||
          "Your creation request was sent successfully."
      );


      setStudioPrompt("");


    } catch (error: any) {

      Alert.alert(
        "Generation Error",
        error.message ||
          "Something went wrong."
      );

    } finally {

      setStudioLoading(false);

    }

  }


  /* =======================================================
     FILTER
  ======================================================= */

  const filteredConversations =
    conversations
      .filter(
        conversation =>
          conversation.title
            .toLowerCase()
            .includes(
              searchText.toLowerCase()
            )
      )
      .sort(
        (a, b) =>
          Number(b.pinned) -
          Number(a.pinned)
      );


  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {

    return (

      <View
        style={styles.loadingScreen}
      >

        <StatusBar
          barStyle="light-content"
          backgroundColor={
            COLORS.background
          }
        />

        <View
          style={styles.logoLarge}
        >

          <Icon
            name="sparkles"
            size={42}
            color="#FFFFFF"
          />

        </View>

        <Text
          style={styles.loadingTitle}
        >
          DESTINY AI
        </Text>

        <Text
          style={styles.loadingSubtitle}
        >
          Your intelligent future
        </Text>

        <ActivityIndicator
          size="large"
          color={COLORS.primary}
          style={{
            marginTop: 30,
          }}
        />

      </View>

    );

  }


  /* =======================================================
     AUTH
  ======================================================= */

  if (
    screen === "auth"
  ) {

    return (

      <SafeAreaView
        style={styles.authContainer}
      >

        <StatusBar
          barStyle="light-content"
          backgroundColor={
            COLORS.background
          }
        />


        <ScrollView
          contentContainerStyle={
            styles.authScroll
          }
        >

          <View
            style={styles.authLogo}
          >

            <Icon
              name="sparkles"
              size={40}
              color="#FFFFFF"
            />

          </View>


          <Text
            style={styles.authTitle}
          >
            Destiny AI
          </Text>


          <Text
            style={styles.authSubtitle}
          >
            Your intelligent companion for
            creating, learning and building.
          </Text>


          <View
            style={styles.authCard}
          >

            <Text
              style={styles.authCardTitle}
            >

              {authMode === "login"
                ? "Welcome back"
                : "Create account"}

            </Text>


            <Text
              style={styles.authCardSubtitle}
            >

              {authMode === "login"
                ? "Login to continue to Destiny AI"
                : "Start your Destiny AI journey"}

            </Text>


            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={
                COLORS.textMuted
              }
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.authInput}
            />


            <TextInput
              value={password}
              onChangeText={
                setPassword
              }
              placeholder="Password"
              placeholderTextColor={
                COLORS.textMuted
              }
              secureTextEntry
              style={styles.authInput}
            />


            <TouchableOpacity
              onPress={handleAuth}
              disabled={authLoading}
              style={styles.authButton}
            >

              {authLoading ? (

                <ActivityIndicator
                  color="#FFFFFF"
                />

              ) : (

                <Text
                  style={
                    styles.authButtonText
                  }
                >

                  {authMode === "login"
                    ? "Login"
                    : "Create Account"}

                </Text>

              )}

            </TouchableOpacity>


            <TouchableOpacity
              onPress={() =>
                setAuthMode(
                  authMode === "login"
                    ? "signup"
                    : "login"
                )
              }
              style={styles.switchAuth}
            >

              <Text
                style={
                  styles.switchAuthText
                }
              >

                {authMode === "login"
                  ? "Don't have an account? "
                  : "Already have an account? "}

              </Text>

              <Text
                style={
                  styles.switchAuthLink
                }
              >

                {authMode === "login"
                  ? "Create Account"
                  : "Login"}

              </Text>

            </TouchableOpacity>

          </View>

        </ScrollView>

      </SafeAreaView>

    );

  }


  /* =======================================================
     MAIN
  ======================================================= */

  return (

    <SafeAreaView
      style={styles.container}
    >

      <StatusBar
        barStyle="light-content"
        backgroundColor={
          COLORS.background
        }
      />


      {/* HEADER */}

      <View
        style={styles.header}
      >

        <TouchableOpacity
          onPress={() =>
            setSidebarVisible(true)
          }
          style={styles.headerButton}
        >

          <Icon
            name="menu"
            size={25}
            color="#FFFFFF"
          />

        </TouchableOpacity>


        <TouchableOpacity
          onPress={() =>
            setScreen("chat")
          }
          style={styles.brand}
        >

          <View
            style={styles.brandIcon}
          >

            <Icon
              name="sparkles"
              size={17}
              color="#FFFFFF"
            />

          </View>

          <Text
            style={styles.brandText}
          >
            Destiny AI
          </Text>

        </TouchableOpacity>


        <TouchableOpacity
          onPress={() =>
            setProfileVisible(true)
          }
          style={styles.profileButton}
        >

          <Icon
            name="person"
            size={17}
            color="#FFFFFF"
          />

        </TouchableOpacity>

      </View>


      {/* CHAT */}

      {screen === "chat" && (

        <ChatScreen
          conversation={
            activeConversation
          }
          message={message}
          setMessage={setMessage}
          sending={sending}
          sendMessage={
            sendMessage
          }
          aiMode={aiMode}
          setAiMode={setAiMode}
          copyMessage={
            copyMessage
          }
          speakMessage={
            speakMessage
          }
          createNewChat={
            createNewChat
          }
          pickImage={
            pickImage
          }
        />

      )}


      {/* STUDIO */}

      {screen === "studio" && (

        <StudioScreen
          studioPrompt={
            studioPrompt
          }
          setStudioPrompt={
            setStudioPrompt
          }
          selectedImage={
            selectedImage
          }
          pickImage={
            pickImage
          }
          studioLoading={
            studioLoading
          }
          generateMedia={
            generateMedia
          }
        />

      )}


      {/* SETTINGS */}

      {screen === "settings" && (

        <SettingsScreen
          email={
            session?.user?.email
          }
        />

      )}


      {/* BOTTOM NAV */}

      <View
        style={styles.bottomNav}
      >

        <NavButton
          icon="chat"
          label="Chat"
          active={
            screen === "chat"
          }
          onPress={() =>
            setScreen("chat")
          }
        />

        <NavButton
          icon="create"
          label="Create"
          active={
            screen === "studio"
          }
          onPress={() =>
            setScreen("studio")
          }
        />

        <NavButton
          icon="settings"
          label="Settings"
          active={
            screen === "settings"
          }
          onPress={() =>
            setScreen("settings")
          }
        />

      </View>


      {/* SIDEBAR */}

      <Modal
        visible={
          sidebarVisible
        }
        transparent
        animationType="slide"
      >

        <View
          style={
            styles.sidebarOverlay
          }
        >

          <View
            style={styles.sidebar}
          >

            <View
              style={
                styles.sidebarHeader
              }
            >

              <Text
                style={
                  styles.sidebarTitle
                }
              >
                Conversations
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setSidebarVisible(
                    false
                  )
                }
              >

                <Icon
                  name="close"
                  size={30}
                  color="#FFFFFF"
                />

              </TouchableOpacity>

            </View>


            <TouchableOpacity
              onPress={
                createNewChat
              }
              style={
                styles.newChatButton
              }
            >

              <Icon
                name="add"
                size={24}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.newChatText
                }
              >
                New Chat
              </Text>

            </TouchableOpacity>


            <View
              style={styles.searchBox}
            >

              <Icon
                name="search"
                size={22}
                color={
                  COLORS.textMuted
                }
              />

              <TextInput
                value={searchText}
                onChangeText={
                  setSearchText
                }
                placeholder="Search chats"
                placeholderTextColor={
                  COLORS.textMuted
                }
                style={
                  styles.searchInput
                }
              />

            </View>


            <FlatList
              data={
                filteredConversations
              }
              keyExtractor={
                item => item.id
              }
              renderItem={({
                item,
              }) => (

                <TouchableOpacity
                  onPress={() => {

                    setActiveConversationId(
                      item.id
                    );

                    setScreen("chat");

                    setSidebarVisible(
                      false
                    );

                  }}
                  style={
                    styles.conversationItem
                  }
                >

                  <View
                    style={{
                      flex: 1,
                    }}
                  >

                    <Text
                      numberOfLines={1}
                      style={
                        styles.conversationTitle
                      }
                    >

                      {item.pinned
                        ? "★ "
                        : ""}

                      {item.title}

                    </Text>

                  </View>


                  <TouchableOpacity
                    onPress={() =>
                      togglePin(
                        item.id
                      )
                    }
                  >

                    <Icon
                      name={
                        item.pinned
                          ? "bookmark"
                          : "bookmarkOutline"
                      }
                      size={19}
                      color={
                        COLORS.gold
                      }
                    />

                  </TouchableOpacity>


                  <TouchableOpacity
                    onPress={() =>
                      deleteConversation(
                        item.id
                      )
                    }
                    style={{
                      marginLeft: 12,
                    }}
                  >

                    <Icon
                      name="trash"
                      size={19}
                      color={
                        COLORS.textMuted
                      }
                    />

                  </TouchableOpacity>

                </TouchableOpacity>

              )}

              ListEmptyComponent={

                <View
                  style={
                    styles.emptyHistory
                  }
                >

                  <Icon
                    name="chats"
                    size={42}
                    color={
                      COLORS.textMuted
                    }
                  />

                  <Text
                    style={
                      styles.emptyHistoryText
                    }
                  >
                    No conversations yet
                  </Text>

                </View>

              }

            />


            <View
              style={
                styles.sidebarFooter
              }
            >

              <Text
                style={
                  styles.sidebarEmail
                }
                numberOfLines={1}
              >

                {session?.user?.email ||
                  "Destiny AI User"}

              </Text>

            </View>

          </View>

        </View>

      </Modal>


      {/* PROFILE */}

      <Modal
        visible={
          profileVisible
        }
        transparent
        animationType="fade"
      >

        <Pressable
          style={
            styles.profileOverlay
          }
          onPress={() =>
            setProfileVisible(
              false
            )
          }
        >

          <Pressable
            style={
              styles.profileMenu
            }
          >

            <View
              style={
                styles.profileAvatarLarge
              }
            >

              <Icon
                name="person"
                size={24}
                color="#FFFFFF"
              />

            </View>


            <Text
              style={
                styles.profileEmail
              }
            >

              {session?.user?.email ||
                "Destiny AI User"}

            </Text>


            <ProfileOption
              icon="person"
              label="Profile"
              onPress={() => {

                setProfileVisible(
                  false
                );

                setScreen(
                  "profile"
                );

              }}
            />


            <ProfileOption
              icon="settings"
              label="Settings"
              onPress={() => {

                setProfileVisible(
                  false
                );

                setScreen(
                  "settings"
                );

              }}
            />


            <ProfileOption
              icon="logout"
              label="Logout"
              danger
              onPress={logout}
            />

          </Pressable>

        </Pressable>

      </Modal>

    </SafeAreaView>

  );

}


/* =========================================================
   CHAT SCREEN
========================================================= */

function ChatScreen({

  conversation,
  message,
  setMessage,
  sending,
  sendMessage,
  aiMode,
  setAiMode,
  copyMessage,
  speakMessage,
  createNewChat,
  pickImage,

}: any) {

  const modes: AiMode[] = [
    "Chat",
    "Code",
    "Study",
    "Write",
    "Creative",
  ];


  return (

    <KeyboardAvoidingView
      style={{
        flex: 1,
      }}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >

      <View
        style={
          styles.chatContainer
        }
      >


        {!conversation ||
        conversation.messages.length === 0 ? (

          <ScrollView
            contentContainerStyle={
              styles.welcomeContent
            }
          >

            <View
              style={
                styles.welcomeLogo
              }
            >

              <Icon
                name="sparkles"
                size={38}
                color="#FFFFFF"
              />

            </View>


            <Text
              style={
                styles.welcomeTitle
              }
            >
              How can I help you?
            </Text>


            <Text
              style={
                styles.welcomeSubtitle
              }
            >
              Ask Destiny AI anything.
              Create, learn, write,
              code and explore.
            </Text>


            <View
              style={
                styles.modeGrid
              }
            >

              <QuickAction
                icon="code"
                label="Code"
                onPress={() =>
                  setAiMode("Code")
                }
              />

              <QuickAction
                icon="school"
                label="Study"
                onPress={() =>
                  setAiMode("Study")
                }
              />

              <QuickAction
                icon="create"
                label="Write"
                onPress={() =>
                  setAiMode("Write")
                }
              />

              <QuickAction
                icon="sparkles"
                label="Create"
                onPress={() =>
                  setAiMode(
                    "Creative"
                  )
                }
              />

            </View>

          </ScrollView>

        ) : (

          <FlatList
            data={
              conversation.messages
            }
            keyExtractor={
              item => item.id
            }
            contentContainerStyle={
              styles.messagesList
            }
            renderItem={({
              item,
            }) => (

              <MessageBubble
                message={item}
                copyMessage={
                  copyMessage
                }
                speakMessage={
                  speakMessage
                }
              />

            )}
            ListFooterComponent={

              sending ? (

                <View
                  style={
                    styles.typingContainer
                  }
                >

                  <ActivityIndicator
                    color={
                      COLORS.primary
                    }
                  />

                  <Text
                    style={
                      styles.typingText
                    }
                  >
                    Destiny AI is thinking...
                  </Text>

                </View>

              ) : null

            }
          />

        )}


        {/* MODE SELECTOR */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.modeSelector
          }
        >

          {modes.map(mode => (

            <TouchableOpacity
              key={mode}
              onPress={() =>
                setAiMode(mode)
              }
              style={[
                styles.modeButton,

                aiMode === mode &&
                  styles.modeButtonActive,
              ]}
            >

              <Text
                style={[
                  styles.modeButtonText,

                  aiMode === mode &&
                    styles.modeButtonTextActive,
                ]}
              >
                {mode}
              </Text>

            </TouchableOpacity>

          ))}

        </ScrollView>


        {/* INPUT */}

        <View
          style={
            styles.inputArea
          }
        >

          <TouchableOpacity
            onPress={
              pickImage
            }
            style={
              styles.attachButton
            }
          >

            <Icon
              name="add"
              size={27}
              color={
                COLORS.textSecondary
              }
            />

          </TouchableOpacity>


          <TextInput
            value={message}
            onChangeText={
              setMessage
            }
            placeholder={
              `Message Destiny AI (${aiMode})`
            }
            placeholderTextColor={
              COLORS.textMuted
            }
            multiline
            style={
              styles.chatInput
            }
          />


          <TouchableOpacity
            onPress={
              sendMessage
            }
            disabled={
              !message.trim() ||
              sending
            }
            style={[
              styles.sendButton,

              (!message.trim() ||
                sending) &&
                styles.sendButtonDisabled,
            ]}
          >

            {sending ? (

              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />

            ) : (

              <Icon
                name="arrowUp"
                size={24}
                color="#FFFFFF"
              />

            )}

          </TouchableOpacity>

        </View>

      </View>

    </KeyboardAvoidingView>

  );

}


/* =========================================================
   MESSAGE
========================================================= */

function MessageBubble({

  message,
  copyMessage,
  speakMessage,

}: any) {

  const isUser =
    message.role ===
    "user";


  return (

    <View
      style={[
        styles.messageRow,

        isUser
          ? styles.userRow
          : styles.aiRow,
      ]}
    >

      {!isUser && (

        <View
          style={
            styles.aiAvatar
          }
        >

          <Icon
            name="sparkles"
            size={15}
            color="#FFFFFF"
          />

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
          style={
            styles.messageText
          }
        >
          {message.content}
        </Text>


        {!isUser && (

          <View
            style={
              styles.messageActions
            }
          >

            <TouchableOpacity
              onPress={() =>
                copyMessage(
                  message.content
                )
              }
            >

              <Icon
                name="copy"
                size={18}
                color={
                  COLORS.textSecondary
                }
              />

            </TouchableOpacity>


            <TouchableOpacity
              onPress={() =>
                speakMessage(
                  message.content
                )
              }
              style={{
                marginLeft: 16,
              }}
            >

              <Icon
                name="volume"
                size={18}
                color={
                  COLORS.textSecondary
                }
              />

            </TouchableOpacity>

          </View>

        )}

      </View>

    </View>

  );

}


/* =========================================================
   STUDIO
========================================================= */

function StudioScreen({

  studioPrompt,
  setStudioPrompt,
  selectedImage,
  pickImage,
  studioLoading,
  generateMedia,

}: any) {

  return (

    <ScrollView
      style={
        styles.studioContainer
      }
    >

      <Text
        style={
          styles.studioTitle
        }
      >
        Creation Studio
      </Text>


      <Text
        style={
          styles.studioSubtitle
        }
      >
        Create images, videos and
        music with artificial
        intelligence.
      </Text>


      <TextInput
        value={studioPrompt}
        onChangeText={
          setStudioPrompt
        }
        placeholder="Describe what you want to create..."
        placeholderTextColor={
          COLORS.textMuted
        }
        multiline
        style={
          styles.studioInput
        }
      />


      {selectedImage && (

        <View
          style={
            styles.selectedImageContainer
          }
        >

          <Image
            source={{
              uri: selectedImage,
            }}
            style={
              styles.selectedImage
            }
          />

        </View>

      )}


      <TouchableOpacity
        onPress={
          pickImage
        }
        style={
          styles.uploadImageButton
        }
      >

        <Icon
          name="image"
          size={23}
          color="#FFFFFF"
        />

        <Text
          style={
            styles.uploadImageText
          }
        >
          Upload Reference Image
        </Text>

      </TouchableOpacity>


      <StudioButton
        icon="image"
        title="Generate Image"
        subtitle="Create AI artwork"
        loading={
          studioLoading
        }
        onPress={() =>
          generateMedia(
            "image"
          )
        }
      />


      <StudioButton
        icon="video"
        title="Generate Video"
        subtitle="Turn your idea into video"
        loading={
          studioLoading
        }
        onPress={() =>
          generateMedia(
            "video"
          )
        }
      />


      <StudioButton
        icon="music"
        title="Generate Music"
        subtitle="Create AI music"
        loading={
          studioLoading
        }
        onPress={() =>
          generateMedia(
            "music"
          )
        }
      />

    </ScrollView>

  );

}


/* =========================================================
   SETTINGS
========================================================= */

function SettingsScreen({
  email,
}: any) {

  return (

    <ScrollView
      style={
        styles.settingsContainer
      }
    >

      <Text
        style={
          styles.settingsTitle
        }
      >
        Settings
      </Text>


      <SettingRow
        icon="person"
        title="Account"
        subtitle={
          email ||
          "Not logged in"
        }
      />


      <SettingRow
        icon="moon"
        title="Appearance"
        subtitle="Dark Mode"
      />


      <SettingRow
        icon="brain"
        title="AI Preferences"
        subtitle="Manage AI settings"
      />


      <SettingRow
        icon="brain"
        title="Memory"
        subtitle="Control what Destiny AI remembers"
      />


      <SettingRow
        icon="shield"
        title="Privacy"
        subtitle="Manage your privacy"
      />


      <SettingRow
        icon="info"
        title="About Destiny AI"
        subtitle="Version 2.0"
      />

    </ScrollView>

  );

}


/* =========================================================
   NAV BUTTON
========================================================= */

function NavButton({
  icon,
  label,
  active,
  onPress,
}: any) {

  return (

    <TouchableOpacity
      onPress={onPress}
      style={
        styles.navButton
      }
    >

      <Icon
        name={icon}
        size={22}
        color={
          active
            ? COLORS.primary
            : COLORS.textMuted
        }
      />

      <Text
        style={[
          styles.navLabel,

          active &&
            styles.navLabelActive,
        ]}
      >
        {label}
      </Text>

    </TouchableOpacity>

  );

}


/* =========================================================
   QUICK ACTION
========================================================= */

function QuickAction({
  icon,
  label,
  onPress,
}: any) {

  return (

    <TouchableOpacity
      onPress={onPress}
      style={
        styles.quickAction
      }
    >

      <Icon
        name={icon}
        size={27}
        color={
          COLORS.primary
        }
      />

      <Text
        style={
          styles.quickActionText
        }
      >
        {label}
      </Text>

    </TouchableOpacity>

  );

}


/* =========================================================
   STUDIO BUTTON
========================================================= */

function StudioButton({
  icon,
  title,
  subtitle,
  loading,
  onPress,
}: any) {

  return (

    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      style={
        styles.studioButton
      }
    >

      <View
        style={
          styles.studioIcon
        }
      >

        <Icon
          name={icon}
          size={25}
          color="#FFFFFF"
        />

      </View>


      <View
        style={{
          flex: 1,
        }}
      >

        <Text
          style={
            styles.studioButtonTitle
          }
        >
          {title}
        </Text>

        <Text
          style={
            styles.studioButtonSubtitle
          }
        >
          {subtitle}
        </Text>

      </View>


      {loading ? (

        <ActivityIndicator
          color={
            COLORS.primary
          }
        />

      ) : (

        <Icon
          name="chevron"
          size={27}
          color={
            COLORS.textMuted
          }
        />

      )}

    </TouchableOpacity>

  );

}


/* =========================================================
   SETTINGS ROW
========================================================= */

function SettingRow({
  icon,
  title,
  subtitle,
}: any) {

  return (

    <TouchableOpacity
      style={
        styles.settingRow
      }
    >

      <View
        style={
          styles.settingIcon
        }
      >

        <Icon
          name={icon}
          size={22}
          color={
            COLORS.primary
          }
        />

      </View>


      <View
        style={{
          flex: 1,
        }}
      >

        <Text
          style={
            styles.settingTitle
          }
        >
          {title}
        </Text>

        <Text
          style={
            styles.settingSubtitle
          }
        >
          {subtitle}
        </Text>

      </View>


      <Icon
        name="chevron"
        size={22}
        color={
          COLORS.textMuted
        }
      />

    </TouchableOpacity>

  );

}


/* =========================================================
   PROFILE OPTION
========================================================= */

function ProfileOption({
  icon,
  label,
  danger,
  onPress,
}: any) {

  return (

    <TouchableOpacity
      onPress={onPress}
      style={
        styles.profileOption
      }
    >

      <Icon
        name={icon}
        size={21}
        color={
          danger
            ? COLORS.danger
            : COLORS.text
        }
      />

      <Text
        style={[
          styles.profileOptionText,

          danger && {
            color:
              COLORS.danger,
          },
        ]}
      >
        {label}
      </Text>

    </TouchableOpacity>

  );

}


/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({

    container: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    loadingScreen: {
      flex: 1,
      backgroundColor:
        COLORS.background,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    logoLarge: {
      width: 90,
      height: 90,
      borderRadius: 30,
      backgroundColor:
        COLORS.primary,
      alignItems:
        "center",
      justifyContent:
        "center",
      elevation: 12,
    },

    loadingTitle: {
      color:
        COLORS.text,
      fontSize: 28,
      fontWeight: "900",
      letterSpacing: 3,
      marginTop: 20,
    },

    loadingSubtitle: {
      color:
        COLORS.textSecondary,
      marginTop: 8,
    },


    /* AUTH */

    authContainer: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    authScroll: {
      flexGrow: 1,
      padding: 25,
      justifyContent:
        "center",
    },

    authLogo: {
      width: 82,
      height: 82,
      borderRadius: 27,
      backgroundColor:
        COLORS.primary,
      alignItems:
        "center",
      justifyContent:
        "center",
      alignSelf:
        "center",
      marginBottom: 22,
    },

    authTitle: {
      color:
        COLORS.text,
      fontSize: 34,
      fontWeight: "900",
      textAlign:
        "center",
    },

    authSubtitle: {
      color:
        COLORS.textSecondary,
      textAlign:
        "center",
      fontSize: 15,
      lineHeight: 23,
      marginTop: 12,
      marginBottom: 35,
    },

    authCard: {
      backgroundColor:
        COLORS.surface,
      borderRadius: 28,
      padding: 24,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    authCardTitle: {
      color:
        COLORS.text,
      fontSize: 24,
      fontWeight: "800",
    },

    authCardSubtitle: {
      color:
        COLORS.textSecondary,
      marginTop: 8,
      marginBottom: 24,
    },

    authInput: {
      backgroundColor:
        COLORS.surfaceLight,
      color:
        COLORS.text,
      paddingHorizontal: 17,
      height: 56,
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      marginBottom: 14,
      fontSize: 16,
    },

    authButton: {
      backgroundColor:
        COLORS.primary,
      height: 56,
      borderRadius: 16,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginTop: 5,
    },

    authButtonText: {
      color:
        "#FFFFFF",
      fontSize: 16,
      fontWeight: "800",
    },

    switchAuth: {
      flexDirection:
        "row",
      justifyContent:
        "center",
      marginTop: 23,
    },

    switchAuthText: {
      color:
        COLORS.textSecondary,
    },

    switchAuthLink: {
      color:
        COLORS.primary,
      fontWeight:
        "800",
    },


    /* HEADER */

    header: {
      height: 65,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor:
        COLORS.border,
    },

    headerButton: {
      width: 42,
      height: 42,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    brand: {
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    brandIcon: {
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor:
        COLORS.primary,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 9,
    },

    brandText: {
      color:
        COLORS.text,
      fontWeight:
        "900",
      fontSize: 18,
    },

    profileButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor:
        COLORS.primaryDark,
      alignItems:
        "center",
      justifyContent:
        "center",
    },


    /* CHAT */

    chatContainer: {
      flex: 1,
    },

    messagesList: {
      padding: 16,
      paddingBottom: 20,
    },

    welcomeContent: {
      flexGrow: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      padding: 24,
    },

    welcomeLogo: {
      width: 76,
      height: 76,
      borderRadius: 26,
      backgroundColor:
        COLORS.primary,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginBottom: 22,
    },

    welcomeTitle: {
      color:
        COLORS.text,
      fontSize: 27,
      fontWeight:
        "900",
      textAlign:
        "center",
    },

    welcomeSubtitle: {
      color:
        COLORS.textSecondary,
      textAlign:
        "center",
      lineHeight: 22,
      marginTop: 12,
      maxWidth: 300,
    },

    modeGrid: {
      flexDirection:
        "row",
      flexWrap:
        "wrap",
      justifyContent:
        "space-between",
      marginTop: 32,
      width:
        "100%",
    },

    quickAction: {
      width:
        "47%",
      height: 105,
      backgroundColor:
        COLORS.surface,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 22,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginBottom: 15,
    },

    quickActionText: {
      color:
        COLORS.text,
      fontWeight:
        "700",
      marginTop: 9,
    },

    modeSelector: {
      paddingHorizontal: 15,
      paddingVertical: 8,
    },

    modeButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor:
        COLORS.surface,
      marginRight: 8,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    modeButtonActive: {
      backgroundColor:
        COLORS.primary,
      borderColor:
        COLORS.primary,
    },

    modeButtonText: {
      color:
        COLORS.textSecondary,
      fontSize: 13,
      fontWeight:
        "700",
    },

    modeButtonTextActive: {
      color:
        "#FFFFFF",
    },


    /* MESSAGE */

    messageRow: {
      flexDirection:
        "row",
      marginBottom: 18,
      alignItems:
        "flex-start",
    },

    userRow: {
      justifyContent:
        "flex-end",
    },

    aiRow: {
      justifyContent:
        "flex-start",
    },

    aiAvatar: {
      width: 32,
      height: 32,
      borderRadius: 11,
      backgroundColor:
        COLORS.primary,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 9,
      marginTop: 3,
    },

    messageBubble: {
      maxWidth:
        "82%",
      padding: 14,
      borderRadius: 20,
    },

    userBubble: {
      backgroundColor:
        COLORS.userBubble,
      borderBottomRightRadius: 6,
    },

    assistantBubble: {
      backgroundColor:
        COLORS.aiBubble,
      borderBottomLeftRadius: 6,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    messageText: {
      color:
        COLORS.text,
      fontSize: 15,
      lineHeight: 23,
    },

    messageActions: {
      flexDirection:
        "row",
      marginTop: 12,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor:
        COLORS.border,
    },

    typingContainer: {
      flexDirection:
        "row",
      alignItems:
        "center",
      padding: 15,
    },

    typingText: {
      color:
        COLORS.textSecondary,
      marginLeft: 10,
    },


    /* INPUT */

    inputArea: {
      flexDirection:
        "row",
      alignItems:
        "flex-end",
      padding: 10,
      margin: 12,
      backgroundColor:
        COLORS.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    attachButton: {
      width: 40,
      height: 45,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    chatInput: {
      flex: 1,
      color:
        COLORS.text,
      maxHeight: 120,
      paddingVertical: 12,
      fontSize: 15,
    },

    sendButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor:
        COLORS.primary,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    sendButtonDisabled: {
      opacity: 0.4,
    },


    /* STUDIO */

    studioContainer: {
      flex: 1,
      padding: 20,
    },

    studioTitle: {
      color:
        COLORS.text,
      fontSize: 29,
      fontWeight:
        "900",
    },

    studioSubtitle: {
      color:
        COLORS.textSecondary,
      lineHeight: 22,
      marginTop: 8,
      marginBottom: 22,
    },

    studioInput: {
      minHeight: 130,
      backgroundColor:
        COLORS.surface,
      color:
        COLORS.text,
      padding: 18,
      borderRadius: 20,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      textAlignVertical:
        "top",
      fontSize: 15,
    },

    selectedImageContainer: {
      marginTop: 15,
      alignItems:
        "center",
    },

    selectedImage: {
      width:
        "100%",
      height: 190,
      borderRadius: 18,
    },

    uploadImageButton: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      height: 55,
      borderRadius: 16,
      backgroundColor:
        COLORS.surfaceLight,
      marginVertical: 16,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    uploadImageText: {
      color:
        COLORS.text,
      fontWeight:
        "700",
      marginLeft: 10,
    },

    studioButton: {
      flexDirection:
        "row",
      alignItems:
        "center",
      backgroundColor:
        COLORS.surface,
      padding: 16,
      borderRadius: 20,
      marginBottom: 13,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    studioIcon: {
      width: 50,
      height: 50,
      borderRadius: 16,
      backgroundColor:
        COLORS.primary,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 14,
    },

    studioButtonTitle: {
      color:
        COLORS.text,
      fontSize: 16,
      fontWeight:
        "800",
    },

    studioButtonSubtitle: {
      color:
        COLORS.textSecondary,
      marginTop: 4,
      fontSize: 13,
    },


    /* SETTINGS */

    settingsContainer: {
      flex: 1,
      padding: 20,
    },

    settingsTitle: {
      color:
        COLORS.text,
      fontSize: 29,
      fontWeight:
        "900",
      marginBottom: 20,
    },

    settingRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      backgroundColor:
        COLORS.surface,
      padding: 15,
      borderRadius: 18,
      marginBottom: 12,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    settingIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor:
        COLORS.surfaceLight,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 13,
    },

    settingTitle: {
      color:
        COLORS.text,
      fontSize: 15,
      fontWeight:
        "800",
    },

    settingSubtitle: {
      color:
        COLORS.textSecondary,
      fontSize: 12,
      marginTop: 4,
    },


    /* BOTTOM NAV */

    bottomNav: {
      height: 68,
      flexDirection:
        "row",
      borderTopWidth: 1,
      borderTopColor:
        COLORS.border,
      backgroundColor:
        COLORS.surface,
    },

    navButton: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    navLabel: {
      color:
        COLORS.textMuted,
      fontSize: 11,
      marginTop: 4,
    },

    navLabelActive: {
      color:
        COLORS.primary,
      fontWeight:
        "800",
    },


    /* SIDEBAR */

    sidebarOverlay: {
      flex: 1,
      backgroundColor:
        "rgba(0,0,0,0.65)",
    },

    sidebar: {
      width:
        "84%",
      maxWidth:
        380,
      height:
        "100%",
      backgroundColor:
        COLORS.surface,
      paddingTop:
        50,
      paddingHorizontal:
        17,
    },

    sidebarHeader: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      alignItems:
        "center",
      marginBottom:
        20,
    },

    sidebarTitle: {
      color:
        COLORS.text,
      fontSize:
        22,
      fontWeight:
        "900",
    },

    newChatButton: {
      height:
        52,
      borderRadius:
        15,
      backgroundColor:
        COLORS.primary,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      marginBottom:
        15,
    },

    newChatText: {
      color:
        "#FFFFFF",
      fontWeight:
        "800",
      marginLeft:
        7,
    },

    searchBox: {
      flexDirection:
        "row",
      alignItems:
        "center",
      height:
        48,
      backgroundColor:
        COLORS.surfaceLight,
      borderRadius:
        14,
      paddingHorizontal:
        13,
      marginBottom:
        15,
    },

    searchInput: {
      flex: 1,
      color:
        COLORS.text,
      marginLeft:
        8,
    },

    conversationItem: {
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingVertical:
        14,
      borderBottomWidth:
        1,
      borderBottomColor:
        COLORS.border,
    },

    conversationTitle: {
      color:
        COLORS.text,
      fontSize:
        14,
    },

    emptyHistory: {
      alignItems:
        "center",
      marginTop:
        60,
    },

    emptyHistoryText: {
      color:
        COLORS.textMuted,
      marginTop:
        12,
    },

    sidebarFooter: {
      borderTopWidth:
        1,
      borderTopColor:
        COLORS.border,
      paddingVertical:
        18,
    },

    sidebarEmail: {
      color:
        COLORS.textSecondary,
    },


    /* PROFILE */

    profileOverlay: {
      flex: 1,
      backgroundColor:
        "rgba(0,0,0,0.6)",
      justifyContent:
        "flex-start",
      alignItems:
        "flex-end",
      paddingTop:
        70,
      paddingRight:
        15,
    },

    profileMenu: {
      width:
        280,
      backgroundColor:
        COLORS.surface,
      borderRadius:
        22,
      padding:
        18,
      borderWidth:
        1,
      borderColor:
        COLORS.border,
    },

    profileAvatarLarge: {
      width:
        55,
      height:
        55,
      borderRadius:
        20,
      backgroundColor:
        COLORS.primary,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginBottom:
        12,
    },

    profileEmail: {
      color:
        COLORS.text,
      fontWeight:
        "700",
      marginBottom:
        16,
    },

    profileOption: {
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingVertical:
        14,
    },

    profileOptionText: {
      color:
        COLORS.text,
      marginLeft:
        13,
      fontSize:
        15,
      fontWeight:
        "600",
    },

  });