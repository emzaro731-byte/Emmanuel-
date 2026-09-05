import React, { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { createClient, Session } from "@supabase/supabase-js";

import * as ImagePicker from "expo-image-picker";

import * as Speech from "expo-speech";


// ============================================================
// SUPABASE
// ============================================================

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://vihbsfrwnslnmheowkhy.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "YOUR_SUPABASE_PUBLISHABLE_KEY";


const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);


// ============================================================
// EDGE FUNCTIONS
// ============================================================

const DESTINY_AI_FUNCTION =
  `${SUPABASE_URL}/functions/v1/destiny-ai`;

const GENERATE_VIDEO_FUNCTION =
  `${SUPABASE_URL}/functions/v1/generate-video`;


// ============================================================
// TYPES
// ============================================================

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type SelectedImage = {
  uri: string;
  mimeType?: string;
  fileName?: string;
};


// ============================================================
// APP
// ============================================================

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) {
        setSession(session);
        setLoadingSession(false);
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setLoadingSession(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);


  // ============================================================
  // SUPABASE AUTO REFRESH
  // ============================================================

  useEffect(() => {
    if (Platform.OS === "web") return;

    const subscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") {
          supabase.auth.startAutoRefresh();
        } else {
          supabase.auth.stopAutoRefresh();
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);


  if (loadingSession) {
    return <LoadingScreen />;
  }


  if (!session) {
    return <AuthScreen />;
  }


  return (
    <MainApp
      session={session}
    />
  );
}


// ============================================================
// LOADING SCREEN
// ============================================================

function LoadingScreen() {
  return (
    <SafeAreaView style={styles.loadingScreen}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#05070D"
      />

      <View style={styles.logoCircle}>
        <Text style={styles.logoText}>D</Text>
      </View>

      <Text style={styles.loadingTitle}>
        Destiny AI
      </Text>

      <Text style={styles.loadingSubtitle}>
        Preparing your AI workspace...
      </Text>

      <ActivityIndicator
        size="large"
        style={{ marginTop: 25 }}
      />
    </SafeAreaView>
  );
}


// ============================================================
// AUTH SCREEN
// ============================================================

function AuthScreen() {
  const [mode, setMode] =
    useState<"login" | "signup">("login");

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);


  async function handleAuth() {
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      Alert.alert(
        "Email required",
        "Enter your email address."
      );
      return;
    }

    if (!password) {
      Alert.alert(
        "Password required",
        "Enter your password."
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Password too short",
        "Your password should contain at least 6 characters."
      );
      return;
    }


    if (
      mode === "signup" &&
      password !== confirmPassword
    ) {
      Alert.alert(
        "Passwords don't match",
        "Make sure both passwords are the same."
      );
      return;
    }


    setLoading(true);


    try {
      if (mode === "login") {
        const {
          error,
        } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          throw error;
        }
      } else {
        const {
          data,
          error,
        } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });

        if (error) {
          throw error;
        }


        if (!data.session) {
          Alert.alert(
            "Account created",
            "Check your email and confirm your account before signing in."
          );

          setMode("login");
        }
      }
    } catch (error: any) {
      Alert.alert(
        mode === "login"
          ? "Login failed"
          : "Sign up failed",
        error?.message ||
          "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }


  return (
    <SafeAreaView style={styles.authContainer}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#05070D"
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >

        <ScrollView
          contentContainerStyle={styles.authContent}
          keyboardShouldPersistTaps="handled"
        >

          {/* LOGO */}

          <View style={styles.authLogo}>
            <View style={styles.authLogoInner}>
              <Text style={styles.authLogoText}>
                D
              </Text>
            </View>
          </View>


          <Text style={styles.authTitle}>
            Destiny AI
          </Text>

          <Text style={styles.authSubtitle}>
            Your intelligent creative workspace
          </Text>


          {/* AUTH CARD */}

          <View style={styles.authCard}>

            <View style={styles.authTabs}>

              <Pressable
                onPress={() => setMode("login")}
                style={[
                  styles.authTab,
                  mode === "login" &&
                    styles.authTabActive,
                ]}
              >
                <Text
                  style={[
                    styles.authTabText,
                    mode === "login" &&
                      styles.authTabTextActive,
                  ]}
                >
                  Sign In
                </Text>
              </Pressable>


              <Pressable
                onPress={() => setMode("signup")}
                style={[
                  styles.authTab,
                  mode === "signup" &&
                    styles.authTabActive,
                ]}
              >
                <Text
                  style={[
                    styles.authTabText,
                    mode === "signup" &&
                      styles.authTabTextActive,
                  ]}
                >
                  Create Account
                </Text>
              </Pressable>

            </View>


            {/* EMAIL */}

            <Text style={styles.inputLabel}>
              Email
            </Text>

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#687084"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />


            {/* PASSWORD */}

            <Text style={styles.inputLabel}>
              Password
            </Text>

            <View style={styles.passwordContainer}>

              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#687084"
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
              />

              <Pressable
                onPress={() =>
                  setShowPassword(!showPassword)
                }
                style={styles.showButton}
              >
                <Text style={styles.showText}>
                  {showPassword ? "Hide" : "Show"}
                </Text>
              </Pressable>

            </View>


            {/* CONFIRM PASSWORD */}

            {mode === "signup" && (
              <>
                <Text style={styles.inputLabel}>
                  Confirm Password
                </Text>

                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#687084"
                  secureTextEntry={!showPassword}
                  style={styles.input}
                />
              </>
            )}


            {/* BUTTON */}

            <Pressable
              onPress={handleAuth}
              disabled={loading}
              style={[
                styles.primaryButton,
                loading &&
                  styles.disabledButton,
              ]}
            >

              {loading ? (
                <ActivityIndicator
                  color="#05070D"
                />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {mode === "login"
                    ? "Enter Destiny AI"
                    : "Create Destiny AI Account"}
                </Text>
              )}

            </Pressable>


            <Text style={styles.securityText}>
              Your account session is securely stored
              on this device.
            </Text>

          </View>


          <Text style={styles.footerText}>
            Destiny AI • Intelligent. Creative. Yours.
          </Text>

        </ScrollView>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


// ============================================================
// MAIN APP
// ============================================================

function MainApp({
  session,
}: {
  session: Session;
}) {

  const [messages, setMessages] =
    useState<Message[]>([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Welcome to Destiny AI. I'm ready to help you create, learn, code, write, and generate ideas.",
      },
    ]);


  const [input, setInput] =
    useState("");


  const [sending, setSending] =
    useState(false);


  const [selectedImage, setSelectedImage] =
    useState<SelectedImage | null>(null);


  const [uploadedImageUrl, setUploadedImageUrl] =
    useState<string | null>(null);


  const [uploading, setUploading] =
    useState(false);


  const [generatingVideo, setGeneratingVideo] =
    useState(false);


  const [videoUrl, setVideoUrl] =
    useState<string | null>(null);


  const [activeTool, setActiveTool] =
    useState<"chat" | "image" | "video">(
      "chat"
    );


  const [menuOpen, setMenuOpen] =
    useState(false);


  // ==========================================================
  // LOGOUT
  // ==========================================================

  async function logout() {
    Alert.alert(
      "Sign out",
      "Do you want to sign out of Destiny AI?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
          },
        },
      ]
    );
  }


  // ==========================================================
  // NEW CHAT
  // ==========================================================

  function newChat() {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "New conversation started. What would you like to do?",
      },
    ]);

    setInput("");

    setSelectedImage(null);

    setUploadedImageUrl(null);

    setVideoUrl(null);

    setActiveTool("chat");

    setMenuOpen(false);
  }


  // ==========================================================
  // SEND CHAT
  // ==========================================================

  async function sendMessage(customPrompt?: string) {

    const prompt =
      customPrompt?.trim() ||
      input.trim();

    if (!prompt || sending) {
      return;
    }


    setInput("");

    const userMessage: Message = {
      id:
        Date.now().toString() +
        "-user",
      role: "user",
      content: prompt,
    };


    setMessages((previous) => [
      ...previous,
      userMessage,
    ]);


    setSending(true);


    try {

      const {
        data: {
          session: currentSession,
        },
      } =
        await supabase.auth.getSession();


      if (!currentSession) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }


      const response = await fetch(
        DESTINY_AI_FUNCTION,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "apikey":
              SUPABASE_PUBLISHABLE_KEY,

            "Authorization":
              `Bearer ${currentSession.access_token}`,
          },

          body: JSON.stringify({
            message: prompt,

            messages: [
              ...messages.map((message) => ({
                role: message.role,
                content: message.content,
              })),

              {
                role: "user",
                content: prompt,
              },
            ],
          }),
        }
      );


      const data = await response.json();


      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Server error ${response.status}`
        );
      }


      const reply =
        data?.reply ||
        data?.message ||
        data?.content ||
        "I couldn't generate a response.";


      setMessages((previous) => [
        ...previous,
        {
          id:
            Date.now().toString() +
            "-assistant",

          role: "assistant",

          content: reply,
        },
      ]);

    } catch (error: any) {

      setMessages((previous) => [
        ...previous,
        {
          id:
            Date.now().toString() +
            "-error",

          role: "assistant",

          content:
            `Sorry, something went wrong: ${
              error?.message ||
              "Unable to connect to Destiny AI."
            }`,
        },
      ]);

    } finally {
      setSending(false);
    }
  }


  // ==========================================================
  // PICK IMAGE
  // ==========================================================

  async function pickImage() {

    try {

      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();


      if (!permission.granted) {

        Alert.alert(
          "Permission required",
          "Allow Destiny AI to access your photos so you can upload images."
        );

        return;
      }


      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],

          allowsEditing: true,

          quality: 0.85,

          selectionLimit: 1,
        });


      if (
        result.canceled ||
        !result.assets ||
        result.assets.length === 0
      ) {
        return;
      }


      const asset = result.assets[0];


      setSelectedImage({
        uri: asset.uri,

        mimeType:
          asset.mimeType ||
          "image/jpeg",

        fileName:
          asset.fileName ||
          undefined,
      });


      setUploadedImageUrl(null);

      setVideoUrl(null);

      setActiveTool("image");

    } catch (error: any) {

      Alert.alert(
        "Image error",
        error?.message ||
          "Unable to select image."
      );
    }
  }


  // ==========================================================
  // UPLOAD IMAGE TO SUPABASE STORAGE
  // ==========================================================

  async function uploadImage() {

    if (!selectedImage) {

      Alert.alert(
        "No image",
        "Select an image first."
      );

      return null;
    }


    if (!session.user) {

      Alert.alert(
        "Login required",
        "Please log in again."
      );

      return null;
    }


    setUploading(true);


    try {

      // Get the image bytes.
      // ArrayBuffer is recommended for React Native
      // Storage uploads.

      const response =
        await fetch(selectedImage.uri);


      const arrayBuffer =
        await response.arrayBuffer();


      const mimeType =
        selectedImage.mimeType ||
        "image/jpeg";


      let extension = "jpg";


      if (
        mimeType === "image/png"
      ) {
        extension = "png";
      }

      if (
        mimeType === "image/webp"
      ) {
        extension = "webp";
      }


      const filePath =
        `${session.user.id}/${Date.now()}.${extension}`;


      const {
        data,
        error,
      } =
        await supabase.storage
          .from("images")
          .upload(
            filePath,
            arrayBuffer,
            {
              contentType:
                mimeType,

              cacheControl:
                "3600",

              upsert: false,
            }
          );


      if (error) {
        throw error;
      }


      const {
        data: publicData,
      } =
        supabase.storage
          .from("images")
          .getPublicUrl(
            data.path
          );


      const publicUrl =
        publicData.publicUrl;


      setUploadedImageUrl(
        publicUrl
      );


      Alert.alert(
        "Upload complete",
        "Your image has been uploaded to Destiny AI Storage."
      );


      return publicUrl;

    } catch (error: any) {

      Alert.alert(
        "Upload failed",
        error?.message ||
          "Unable to upload your image."
      );

      return null;

    } finally {

      setUploading(false);

    }
  }


  // ==========================================================
  // GENERATE VIDEO
  // ==========================================================

  async function generateVideo() {

    if (!selectedImage) {

      Alert.alert(
        "Select an image",
        "Choose an image before generating a video."
      );

      return;
    }


    let imageUrl =
      uploadedImageUrl;


    setGeneratingVideo(true);


    try {

      // Upload automatically if necessary.

      if (!imageUrl) {

        imageUrl =
          await uploadImage();

        if (!imageUrl) {
          return;
        }
      }


      const {
        data: {
          session: currentSession,
        },
      } =
        await supabase.auth.getSession();


      if (!currentSession) {
        throw new Error(
          "Your login session has expired."
        );
      }


      const prompt =
        input.trim() ||
        "Create a cinematic, smooth and realistic video from this image.";


      const response =
        await fetch(
          GENERATE_VIDEO_FUNCTION,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              "apikey":
                SUPABASE_PUBLISHABLE_KEY,

              "Authorization":
                `Bearer ${currentSession.access_token}`,
            },

            body: JSON.stringify({
              prompt,

              image_url:
                imageUrl,
            }),
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data?.error ||
            data?.message ||
            `Video server error ${response.status}`
        );
      }


      const generatedVideo =
        data?.video_url ||
        data?.url ||
        data?.video?.url;


      if (!generatedVideo) {

        throw new Error(
          "The video function did not return a video URL."
        );
      }


      setVideoUrl(
        generatedVideo
      );


      Alert.alert(
        "Video ready",
        "Your AI video has been generated."
      );

    } catch (error: any) {

      Alert.alert(
        "Video generation failed",
        error?.message ||
          "Unable to generate the video."
      );

    } finally {

      setGeneratingVideo(false);
    }
  }


  // ==========================================================
  // SPEAK AI RESPONSE
  // ==========================================================

  function speak(text: string) {

    Speech.stop();

    Speech.speak(text, {
      language: "en-US",
      rate: 0.95,
    });
  }


  // ==========================================================
  // OPEN VIDEO
  // ==========================================================

  async function openVideo() {

    if (!videoUrl) return;

    try {

      await Linking.openURL(
        videoUrl
      );

    } catch {

      Alert.alert(
        "Unable to open video",
        videoUrl
      );
    }
  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <SafeAreaView style={styles.appContainer}>

      <StatusBar
        barStyle="light-content"
        backgroundColor="#05070D"
      />


      {/* HEADER */}

      <View style={styles.header}>

        <View style={styles.headerLeft}>

          <View style={styles.smallLogo}>
            <Text style={styles.smallLogoText}>
              D
            </Text>
          </View>

          <View>

            <Text style={styles.headerTitle}>
              Destiny AI
            </Text>

            <View style={styles.onlineRow}>

              <View style={styles.onlineDot} />

              <Text style={styles.onlineText}>
                Online
              </Text>

            </View>

          </View>

        </View>


        <Pressable
          onPress={() =>
            setMenuOpen(!menuOpen)
          }
          style={styles.menuButton}
        >
          <Text style={styles.menuButtonText}>
            •••
          </Text>
        </Pressable>

      </View>


      {/* MENU */}

      {menuOpen && (
        <View style={styles.menu}>

          <Text style={styles.menuEmail}>
            {session.user.email}
          </Text>


          <Pressable
            onPress={newChat}
            style={styles.menuItem}
          >
            <Text style={styles.menuItemText}>
              ✦ New Chat
            </Text>
          </Pressable>


          <Pressable
            onPress={logout}
            style={styles.menuItem}
          >
            <Text style={styles.logoutText}>
              ⇥ Sign Out
            </Text>
          </Pressable>

        </View>
      )}


      {/* CHAT */}

      <ScrollView
        style={styles.chat}
        contentContainerStyle={
          styles.chatContent
        }
        keyboardShouldPersistTaps="handled"
      >

        {/* WELCOME */}

        {messages.length === 1 && (
          <View style={styles.heroCard}>

            <View style={styles.heroIcon}>
              <Text style={styles.heroIconText}>
                D
              </Text>
            </View>


            <Text style={styles.heroTitle}>
              What will you create today?
            </Text>


            <Text style={styles.heroSubtitle}>
              Ask Destiny AI anything or use the
              creative tools below.
            </Text>


            <View style={styles.suggestionGrid}>

              <Pressable
                onPress={() =>
                  sendMessage(
                    "Explain something interesting to me."
                  )
                }
                style={styles.suggestion}
              >
                <Text style={styles.suggestionIcon}>
                  ✦
                </Text>

                <Text style={styles.suggestionText}>
                  Teach me
                </Text>
              </Pressable>


              <Pressable
                onPress={() =>
                  sendMessage(
                    "Help me write something creative."
                  )
                }
                style={styles.suggestion}
              >
                <Text style={styles.suggestionIcon}>
                  ✎
                </Text>

                <Text style={styles.suggestionText}>
                  Write
                </Text>
              </Pressable>


              <Pressable
                onPress={() =>
                  sendMessage(
                    "Help me write some code."
                  )
                }
                style={styles.suggestion}
              >
                <Text style={styles.suggestionIcon}>
                  {"</>"}
                </Text>

                <Text style={styles.suggestionText}>
                  Code
                </Text>
              </Pressable>


              <Pressable
                onPress={() =>
                  setActiveTool("image")
                }
                style={styles.suggestion}
              >
                <Text style={styles.suggestionIcon}>
                  ◈
                </Text>

                <Text style={styles.suggestionText}>
                  Create
                </Text>
              </Pressable>

            </View>

          </View>
        )}


        {/* MESSAGES */}

        {messages.map((message) => (

          <View
            key={message.id}
            style={[
              styles.messageRow,

              message.role === "user"
                ? styles.userRow
                : styles.aiRow,
            ]}
          >

            {message.role === "assistant" && (
              <View style={styles.messageAvatar}>
                <Text style={styles.messageAvatarText}>
                  D
                </Text>
              </View>
            )}


            <View
              style={[
                styles.messageBubble,

                message.role === "user"
                  ? styles.userBubble
                  : styles.aiBubble,
              ]}
            >

              <Text
                style={
                  message.role === "user"
                    ? styles.userMessageText
                    : styles.aiMessageText
                }
              >
                {message.content}
              </Text>


              {message.role === "assistant" &&
                message.id !== "welcome" && (

                  <Pressable
                    onPress={() =>
                      speak(
                        message.content
                      )
                    }
                    style={styles.speakButton}
                  >

                    <Text style={styles.speakText}>
                      🔊 Listen
                    </Text>

                  </Pressable>

                )}

            </View>

          </View>

        ))}


        {/* IMAGE WORKSPACE */}

        {activeTool !== "chat" && (
          <View style={styles.toolCard}>

            <View style={styles.toolHeader}>

              <View>

                <Text style={styles.toolTitle}>
                  {activeTool === "image"
                    ? "Image Studio"
                    : "Video Studio"}
                </Text>

                <Text style={styles.toolSubtitle}>
                  {activeTool === "image"
                    ? "Upload an image to your Destiny AI workspace."
                    : "Turn an image into an AI video."}
                </Text>

              </View>

            </View>


            {!selectedImage ? (

              <Pressable
                onPress={pickImage}
                style={styles.imagePicker}
              >

                <Text style={styles.imagePickerIcon}>
                  ＋
                </Text>

                <Text style={styles.imagePickerTitle}>
                  Select Image
                </Text>

                <Text style={styles.imagePickerSubtitle}>
                  Choose a photo from your device
                </Text>

              </Pressable>

            ) : (

              <View>

                <Image
                  source={{
                    uri: selectedImage.uri,
                  }}
                  style={styles.previewImage}
                />


                <View style={styles.imageActions}>

                  <Pressable
                    onPress={pickImage}
                    style={styles.secondaryButton}
                  >

                    <Text style={styles.secondaryButtonText}>
                      Change
                    </Text>

                  </Pressable>


                  <Pressable
                    onPress={uploadImage}
                    disabled={uploading}
                    style={styles.secondaryButton}
                  >

                    {uploading ? (
                      <ActivityIndicator
                        size="small"
                      />
                    ) : (
                      <Text style={styles.secondaryButtonText}>
                        Upload
                      </Text>
                    )}

                  </Pressable>

                </View>


                {uploadedImageUrl && (
                  <View style={styles.successBox}>

                    <Text style={styles.successText}>
                      ✓ Image uploaded to Storage
                    </Text>

                  </View>
                )}


                {activeTool === "video" && (

                  <Pressable
                    onPress={generateVideo}
                    disabled={generatingVideo}
                    style={[
                      styles.generateButton,
                      generatingVideo &&
                        styles.disabledButton,
                    ]}
                  >

                    {generatingVideo ? (
                      <View style={styles.loadingRow}>

                        <ActivityIndicator
                          color="#05070D"
                        />

                        <Text
                          style={
                            styles.generateButtonText
                          }
                        >
                          Generating...
                        </Text>

                      </View>
                    ) : (

                      <Text
                        style={
                          styles.generateButtonText
                        }
                      >
                        ✦ Generate AI Video
                      </Text>

                    )}

                  </Pressable>

                )}


                {videoUrl && (

                  <Pressable
                    onPress={openVideo}
                    style={styles.videoResult}
                  >

                    <Text style={styles.videoResultIcon}>
                      ▶
                    </Text>

                    <View style={{ flex: 1 }}>

                      <Text style={styles.videoResultTitle}>
                        Video Ready
                      </Text>

                      <Text style={styles.videoResultSubtitle}>
                        Tap to open your generated video
                      </Text>

                    </View>

                  </Pressable>

                )}

              </View>

            )}

          </View>
        )}

      </ScrollView>


      {/* TOOL BAR */}

      <View style={styles.toolBar}>

        <Pressable
          onPress={() => setActiveTool("chat")}
          style={[
            styles.toolChip,
            activeTool === "chat" &&
              styles.toolChipActive,
          ]}
        >
          <Text
            style={[
              styles.toolChipText,
              activeTool === "chat" &&
                styles.toolChipTextActive,
            ]}
          >
            ✦ Chat
          </Text>
        </Pressable>


        <Pressable
          onPress={() => {
            setActiveTool("image");
            pickImage();
          }}
          style={[
            styles.toolChip,
            activeTool === "image" &&
              styles.toolChipActive,
          ]}
        >
          <Text
            style={[
              styles.toolChipText,
              activeTool === "image" &&
                styles.toolChipTextActive,
            ]}
          >
            ◈ Image
          </Text>
        </Pressable>


        <Pressable
          onPress={() => {
            setActiveTool("video");

            if (!selectedImage) {
              pickImage();
            }
          }}
          style={[
            styles.toolChip,
            activeTool === "video" &&
              styles.toolChipActive,
          ]}
        >
          <Text
            style={[
              styles.toolChipText,
              activeTool === "video" &&
                styles.toolChipTextActive,
            ]}
          >
            ▶ Video
          </Text>
        </Pressable>

      </View>


      {/* INPUT */}

      <View style={styles.inputArea}>

        <View style={styles.chatInputContainer}>

          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={
              activeTool === "video"
                ? "Describe how the video should move..."
                : "Message Destiny AI..."
            }
            placeholderTextColor="#687084"
            multiline
            style={styles.chatInput}
          />


          <Pressable
            onPress={() =>
              sendMessage()
            }
            disabled={
              sending ||
              !input.trim()
            }
            style={[
              styles.sendButton,
              (!input.trim() ||
                sending) &&
                styles.sendDisabled,
            ]}
          >

            {sending ? (
              <ActivityIndicator
                size="small"
                color="#05070D"
              />
            ) : (
              <Text style={styles.sendButtonText}>
                ↑
              </Text>
            )}

          </Pressable>

        </View>


        <Text style={styles.disclaimer}>
          Destiny AI can make mistakes. Check important
          information.
        </Text>

      </View>

    </SafeAreaView>
  );
}


// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({

  // ----------------------------------------------------------
  // GENERAL
  // ----------------------------------------------------------

  loadingScreen: {
    flex: 1,
    backgroundColor: "#05070D",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingTitle: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "800",
    marginTop: 18,
  },

  loadingSubtitle: {
    color: "#8992A5",
    fontSize: 14,
    marginTop: 7,
  },

  logoCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#B8943F",
    alignItems: "center",
    justifyContent: "center",
  },

  logoText: {
    color: "#05070D",
    fontSize: 42,
    fontWeight: "900",
  },


  // ----------------------------------------------------------
  // AUTH
  // ----------------------------------------------------------

  authContainer: {
    flex: 1,
    backgroundColor: "#05070D",
  },

  authContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },

  authLogo: {
    alignItems: "center",
    marginBottom: 18,
  },

  authLogoInner: {
    width: 82,
    height: 82,
    borderRadius: 26,
    backgroundColor: "#B8943F",
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },

  authLogoText: {
    fontSize: 48,
    fontWeight: "900",
    color: "#05070D",
  },

  authTitle: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center",
  },

  authSubtitle: {
    color: "#8791A5",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 28,
  },

  authCard: {
    backgroundColor: "#0B0F18",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#1B2333",
    padding: 20,
  },

  authTabs: {
    flexDirection: "row",
    backgroundColor: "#070A11",
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
  },

  authTab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 11,
    alignItems: "center",
  },

  authTabActive: {
    backgroundColor: "#B8943F",
  },

  authTabText: {
    color: "#778196",
    fontWeight: "700",
  },

  authTabTextActive: {
    color: "#05070D",
  },

  inputLabel: {
    color: "#DCE2EE",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 13,
  },

  input: {
    backgroundColor: "#070A11",
    borderWidth: 1,
    borderColor: "#1C2638",
    borderRadius: 14,
    color: "#FFFFFF",
    paddingHorizontal: 15,
    height: 52,
    fontSize: 15,
  },

  passwordContainer: {
    height: 52,
    backgroundColor: "#070A11",
    borderWidth: 1,
    borderColor: "#1C2638",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  passwordInput: {
    flex: 1,
    color: "#FFFFFF",
    paddingHorizontal: 15,
    fontSize: 15,
  },

  showButton: {
    paddingHorizontal: 15,
  },

  showText: {
    color: "#C9A54D",
    fontWeight: "700",
  },

  primaryButton: {
    height: 54,
    borderRadius: 15,
    backgroundColor: "#B8943F",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 25,
  },

  primaryButtonText: {
    color: "#05070D",
    fontSize: 15,
    fontWeight: "900",
  },

  disabledButton: {
    opacity: 0.6,
  },

  securityText: {
    color: "#626C80",
    fontSize: 11,
    textAlign: "center",
    marginTop: 16,
  },

  footerText: {
    color: "#535D70",
    textAlign: "center",
    fontSize: 11,
    marginTop: 28,
  },


  // ----------------------------------------------------------
  // APP
  // ----------------------------------------------------------

  appContainer: {
    flex: 1,
    backgroundColor: "#05070D",
  },

  header: {
    height: 68,
    paddingHorizontal: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  smallLogo: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#B8943F",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  smallLogoText: {
    color: "#05070D",
    fontWeight: "900",
    fontSize: 23,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  onlineRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },

  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#51D88A",
    marginRight: 5,
  },

  onlineText: {
    color: "#69758A",
    fontSize: 10,
  },

  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#0C111B",
    alignItems: "center",
    justifyContent: "center",
  },

  menuButtonText: {
    color: "#D7DCE7",
    fontSize: 18,
    fontWeight: "900",
  },

  menu: {
    position: "absolute",
    zIndex: 20,
    right: 14,
    top: 60,
    width: 220,
    backgroundColor: "#0D121D",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#202A3A",
    padding: 10,
  },

  menuEmail: {
    color: "#8B95A8",
    fontSize: 11,
    padding: 10,
  },

  menuItem: {
    padding: 13,
    borderRadius: 11,
  },

  menuItemText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  logoutText: {
    color: "#F47777",
    fontWeight: "700",
  },


  // ----------------------------------------------------------
  // CHAT
  // ----------------------------------------------------------

  chat: {
    flex: 1,
  },

  chatContent: {
    padding: 16,
    paddingBottom: 20,
  },

  heroCard: {
    backgroundColor: "#0A0F18",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#172132",
    padding: 22,
    marginBottom: 18,
  },

  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#B8943F",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 17,
  },

  heroIconText: {
    color: "#05070D",
    fontSize: 30,
    fontWeight: "900",
  },

  heroTitle: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "900",
  },

  heroSubtitle: {
    color: "#7F8A9E",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },

  suggestionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 20,
  },

  suggestion: {
    width: "48%",
    backgroundColor: "#080C14",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#182235",
    padding: 14,
  },

  suggestionIcon: {
    color: "#C9A54D",
    fontSize: 19,
    fontWeight: "900",
  },

  suggestionText: {
    color: "#C6CDDA",
    fontWeight: "700",
    fontSize: 12,
    marginTop: 8,
  },

  messageRow: {
    flexDirection: "row",
    marginBottom: 15,
    maxWidth: "100%",
  },

  aiRow: {
    alignSelf: "flex-start",
  },

  userRow: {
    alignSelf: "flex-end",
    justifyContent: "flex-end",
  },

  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#B8943F",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  messageAvatarText: {
    color: "#05070D",
    fontWeight: "900",
  },

  messageBubble: {
    maxWidth: "82%",
    borderRadius: 18,
    padding: 14,
  },

  aiBubble: {
    backgroundColor: "#0C121D",
    borderWidth: 1,
    borderColor: "#172235",
    borderTopLeftRadius: 5,
  },

  userBubble: {
    backgroundColor: "#B8943F",
    borderTopRightRadius: 5,
  },

  aiMessageText: {
    color: "#DCE2EC",
    fontSize: 14,
    lineHeight: 21,
  },

  userMessageText: {
    color: "#05070D",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
  },

  speakButton: {
    marginTop: 11,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: "#1C283A",
  },

  speakText: {
    color: "#C9A54D",
    fontSize: 11,
    fontWeight: "700",
  },


  // ----------------------------------------------------------
  // TOOLS
  // ----------------------------------------------------------

  toolCard: {
    backgroundColor: "#0B1019",
    borderWidth: 1,
    borderColor: "#1B2638",
    borderRadius: 21,
    padding: 16,
    marginTop: 5,
    marginBottom: 16,
  },

  toolHeader: {
    marginBottom: 15,
  },

  toolTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },

  toolSubtitle: {
    color: "#707B8F",
    fontSize: 11,
    marginTop: 5,
    lineHeight: 17,
  },

  imagePicker: {
    height: 190,
    borderRadius: 17,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#354158",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#080C14",
  },

  imagePickerIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: "#131B2A",
    color: "#C9A54D",
    fontSize: 28,
    textAlign: "center",
    lineHeight: 47,
    fontWeight: "300",
  },

  imagePickerTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    marginTop: 12,
  },

  imagePickerSubtitle: {
    color: "#657085",
    fontSize: 11,
    marginTop: 5,
  },

  previewImage: {
    width: "100%",
    height: 230,
    borderRadius: 16,
    backgroundColor: "#05070D",
  },

  imageActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 11,
  },

  secondaryButton: {
    flex: 1,
    height: 46,
    borderRadius: 13,
    backgroundColor: "#131A27",
    borderWidth: 1,
    borderColor: "#243047",
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryButtonText: {
    color: "#D4DAE4",
    fontWeight: "800",
    fontSize: 12,
  },

  successBox: {
    backgroundColor: "#0A2017",
    borderWidth: 1,
    borderColor: "#164D35",
    padding: 11,
    borderRadius: 11,
    marginTop: 11,
  },

  successText: {
    color: "#61DB97",
    fontSize: 11,
    fontWeight: "700",
  },

  generateButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#B8943F",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },

  generateButtonText: {
    color: "#05070D",
    fontWeight: "900",
    fontSize: 13,
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  videoResult: {
    marginTop: 13,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#111B2A",
    borderWidth: 1,
    borderColor: "#243650",
    flexDirection: "row",
    alignItems: "center",
  },

  videoResultIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#B8943F",
    color: "#05070D",
    textAlign: "center",
    lineHeight: 42,
    fontWeight: "900",
    marginRight: 12,
  },

  videoResultTitle: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 13,
  },

  videoResultSubtitle: {
    color: "#778399",
    fontSize: 10,
    marginTop: 4,
  },


  // ----------------------------------------------------------
  // TOOL BAR
  // ----------------------------------------------------------

  toolBar: {
    flexDirection: "row",
    paddingHorizontal: 13,
    paddingTop: 8,
    paddingBottom: 7,
    gap: 7,
    borderTopWidth: 1,
    borderTopColor: "#101725",
  },

  toolChip: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#0B1019",
    borderWidth: 1,
    borderColor: "#172235",
    alignItems: "center",
    justifyContent: "center",
  },

  toolChipActive: {
    backgroundColor: "#B8943F",
    borderColor: "#B8943F",
  },

  toolChipText: {
    color: "#7F8A9D",
    fontSize: 11,
    fontWeight: "800",
  },

  toolChipTextActive: {
    color: "#05070D",
  },


  // ----------------------------------------------------------
  // INPUT
  // ----------------------------------------------------------

  inputArea: {
    paddingHorizontal: 12,
    paddingBottom: 9,
    paddingTop: 5,
  },

  chatInputContainer: {
    minHeight: 54,
    maxHeight: 130,
    backgroundColor: "#0B1019",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1A2639",
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 7,
  },

  chatInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    maxHeight: 110,
    paddingHorizontal: 9,
    paddingTop: 10,
    paddingBottom: 9,
  },

  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#B8943F",
    alignItems: "center",
    justifyContent: "center",
  },

  sendDisabled: {
    opacity: 0.35,
  },

  sendButtonText: {
    color: "#05070D",
    fontSize: 23,
    fontWeight: "900",
  },

  disclaimer: {
    color: "#4E596D",
    fontSize: 9,
    textAlign: "center",
    marginTop: 6,
  },

});