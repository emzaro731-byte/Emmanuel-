import "react-native-url-polyfill/auto";

import React, { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Image as RNImage,
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

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  createClient,
  Session,
  User,
} from "@supabase/supabase-js";

import * as ImagePicker from "expo-image-picker";
import * as Speech from "expo-speech";


// ============================================================
// SUPABASE CONFIGURATION
// ============================================================

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://vihbsfrwnslnmheowkhy.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_j8gV4-PeFte1RMgl759uQQ_KrM_3vzK";

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
// TYPES
// ============================================================

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  musicUrl?: string;
};

type ToolType =
  | "chat"
  | "image"
  | "video"
  | "music";


// ============================================================
// EDGE FUNCTION URLS
// ============================================================

const FUNCTION_BASE =
  `${SUPABASE_URL}/functions/v1`;

const DESTINY_AI_URL =
  `${FUNCTION_BASE}/destiny-ai`;

const GENERATE_IMAGE_URL =
  `${FUNCTION_BASE}/generate-image`;

const GENERATE_VIDEO_URL =
  `${FUNCTION_BASE}/generate-video`;

const GENERATE_MUSIC_URL =
  `${FUNCTION_BASE}/generate-music`;


// ============================================================
// APP
// ============================================================

export default function App() {

  // ----------------------------------------------------------
  // AUTH
  // ----------------------------------------------------------

  const [session, setSession] =
    useState<Session | null>(null);

  const [user, setUser] =
    useState<User | null>(null);

  const [authLoading, setAuthLoading] =
    useState(true);


  // ----------------------------------------------------------
  // AUTH FORM
  // ----------------------------------------------------------

  const [authMode, setAuthMode] =
    useState<"login" | "signup">("login");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [authBusy, setAuthBusy] =
    useState(false);


  // ----------------------------------------------------------
  // CHAT
  // ----------------------------------------------------------

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [input, setInput] =
    useState("");

  const [busy, setBusy] =
    useState(false);


  // ----------------------------------------------------------
  // TOOL
  // ----------------------------------------------------------

  const [activeTool, setActiveTool] =
    useState<ToolType>("chat");


  // ----------------------------------------------------------
  // IMAGE
  // ----------------------------------------------------------

  const [selectedImage, setSelectedImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);

  const [uploadedImageUrl, setUploadedImageUrl] =
    useState<string | null>(null);


  // ----------------------------------------------------------
  // APP START
  // ----------------------------------------------------------

  useEffect(() => {

    let mounted = true;

    const loadSession = async () => {

      const {
        data,
        error,
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.log(
          "Session error:",
          error.message
        );
      }

      setSession(data.session);
      setUser(data.session?.user ?? null);

      setAuthLoading(false);
    };

    loadSession();

    const {
      data: listener,
    } =
      supabase.auth.onAuthStateChange(
        (_event, newSession) => {

          setSession(newSession);
          setUser(
            newSession?.user ?? null
          );
        }
      );

    return () => {

      mounted = false;

      listener.subscription.unsubscribe();

    };

  }, []);


  // ============================================================
  // AUTH
  // ============================================================

  const handleAuth = async () => {

    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert(
        "Email required",
        "Please enter your email address."
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Password too short",
        "Your password must contain at least 6 characters."
      );
      return;
    }

    try {

      setAuthBusy(true);

      if (authMode === "login") {

        const {
          error,
        } =
          await supabase.auth.signInWithPassword({
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
        } =
          await supabase.auth.signUp({
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

          setAuthMode("login");

        } else {

          Alert.alert(
            "Welcome",
            "Your Destiny AI account has been created."
          );

        }
      }

    } catch (error) {

      Alert.alert(
        "Authentication error",
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );

    } finally {

      setAuthBusy(false);

    }
  };


  // ============================================================
  // LOGOUT
  // ============================================================

  const logout = async () => {

    const {
      error,
    } = await supabase.auth.signOut();

    if (error) {

      Alert.alert(
        "Logout error",
        error.message
      );

      return;
    }

    setMessages([]);
    setInput("");
    setSelectedImage(null);
    setUploadedImageUrl(null);
  };


  // ============================================================
  // NEW CHAT
  // ============================================================

  const newChat = () => {

    setMessages([]);
    setInput("");
    setSelectedImage(null);
    setUploadedImageUrl(null);

  };


  // ============================================================
  // AUTH HEADER
  // ============================================================

  const getFunctionHeaders = () => {

    const token =
      session?.access_token;

    return {
      "Content-Type": "application/json",
      "apikey":
        SUPABASE_PUBLISHABLE_KEY,
      "Authorization":
        `Bearer ${token ?? SUPABASE_PUBLISHABLE_KEY}`,
    };

  };


  // ============================================================
  // AI CHAT
  // ============================================================

  const sendChat = async (
    customPrompt?: string
  ) => {

    const prompt =
      (customPrompt ?? input).trim();

    if (!prompt) {
      return;
    }

    if (!session) {

      Alert.alert(
        "Sign in required",
        "Please sign in before using Destiny AI."
      );

      return;
    }

    const userMessage: Message = {

      id:
        `${Date.now()}-user`,

      role:
        "user",

      content:
        prompt,

    };

    const nextMessages =
      [
        ...messages,
        userMessage,
      ];

    setMessages(nextMessages);
    setInput("");
    setBusy(true);

    try {

      const response =
        await fetch(
          DESTINY_AI_URL,
          {
            method: "POST",
            headers:
              getFunctionHeaders(),

            body:
              JSON.stringify({
                messages:
                  nextMessages.map(
                    (message) => ({
                      role:
                        message.role,

                      content:
                        message.content,
                    })
                  ),
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {

        throw new Error(
          data?.error ||
          "AI request failed."
        );

      }

      if (!data?.success) {

        throw new Error(
          data?.error ||
          "AI did not return a response."
        );

      }

      const assistantMessage:
        Message = {

        id:
          `${Date.now()}-assistant`,

        role:
          "assistant",

        content:
          data.reply ||
          "I could not generate a response.",

      };

      setMessages((current) => [
        ...current,
        assistantMessage,
      ]);

    } catch (error) {

      Alert.alert(
        "Destiny AI",
        error instanceof Error
          ? error.message
          : "Unable to contact Destiny AI."
      );

    } finally {

      setBusy(false);

    }
  };


  // ============================================================
  // TEXT TO SPEECH
  // ============================================================

  const speak = async (
    text: string
  ) => {

    try {

      await Speech.stop();

      Speech.speak(text, {
        language: "en-US",
        pitch: 1,
        rate: 0.95,
      });

    } catch (error) {

      console.log(
        "Speech error:",
        error
      );

    }
  };


  // ============================================================
  // IMAGE PICKER
  // ============================================================

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
          mediaTypes:
            ["images"],

          allowsEditing:
            true,

          quality:
            0.9,

          selectionLimit:
            1,
        });

      if (
        result.canceled ||
        !result.assets ||
        result.assets.length === 0
      ) {
        return;
      }

      const image =
        result.assets[0];

      setSelectedImage(image);

      setUploadedImageUrl(null);

      setActiveTool("video");

    } catch (error) {

      Alert.alert(
        "Image picker error",
        error instanceof Error
          ? error.message
          : "Unable to select image."
      );

    }
  };


  // ============================================================
  // UPLOAD IMAGE TO SUPABASE STORAGE
  // ============================================================

  const uploadImage = async (
    image: ImagePicker.ImagePickerAsset
  ): Promise<string> => {

    if (!user) {

      throw new Error(
        "You must be signed in."
      );

    }

    const response =
      await fetch(image.uri);

    const arrayBuffer =
      await response.arrayBuffer();

    const mimeType =
      image.mimeType ||
      "image/jpeg";

    const extension =
      mimeType.split("/")[1] ||
      "jpg";

    const safeExtension =
      extension === "jpeg"
        ? "jpg"
        : extension;

    const filePath =
      `${user.id}/${Date.now()}.${safeExtension}`;

    const {
      data,
      error,
    } =
      await supabase.storage
        .from("Image")
        .upload(
          filePath,
          arrayBuffer,
          {
            contentType:
              mimeType,

            cacheControl:
              "3600",

            upsert:
              false,
          }
        );

    if (error) {
      throw error;
    }

    if (!data?.path) {

      throw new Error(
        "Image upload did not return a file path."
      );

    }

    const {
      data: publicData,
    } =
      supabase.storage
        .from("Image")
        .getPublicUrl(data.path);

    if (!publicData?.publicUrl) {

      throw new Error(
        "Unable to create image URL."
      );

    }

    setUploadedImageUrl(
      publicData.publicUrl
    );

    return publicData.publicUrl;
  };


  // ============================================================
  // GENERATE IMAGE
  // ============================================================

  const generateImage = async () => {

    const prompt =
      input.trim();

    if (!prompt) {

      Alert.alert(
        "Prompt required",
        "Describe the image you want."
      );

      return;
    }

    if (!session) {

      Alert.alert(
        "Sign in required",
        "Please sign in first."
      );

      return;
    }

    setBusy(true);
    setInput("");

    setMessages((current) => [
      ...current,
      {
        id:
          `${Date.now()}-user`,

        role:
          "user",

        content:
          `Generate an image: ${prompt}`,
      },
    ]);

    try {

      const response =
        await fetch(
          GENERATE_IMAGE_URL,
          {
            method:
              "POST",

            headers:
              getFunctionHeaders(),

            body:
              JSON.stringify({
                prompt,
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {

        throw new Error(
          data?.error ||
          "Image generation failed."
        );

      }

      const imageUrl =
        data?.image_url;

      if (!imageUrl) {

        throw new Error(
          "The image service did not return an image URL."
        );

      }

      setMessages((current) => [
        ...current,
        {
          id:
            `${Date.now()}-image`,

          role:
            "assistant",

          content:
            "Your image has been generated.",

          imageUrl,
        },
      ]);

    } catch (error) {

      Alert.alert(
        "Image generation",
        error instanceof Error
          ? error.message
          : "Unable to generate image."
      );

    } finally {

      setBusy(false);

    }
  };


  // ============================================================
  // IMAGE TO VIDEO
  // ============================================================

  const generateVideo = async () => {

    const prompt =
      input.trim();

    if (!selectedImage) {

      Alert.alert(
        "Choose an image",
        "Select an image before generating a video."
      );

      return;
    }

    if (!session) {

      Alert.alert(
        "Sign in required",
        "Please sign in first."
      );

      return;
    }

    setBusy(true);

    try {

      let imageUrl =
        uploadedImageUrl;

      if (!imageUrl) {

        imageUrl =
          await uploadImage(
            selectedImage
          );
      }

      const response =
        await fetch(
          GENERATE_VIDEO_URL,
          {
            method:
              "POST",

            headers:
              getFunctionHeaders(),

            body:
              JSON.stringify({
                prompt:
                  prompt ||
                  "Create a cinematic video from this image.",

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
          "Video generation failed."
        );

      }

      const videoUrl =
        findMediaUrl(
          data?.data,
          "video"
        );

      setMessages((current) => [
        ...current,
        {
          id:
            `${Date.now()}-video`,

          role:
            "assistant",

          content:
            videoUrl
              ? "Your video has been generated."
              : "The video request was accepted, but the service did not return a direct video URL yet.",

          videoUrl:
            videoUrl || undefined,
        },
      ]);

      setInput("");

      if (!videoUrl) {

        Alert.alert(
          "Video request submitted",
          "The video service did not return a direct video URL. Check the function response/model configuration."
        );

      }

    } catch (error) {

      Alert.alert(
        "Video generation",
        error instanceof Error
          ? error.message
          : "Unable to generate video."
      );

    } finally {

      setBusy(false);

    }
  };


  // ============================================================
  // MUSIC GENERATION
  // ============================================================

  const generateMusic = async () => {

    const prompt =
      input.trim();

    if (!prompt) {

      Alert.alert(
        "Prompt required",
        "Describe the music you want."
      );

      return;
    }

    if (!session) {

      Alert.alert(
        "Sign in required",
        "Please sign in first."
      );

      return;
    }

    setBusy(true);
    setInput("");

    setMessages((current) => [
      ...current,
      {
        id:
          `${Date.now()}-music-user`,

        role:
          "user",

        content:
          `Generate music: ${prompt}`,
      },
    ]);

    try {

      const response =
        await fetch(
          GENERATE_MUSIC_URL,
          {
            method:
              "POST",

            headers:
              getFunctionHeaders(),

            body:
              JSON.stringify({
                prompt,
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {

        throw new Error(
          data?.error ||
          "Music generation failed."
        );

      }

      const musicUrl =
        findMediaUrl(
          data?.data,
          "audio"
        );

      setMessages((current) => [
        ...current,
        {
          id:
            `${Date.now()}-music`,

          role:
            "assistant",

          content:
            musicUrl
              ? "Your music has been generated."
              : "The music request was accepted, but no direct audio URL was returned.",

          musicUrl:
            musicUrl || undefined,
        },
      ]);

      if (!musicUrl) {

        Alert.alert(
          "Music request submitted",
          "The function did not return a direct audio URL."
        );

      }

    } catch (error) {

      Alert.alert(
        "Music generation",
        error instanceof Error
          ? error.message
          : "Unable to generate music."
      );

    } finally {

      setBusy(false);

    }
  };


  // ============================================================
  // RUN ACTIVE TOOL
  // ============================================================

  const runTool = async () => {

    if (activeTool === "chat") {
      await sendChat();
      return;
    }

    if (activeTool === "image") {
      await generateImage();
      return;
    }

    if (activeTool === "video") {
      await generateVideo();
      return;
    }

    if (activeTool === "music") {
      await generateMusic();
      return;
    }
  };


  // ============================================================
  // SUGGESTIONS
  // ============================================================

  const suggestions =
    useMemo(
      () => {

        if (activeTool === "image") {

          return [
            "A futuristic city at night",
            "A luxury car in Lagos",
            "A cinematic African landscape",
          ];

        }

        if (activeTool === "video") {

          return [
            "Make the camera slowly move forward",
            "Create a cinematic camera movement",
            "Make the scene feel realistic",
          ];

        }

        if (activeTool === "music") {

          return [
            "Cinematic inspirational music",
            "Afrobeat instrumental",
            "Peaceful piano background music",
          ];

        }

        return [
          "Explain quantum physics simply",
          "Help me build my website",
          "Write a professional CV",
        ];

      },
      [activeTool]
    );


  // ============================================================
  // LOADING SCREEN
  // ============================================================

  if (authLoading) {

    return (
      <SafeAreaView
        style={styles.loadingScreen}
      >

        <StatusBar
          barStyle="light-content"
        />

        <View
          style={styles.logoCircle}
        >
          <Text
            style={styles.logoText}
          >
            D
          </Text>
        </View>

        <Text
          style={styles.loadingTitle}
        >
          Destiny AI
        </Text>

        <ActivityIndicator
          size="large"
          style={styles.loader}
        />

      </SafeAreaView>
    );
  }


  // ============================================================
  // AUTH SCREEN
  // ============================================================

  if (!session) {

    return (
      <SafeAreaView
        style={styles.container}
      >

        <StatusBar
          barStyle="light-content"
        />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
        >

          <ScrollView
            contentContainerStyle={
              styles.authScroll
            }
            keyboardShouldPersistTaps="handled"
          >

            <View
              style={styles.authLogo}
            >

              <View
                style={styles.logoCircle}
              >
                <Text
                  style={styles.logoText}
                >
                  D
                </Text>
              </View>

              <Text
                style={styles.brand}
              >
                Destiny AI
              </Text>

              <Text
                style={styles.tagline}
              >
                Your intelligent creative companion
              </Text>

            </View>


            <View
              style={styles.authCard}
            >

              <Text
                style={styles.authTitle}
              >
                {authMode === "login"
                  ? "Welcome back"
                  : "Create your account"}
              </Text>

              <Text
                style={styles.authSubtitle}
              >
                {authMode === "login"
                  ? "Sign in to continue to Destiny AI."
                  : "Create an account to start using Destiny AI."}
              </Text>


              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                placeholderTextColor="#6f7890"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />


              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#6f7890"
                secureTextEntry
                style={styles.input}
              />


              <Pressable
                style={[
                  styles.primaryButton,
                  authBusy &&
                    styles.disabledButton,
                ]}
                onPress={handleAuth}
                disabled={authBusy}
              >

                {authBusy ? (
                  <ActivityIndicator
                    color="#07111f"
                  />
                ) : (
                  <Text
                    style={styles.primaryButtonText}
                  >
                    {authMode === "login"
                      ? "Sign In"
                      : "Create Account"}
                  </Text>
                )}

              </Pressable>


              <Pressable
                style={styles.switchAuth}
                onPress={() => {

                  setAuthMode(
                    authMode === "login"
                      ? "signup"
                      : "login"
                  );

                }}
              >

                <Text
                  style={styles.switchText}
                >
                  {authMode === "login"
                    ? "Don't have an account? "
                    : "Already have an account? "}

                  <Text
                    style={styles.switchAccent}
                  >
                    {authMode === "login"
                      ? "Create one"
                      : "Sign in"}
                  </Text>
                </Text>

              </Pressable>

            </View>

          </ScrollView>

        </KeyboardAvoidingView>

      </SafeAreaView>
    );
  }


  // ============================================================
  // MAIN APP
  // ============================================================

  return (

    <SafeAreaView
      style={styles.container}
    >

      <StatusBar
        barStyle="light-content"
      />


      {/* HEADER */}

      <View
        style={styles.header}
      >

        <View
          style={styles.headerLeft}
        >

          <View
            style={styles.smallLogo}
          >
            <Text
              style={styles.smallLogoText}
            >
              D
            </Text>
          </View>

          <View>

            <Text
              style={styles.headerTitle}
            >
              Destiny AI
            </Text>

            <Text
              style={styles.headerSubtitle}
            >
              {user?.email || "AI assistant"}
            </Text>

          </View>

        </View>


        <View
          style={styles.headerActions}
        >

          <Pressable
            style={styles.headerButton}
            onPress={newChat}
          >
            <Text
              style={styles.headerButtonText}
            >
              +
            </Text>
          </Pressable>


          <Pressable
            style={styles.headerButton}
            onPress={logout}
          >
            <Text
              style={styles.headerButtonText}
            >
              ↪
            </Text>
          </Pressable>

        </View>

      </View>


      {/* CHAT */}

      <ScrollView
        style={styles.chat}
        contentContainerStyle={
          styles.chatContent
        }
        keyboardShouldPersistTaps="handled"
      >

        {messages.length === 0 && (

          <View
            style={styles.welcome}
          >

            <View
              style={styles.welcomeLogo}
            >
              <Text
                style={styles.welcomeLogoText}
              >
                D
              </Text>
            </View>

            <Text
              style={styles.welcomeTitle}
            >
              What can I help you create?
            </Text>

            <Text
              style={styles.welcomeSubtitle}
            >
              Chat, generate images, animate photos,
              and create music with Destiny AI.
            </Text>

          </View>

        )}


        {messages.map(
          (message) => (

            <View
              key={message.id}
              style={[
                styles.messageRow,
                message.role === "user"
                  ? styles.userRow
                  : styles.assistantRow,
              ]}
            >

              <View
                style={[
                  styles.messageBubble,
                  message.role === "user"
                    ? styles.userBubble
                    : styles.assistantBubble,
                ]}
              >

                <Text
                  style={[
                    styles.messageText,
                    message.role === "user"
                      ? styles.userMessageText
                      : styles.assistantMessageText,
                  ]}
                >
                  {message.content}
                </Text>


                {message.imageUrl && (

                  <Pressable
                    onPress={() =>
                      Linking.openURL(
                        message.imageUrl!
                      )
                    }
                  >

                    <RNImage
                      source={{
                        uri:
                          message.imageUrl,
                      }}
                      style={
                        styles.generatedImage
                      }
                      resizeMode="cover"
                    />

                    <Text
                      style={
                        styles.mediaLink
                      }
                    >
                      Open generated image
                    </Text>

                  </Pressable>

                )}


                {message.videoUrl && (

                  <Pressable
                    onPress={() =>
                      Linking.openURL(
                        message.videoUrl!
                      )
                    }
                  >

                    <View
                      style={
                        styles.mediaButton
                      }
                    >

                      <Text
                        style={
                          styles.mediaButtonText
                        }
                      >
                        ▶ Open Video
                      </Text>

                    </View>

                  </Pressable>

                )}


                {message.musicUrl && (

                  <Pressable
                    onPress={() =>
                      Linking.openURL(
                        message.musicUrl!
                      )
                    }
                  >

                    <View
                      style={
                        styles.mediaButton
                      }
                    >

                      <Text
                        style={
                          styles.mediaButtonText
                        }
                      >
                        ♪ Open Music
                      </Text>

                    </View>

                  </Pressable>

                )}


                {message.role ===
                  "assistant" && (

                  <Pressable
                    style={
                      styles.speakButton
                    }
                    onPress={() =>
                      speak(
                        message.content
                      )
                    }
                  >

                    <Text
                      style={
                        styles.speakText
                      }
                    >
                      🔊 Listen
                    </Text>

                  </Pressable>

                )}

              </View>

            </View>

          )
        )}


        {busy && (

          <View
            style={
              styles.typingBubble
            }
          >

            <ActivityIndicator
              size="small"
            />

            <Text
              style={
                styles.typingText
              }
            >
              Destiny AI is working...
            </Text>

          </View>

        )}

      </ScrollView>


      {/* TOOL BAR */}

      <View
        style={styles.toolBar}
      >

        <ToolButton
          label="Chat"
          icon="✦"
          active={
            activeTool === "chat"
          }
          onPress={() =>
            setActiveTool("chat")
          }
        />


        <ToolButton
          label="Image"
          icon="◉"
          active={
            activeTool === "image"
          }
          onPress={() =>
            setActiveTool("image")
          }
        />


        <ToolButton
          label="Video"
          icon="▶"
          active={
            activeTool === "video"
          }
          onPress={() =>
            setActiveTool("video")
          }
        />


        <ToolButton
          label="Music"
          icon="♪"
          active={
            activeTool === "music"
          }
          onPress={() =>
            setActiveTool("music")
          }
        />

      </View>


      {/* IMAGE PREVIEW */}

      {selectedImage && (

        <View
          style={
            styles.selectedImageContainer
          }
        >

          <RNImage
            source={{
              uri:
                selectedImage.uri,
            }}
            style={
              styles.selectedImage
            }
          />

          <View
            style={
              styles.selectedImageInfo
            }
          >

            <Text
              style={
                styles.selectedImageTitle
              }
            >
              Image selected
            </Text>

            <Text
              style={
                styles.selectedImageSubtitle
              }
            >
              Ready for video generation
            </Text>

          </View>


          <Pressable
            onPress={() => {

              setSelectedImage(null);
              setUploadedImageUrl(null);

            }}
          >

            <Text
              style={
                styles.removeImage
              }
            >
              ×
            </Text>

          </Pressable>

        </View>

      )}


      {/* SUGGESTIONS */}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.suggestions}
        contentContainerStyle={
          styles.suggestionsContent
        }
      >

        {suggestions.map(
          (suggestion) => (

            <Pressable
              key={suggestion}
              style={
                styles.suggestionChip
              }
              onPress={() => {

                setInput(
                  suggestion
                );

              }}
            >

              <Text
                style={
                  styles.suggestionText
                }
              >
                {suggestion}
              </Text>

            </Pressable>

          )
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

        <View
          style={styles.inputBar}
        >

          {activeTool === "video" && (

            <Pressable
              style={
                styles.attachButton
              }
              onPress={pickImage}
            >

              <Text
                style={
                  styles.attachText
                }
              >
                ＋
              </Text>

            </Pressable>

          )}


          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={
              activeTool === "chat"
                ? "Message Destiny AI..."
                : activeTool === "image"
                ? "Describe the image..."
                : activeTool === "video"
                ? "Describe the motion..."
                : "Describe the music..."
            }
            placeholderTextColor="#68738a"
            multiline
            style={styles.messageInput}
            editable={!busy}
          />


          <Pressable
            style={[
              styles.sendButton,
              busy &&
                styles.disabledButton,
            ]}
            onPress={runTool}
            disabled={busy}
          >

            {busy ? (

              <ActivityIndicator
                color="#07111f"
                size="small"
              />

            ) : (

              <Text
                style={
                  styles.sendButtonText
                }
              >
                ↑
              </Text>

            )}

          </Pressable>

        </View>

      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}


// ============================================================
// TOOL BUTTON
// ============================================================

function ToolButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: string;
  active: boolean;
  onPress: () => void;
}) {

  return (

    <Pressable
      onPress={onPress}
      style={[
        styles.toolButton,
        active &&
          styles.toolButtonActive,
      ]}
    >

      <Text
        style={[
          styles.toolIcon,
          active &&
            styles.toolIconActive,
        ]}
      >
        {icon}
      </Text>

      <Text
        style={[
          styles.toolLabel,
          active &&
            styles.toolLabelActive,
        ]}
      >
        {label}
      </Text>

    </Pressable>

  );
}


// ============================================================
// MEDIA URL FINDER
// ============================================================

function findMediaUrl(
  value: any,
  type: "video" | "audio"
): string | null {

  if (!value) {
    return null;
  }

  if (typeof value === "string") {

    if (
      value.startsWith("http://") ||
      value.startsWith("https://")
    ) {
      return value;
    }

    return null;
  }


  if (Array.isArray(value)) {

    for (const item of value) {

      const result =
        findMediaUrl(
          item,
          type
        );

      if (result) {
        return result;
      }

    }

    return null;
  }


  if (typeof value === "object") {

    const preferredKeys =
      type === "video"
        ? [
            "video_url",
            "videoUrl",
            "url",
            "file_url",
            "fileUrl",
          ]
        : [
            "audio_url",
            "audioUrl",
            "audio",
            "url",
            "file_url",
            "fileUrl",
          ];

    for (
      const key of preferredKeys
    ) {

      const candidate =
        value[key];

      if (
        typeof candidate ===
        "string" &&
        (
          candidate.startsWith(
            "http://"
          ) ||
          candidate.startsWith(
            "https://"
          )
        )
      ) {

        return candidate;

      }

    }


    for (
      const key of Object.keys(
        value
      )
    ) {

      const result =
        findMediaUrl(
          value[key],
          type
        );

      if (result) {
        return result;
      }

    }

  }

  return null;
}


// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({

    flex: {
      flex: 1,
    },

    container: {
      flex: 1,
      backgroundColor: "#07111f",
    },

    loadingScreen: {
      flex: 1,
      backgroundColor: "#07111f",
      alignItems: "center",
      justifyContent: "center",
    },

    loader: {
      marginTop: 28,
    },

    logoCircle: {
      width: 82,
      height: 82,
      borderRadius: 41,
      backgroundColor: "#d6ad52",
      alignItems: "center",
      justifyContent: "center",
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 10,
    },

    logoText: {
      color: "#07111f",
      fontSize: 48,
      fontWeight: "900",
    },

    loadingTitle: {
      color: "#ffffff",
      fontSize: 25,
      fontWeight: "800",
      marginTop: 18,
    },

    authScroll: {
      flexGrow: 1,
      justifyContent: "center",
      padding: 22,
    },

    authLogo: {
      alignItems: "center",
      marginBottom: 28,
    },

    brand: {
      color: "#ffffff",
      fontSize: 31,
      fontWeight: "900",
      marginTop: 14,
    },

    tagline: {
      color: "#8792a8",
      fontSize: 14,
      marginTop: 7,
      textAlign: "center",
    },

    authCard: {
      backgroundColor: "#0c1829",
      borderRadius: 25,
      padding: 22,
      borderWidth: 1,
      borderColor: "#1d2a3e",
    },

    authTitle: {
      color: "#ffffff",
      fontSize: 25,
      fontWeight: "800",
    },

    authSubtitle: {
      color: "#8490a6",
      fontSize: 14,
      marginTop: 7,
      marginBottom: 22,
      lineHeight: 21,
    },

    input: {
      height: 54,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: "#26364d",
      backgroundColor: "#07111f",
      color: "#ffffff",
      paddingHorizontal: 16,
      marginBottom: 13,
      fontSize: 15,
    },

    primaryButton: {
      minHeight: 54,
      borderRadius: 15,
      backgroundColor: "#d6ad52",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
    },

    primaryButtonText: {
      color: "#07111f",
      fontWeight: "900",
      fontSize: 16,
    },

    disabledButton: {
      opacity: 0.55,
    },

    switchAuth: {
      alignItems: "center",
      marginTop: 20,
    },

    switchText: {
      color: "#8994a9",
      fontSize: 14,
    },

    switchAccent: {
      color: "#d6ad52",
      fontWeight: "800",
    },

    header: {
      minHeight: 70,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: 1,
      borderBottomColor: "#152238",
      backgroundColor: "#081321",
    },

    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
    },

    smallLogo: {
      width: 43,
      height: 43,
      borderRadius: 14,
      backgroundColor: "#d6ad52",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 11,
    },

    smallLogoText: {
      color: "#07111f",
      fontSize: 25,
      fontWeight: "900",
    },

    headerTitle: {
      color: "#ffffff",
      fontSize: 17,
      fontWeight: "800",
    },

    headerSubtitle: {
      color: "#69758b",
      fontSize: 11,
      marginTop: 2,
      maxWidth: 190,
    },

    headerActions: {
      flexDirection: "row",
      gap: 8,
    },

    headerButton: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor: "#111e31",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#1d2b41",
    },

    headerButtonText: {
      color: "#d6ad52",
      fontSize: 21,
      fontWeight: "700",
    },

    chat: {
      flex: 1,
    },

    chatContent: {
      padding: 16,
      paddingBottom: 14,
    },

    welcome: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 20,
      paddingVertical: 75,
    },

    welcomeLogo: {
      width: 72,
      height: 72,
      borderRadius: 24,
      backgroundColor: "#d6ad52",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },

    welcomeLogoText: {
      color: "#07111f",
      fontSize: 43,
      fontWeight: "900",
    },

    welcomeTitle: {
      color: "#ffffff",
      fontSize: 24,
      fontWeight: "800",
      textAlign: "center",
    },

    welcomeSubtitle: {
      color: "#7e8aa0",
      fontSize: 14,
      lineHeight: 21,
      textAlign: "center",
      marginTop: 10,
      maxWidth: 330,
    },

    messageRow: {
      width: "100%",
      marginBottom: 13,
    },

    userRow: {
      alignItems: "flex-end",
    },

    assistantRow: {
      alignItems: "flex-start",
    },

    messageBubble: {
      maxWidth: "88%",
      borderRadius: 19,
      padding: 14,
    },

    userBubble: {
      backgroundColor: "#d6ad52",
      borderBottomRightRadius: 5,
    },

    assistantBubble: {
      backgroundColor: "#101e31",
      borderWidth: 1,
      borderColor: "#1c2b40",
      borderBottomLeftRadius: 5,
    },

    messageText: {
      fontSize: 15,
      lineHeight: 22,
    },

    userMessageText: {
      color: "#07111f",
    },

    assistantMessageText: {
      color: "#edf2f9",
    },

    speakButton: {
      marginTop: 11,
      alignSelf: "flex-start",
      paddingVertical: 6,
      paddingHorizontal: 9,
      borderRadius: 9,
      backgroundColor: "#17263b",
    },

    speakText: {
      color: "#d6ad52",
      fontSize: 12,
      fontWeight: "700",
    },

    typingBubble: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: "#101e31",
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderWidth: 1,
      borderColor: "#1c2b40",
    },

    typingText: {
      color: "#8995aa",
      fontSize: 12,
    },

    generatedImage: {
      width: 260,
      height: 260,
      borderRadius: 15,
      marginTop: 12,
    },

    mediaLink: {
      color: "#d6ad52",
      fontSize: 12,
      fontWeight: "700",
      marginTop: 8,
    },

    mediaButton: {
      marginTop: 12,
      borderRadius: 12,
      backgroundColor: "#d6ad52",
      paddingVertical: 11,
      paddingHorizontal: 15,
    },

    mediaButtonText: {
      color: "#07111f",
      fontWeight: "900",
      fontSize: 13,
    },

    toolBar: {
      flexDirection: "row",
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 5,
      backgroundColor: "#081321",
      borderTopWidth: 1,
      borderTopColor: "#152238",
    },

    toolButton: {
      flex: 1,
      minHeight: 55,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      marginHorizontal: 3,
    },

    toolButtonActive: {
      backgroundColor: "#132238",
      borderWidth: 1,
      borderColor: "#263a56",
    },

    toolIcon: {
      color: "#758198",
      fontSize: 17,
      fontWeight: "700",
    },

    toolIconActive: {
      color: "#d6ad52",
    },

    toolLabel: {
      color: "#758198",
      fontSize: 10,
      marginTop: 3,
      fontWeight: "700",
    },

    toolLabelActive: {
      color: "#d6ad52",
    },

    selectedImageContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#0d1a2b",
      borderTopWidth: 1,
      borderTopColor: "#1a2a40",
      padding: 9,
    },

    selectedImage: {
      width: 48,
      height: 48,
      borderRadius: 11,
    },

    selectedImageInfo: {
      flex: 1,
      marginLeft: 10,
    },

    selectedImageTitle: {
      color: "#ffffff",
      fontSize: 13,
      fontWeight: "800",
    },

    selectedImageSubtitle: {
      color: "#78849a",
      fontSize: 11,
      marginTop: 3,
    },

    removeImage: {
      color: "#ff6b6b",
      fontSize: 27,
      paddingHorizontal: 10,
    },

    suggestions: {
      maxHeight: 47,
      backgroundColor: "#081321",
    },

    suggestionsContent: {
      paddingHorizontal: 11,
      alignItems: "center",
    },

    suggestionChip: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "#1d2d44",
      backgroundColor: "#0d1a2b",
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginHorizontal: 4,
    },

    suggestionText: {
      color: "#929db0",
      fontSize: 11,
    },

    inputBar: {
      flexDirection: "row",
      alignItems: "flex-end",
      padding: 10,
      backgroundColor: "#081321",
      borderTopWidth: 1,
      borderTopColor: "#152238",
    },

    attachButton: {
      width: 45,
      height: 48,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#101f32",
      marginRight: 7,
      borderWidth: 1,
      borderColor: "#203149",
    },

    attachText: {
      color: "#d6ad52",
      fontSize: 25,
      fontWeight: "700",
    },

    messageInput: {
      flex: 1,
      maxHeight: 120,
      minHeight: 48,
      backgroundColor: "#101d30",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "#203149",
      color: "#ffffff",
      paddingHorizontal: 15,
      paddingVertical: 13,
      fontSize: 14,
    },

    sendButton: {
      width: 48,
      height: 48,
      borderRadius: 15,
      backgroundColor: "#d6ad52",
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 7,
    },

    sendButtonText: {
      color: "#07111f",
      fontSize: 26,
      fontWeight: "900",
    },

  });