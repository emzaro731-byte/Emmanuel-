import React, { useState } from "react";

import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  StatusBar,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import * as ImagePicker from "expo-image-picker";


/*
========================================
DESTINY AI BACKEND
========================================
*/

const SUPABASE_URL =
  "https://vihbsfrwnslnmheowkhy.supabase.co/functions/v1";


const ENDPOINTS = {
  chat: `${SUPABASE_URL}/destiny-ai`,

  image: `${SUPABASE_URL}/generate-image`,

  video: `${SUPABASE_URL}/generate-video`,

  music: `${SUPABASE_URL}/generate-music`,
};


/*
========================================
MESSAGE TYPE
========================================
*/

type Message = {
  id: string;

  role: "user" | "assistant";

  content: string;

  type?: "text" | "image" | "video" | "music";

  url?: string;
};


/*
========================================
APP
========================================
*/

export default function App() {

  const [mode, setMode] = useState<
    "chat" | "image" | "video" | "music"
  >("chat");


  const [prompt, setPrompt] = useState("");


  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",

      role: "assistant",

      content:
        "Hello 👋 I am Destiny AI. Ask me anything, generate images, videos, or music!",
    },
  ]);


  const [loading, setLoading] = useState(false);


  const [selectedImage, setSelectedImage] =
    useState<string | null>(null);



  /*
  ========================================
  ADD MESSAGE
  ========================================
  */

  const addMessage = (message: Message) => {

    setMessages((previousMessages) => [
      ...previousMessages,
      message,
    ]);

  };



  /*
  ========================================
  UPLOAD IMAGE
  ========================================
  */

  const pickImage = async () => {

    try {

      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();


      if (!permission.granted) {

        Alert.alert(
          "Permission Required",
          "Please allow Destiny AI to access your photos."
        );

        return;

      }


      const result =
        await ImagePicker.launchImageLibraryAsync({

          mediaTypes: ["images"],

          allowsEditing: true,

          quality: 0.8,

        });


      if (!result.canceled) {

        const imageUri =
          result.assets[0].uri;


        setSelectedImage(imageUri);


        Alert.alert(
          "Image Selected",
          "Your image is ready to use."
        );

      }

    } catch (error) {

      console.log("Image picker error:", error);


      Alert.alert(
        "Error",
        "Unable to select image."
      );

    }

  };



  /*
  ========================================
  SEND REQUEST
  ========================================
  */

  const sendRequest = async () => {

    const userPrompt = prompt.trim();


    if (!userPrompt) {

      Alert.alert(
        "Enter a Prompt",
        mode === "chat"
          ? "Please type a message."
          : "Please describe what you want to generate."
      );

      return;

    }


    setPrompt("");


    addMessage({
      id: Date.now().toString(),

      role: "user",

      content: userPrompt,
    });


    setLoading(true);


    try {

      let endpoint = ENDPOINTS.chat;


      if (mode === "image") {

        endpoint = ENDPOINTS.image;

      }


      if (mode === "video") {

        endpoint = ENDPOINTS.video;

      }


      if (mode === "music") {

        endpoint = ENDPOINTS.music;

      }



      /*
      ========================================
      REQUEST BODY
      ========================================
      */

      const requestBody =
        mode === "chat"
          ? {
              message: userPrompt,
            }
          : {
              prompt: userPrompt,

              image_url:
                selectedImage || undefined,
            };



      /*
      ========================================
      CALL SUPABASE
      ========================================
      */

      const response =
        await fetch(endpoint, {

          method: "POST",

          headers: {

            "Content-Type":
              "application/json",

          },

          body:
            JSON.stringify(requestBody),

        });



      const data =
        await response.json();



      console.log(
        "Destiny AI response:",
        data
      );



      if (!response.ok) {

        throw new Error(
          data?.error ||
          "Something went wrong."
        );

      }



      /*
      ========================================
      CHAT RESPONSE
      ========================================
      */

      if (mode === "chat") {

        addMessage({

          id:
            `${Date.now()}-assistant`,

          role: "assistant",

          content:
            data.reply ||
            "Sorry, I could not generate a response.",

          type: "text",

        });

      }



      /*
      ========================================
      IMAGE RESPONSE
      ========================================
      */

      if (mode === "image") {

        const imageUrl =
          data.image_url;


        if (!imageUrl) {

          throw new Error(
            "Image URL was not returned."
          );

        }


        addMessage({

          id:
            `${Date.now()}-image`,

          role: "assistant",

          content:
            "Here is your generated image 🖼️",

          type: "image",

          url: imageUrl,

        });

      }



      /*
      ========================================
      VIDEO RESPONSE
      ========================================
      */

      if (mode === "video") {

        const videoUrl =
          data.video_url;


        addMessage({

          id:
            `${Date.now()}-video`,

          role: "assistant",

          content:
            videoUrl
              ? "Your video is ready 🎥 Tap Open Video."
              : "Video request completed, but no video URL was returned.",

          type: "video",

          url: videoUrl,

        });

      }



      /*
      ========================================
      MUSIC RESPONSE
      ========================================
      */

      if (mode === "music") {

        const audioUrl =
          data.audio_url;


        addMessage({

          id:
            `${Date.now()}-music`,

          role: "assistant",

          content:
            audioUrl
              ? "Your music is ready 🎵 Tap Open Music."
              : "Music request completed, but no audio URL was returned.",

          type: "music",

          url: audioUrl,

        });

      }


      /*
      Remove selected image after request
      */

      setSelectedImage(null);


    } catch (error) {

      console.log(
        "Destiny AI Error:",
        error
      );


      const errorMessage =
        error instanceof Error
          ? error.message
          : "Something went wrong.";



      addMessage({

        id:
          `${Date.now()}-error`,

        role: "assistant",

        content:
          `⚠️ Error: ${errorMessage}`,

      });


      Alert.alert(
        "Request Failed",
        errorMessage
      );


    } finally {

      setLoading(false);

    }

  };



  /*
  ========================================
  CLEAR CHAT
  ========================================
  */

  const clearChat = () => {

    Alert.alert(

      "Clear Conversation",

      "Do you want to remove all messages?",

      [

        {
          text: "Cancel",

          style: "cancel",
        },

        {
          text: "Clear",

          style: "destructive",

          onPress: () => {

            setMessages([
              {
                id: "welcome",

                role: "assistant",

                content:
                  "Hello 👋 I am Destiny AI. How can I help you today?",
              },
            ]);

          },

        },

      ]

    );

  };



  /*
  ========================================
  OPEN GENERATED MEDIA
  ========================================
  */

  const openMedia = async (
    url?: string
  ) => {

    if (!url) {

      Alert.alert(
        "Unavailable",
        "Media URL was not returned."
      );

      return;

    }


    try {

      await Linking.openURL(url);

    } catch {

      Alert.alert(
        "Error",
        "Unable to open this media."
      );

    }

  };



  /*
  ========================================
  MODE LABEL
  ========================================
  */

  const getPlaceholder = () => {

    if (mode === "chat") {

      return "Ask Destiny AI anything...";

    }


    if (mode === "image") {

      return "Describe the image you want to create...";

    }


    if (mode === "video") {

      return "Describe the video you want to create...";

    }


    return "Describe the music you want to create...";

  };



  /*
  ========================================
  RENDER
  ========================================
  */

  return (

    <SafeAreaView
      style={styles.container}
    >

      <StatusBar
        barStyle="light-content"
      />


      <KeyboardAvoidingView

        style={styles.keyboard}

        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }

      >


        {/* HEADER */}

        <View style={styles.header}>

          <View>

            <Text style={styles.logo}>

              DESTINY AI

            </Text>


            <Text style={styles.subtitle}>

              Your Intelligent Assistant

            </Text>

          </View>


          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearChat}
          >

            <Text style={styles.clearText}>

              Clear

            </Text>

          </TouchableOpacity>

        </View>



        {/* MODE BUTTONS */}

        <ScrollView

          horizontal

          showsHorizontalScrollIndicator={false}

          contentContainerStyle={
            styles.modeContainer
          }

        >


          <TouchableOpacity

            onPress={() =>
              setMode("chat")
            }

            style={[
              styles.modeButton,

              mode === "chat" &&
                styles.modeActive,
            ]}

          >

            <Text
              style={styles.modeText}
            >

              💬 Chat

            </Text>

          </TouchableOpacity>



          <TouchableOpacity

            onPress={() =>
              setMode("image")
            }

            style={[
              styles.modeButton,

              mode === "image" &&
                styles.modeActive,
            ]}

          >

            <Text
              style={styles.modeText}
            >

              🖼️ Image

            </Text>

          </TouchableOpacity>



          <TouchableOpacity

            onPress={() =>
              setMode("video")
            }

            style={[
              styles.modeButton,

              mode === "video" &&
                styles.modeActive,
            ]}

          >

            <Text
              style={styles.modeText}
            >

              🎥 Video

            </Text>

          </TouchableOpacity>



          <TouchableOpacity

            onPress={() =>
              setMode("music")
            }

            style={[
              styles.modeButton,

              mode === "music" &&
                styles.modeActive,
            ]}

          >

            <Text
              style={styles.modeText}
            >

              🎵 Music

            </Text>

          </TouchableOpacity>


        </ScrollView>



        {/* MESSAGES */}

        <ScrollView

          style={styles.messages}

          contentContainerStyle={
            styles.messagesContent
          }

        >


          {messages.map((message) => (

            <View

              key={message.id}

              style={[

                styles.messageBubble,

                message.role === "user"
                  ? styles.userMessage
                  : styles.aiMessage,

              ]}

            >


              <Text
                style={styles.messageText}
              >

                {message.content}

              </Text>



              {/* GENERATED IMAGE */}

              {message.type === "image" &&
                message.url && (

                <Image

                  source={{
                    uri: message.url,
                  }}

                  style={
                    styles.generatedImage
                  }

                />

              )}



              {/* VIDEO BUTTON */}

              {message.type === "video" &&
                message.url && (

                <TouchableOpacity

                  style={
                    styles.mediaButton
                  }

                  onPress={() =>
                    openMedia(message.url)
                  }

                >

                  <Text
                    style={
                      styles.mediaButtonText
                    }
                  >

                    🎥 Open Video

                  </Text>

                </TouchableOpacity>

              )}



              {/* MUSIC BUTTON */}

              {message.type === "music" &&
                message.url && (

                <TouchableOpacity

                  style={
                    styles.mediaButton
                  }

                  onPress={() =>
                    openMedia(message.url)
                  }

                >

                  <Text
                    style={
                      styles.mediaButtonText
                    }
                  >

                    🎵 Open Music

                  </Text>

                </TouchableOpacity>

              )}


            </View>

          ))}



          {loading && (

            <View
              style={styles.loading}
            >

              <ActivityIndicator
                size="small"
                color="#FFD700"
              />

              <Text
                style={styles.loadingText}
              >

                Destiny AI is working...

              </Text>

            </View>

          )}


        </ScrollView>



        {/* SELECTED IMAGE */}

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


            <Text
              style={
                styles.selectedImageText
              }
            >

              Image selected 📷

            </Text>

          </View>

        )}



        {/* INPUT */}

        <View
          style={styles.inputArea}
        >


          <TouchableOpacity

            style={
              styles.uploadButton
            }

            onPress={pickImage}

          >

            <Text
              style={
                styles.uploadText
              }
            >

              📷

            </Text>

          </TouchableOpacity>



          <TextInput

            style={styles.input}

            placeholder={
              getPlaceholder()
            }

            placeholderTextColor={
              "#7D8597"
            }

            value={prompt}

            onChangeText={
              setPrompt
            }

            multiline

          />



          <TouchableOpacity

            style={[
              styles.sendButton,

              loading &&
                styles.disabledButton,
            ]}

            onPress={sendRequest}

            disabled={loading}

          >

            <Text
              style={
                styles.sendText
              }
            >

              {loading
                ? "..."
                : "➤"}

            </Text>

          </TouchableOpacity>


        </View>


      </KeyboardAvoidingView>


    </SafeAreaView>

  );

}



/*
========================================
STYLES
========================================
*/

const styles =
  StyleSheet.create({

    container: {

      flex: 1,

      backgroundColor:
        "#07111F",

    },


    keyboard: {

      flex: 1,

    },


    header: {

      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "center",

      paddingHorizontal:
        20,

      paddingVertical:
        18,

      borderBottomWidth:
        1,

      borderBottomColor:
        "#16263A",

    },


    logo: {

      color:
        "#FFD700",

      fontSize:
        24,

      fontWeight:
        "bold",

      letterSpacing:
        1,

    },


    subtitle: {

      color:
        "#8C98A8",

      fontSize:
        12,

      marginTop:
        3,

    },


    clearButton: {

      backgroundColor:
        "#16263A",

      paddingHorizontal:
        14,

      paddingVertical:
        8,

      borderRadius:
        20,

    },


    clearText: {

      color:
        "#FFFFFF",

      fontSize:
        13,

      fontWeight:
        "600",

    },


    modeContainer: {

      paddingHorizontal:
        14,

      paddingVertical:
        12,

    },


    modeButton: {

      backgroundColor:
        "#101E30",

      paddingHorizontal:
        16,

      paddingVertical:
        10,

      borderRadius:
        22,

      marginRight:
        10,

      borderWidth:
        1,

      borderColor:
        "#1E334D",

    },


    modeActive: {

      backgroundColor:
        "#FFD700",

      borderColor:
        "#FFD700",

    },


    modeText: {

      color:
        "#FFFFFF",

      fontWeight:
        "600",

    },


    messages: {

      flex: 1,

    },


    messagesContent: {

      padding:
        15,

      paddingBottom:
        25,

    },


    messageBubble: {

      padding:
        14,

      borderRadius:
        18,

      marginBottom:
        12,

      maxWidth:
        "90%",

    },


    userMessage: {

      backgroundColor:
        "#123B63",

      alignSelf:
        "flex-end",

      borderBottomRightRadius:
        5,

    },


    aiMessage: {

      backgroundColor:
        "#101E30",

      alignSelf:
        "flex-start",

      borderBottomLeftRadius:
        5,

    },


    messageText: {

      color:
        "#FFFFFF",

      fontSize:
        16,

      lineHeight:
        23,

    },


    generatedImage: {

      width:
        260,

      height:
        260,

      borderRadius:
        15,

      marginTop:
        12,

      backgroundColor:
        "#16263A",

    },


    mediaButton: {

      backgroundColor:
        "#FFD700",

      padding:
        12,

      borderRadius:
        12,

      marginTop:
        12,

    },


    mediaButtonText: {

      color:
        "#07111F",

      fontWeight:
        "bold",

      textAlign:
        "center",

    },


    loading: {

      flexDirection:
        "row",

      alignItems:
        "center",

      padding:
        12,

    },


    loadingText: {

      color:
        "#FFD700",

      marginLeft:
        10,

    },


    selectedImageContainer: {

      flexDirection:
        "row",

      alignItems:
        "center",

      paddingHorizontal:
        15,

      paddingBottom:
        8,

    },


    selectedImage: {

      width:
        50,

      height:
        50,

      borderRadius:
        10,

    },


    selectedImageText: {

      color:
        "#FFFFFF",

      marginLeft:
        10,

    },


    inputArea: {

      flexDirection:
        "row",

      alignItems:
        "flex-end",

      paddingHorizontal:
        12,

      paddingVertical:
        12,

      backgroundColor:
        "#0B1726",

      borderTopWidth:
        1,

      borderTopColor:
        "#16263A",

    },


    uploadButton: {

      width:
        45,

      height:
        45,

      justifyContent:
        "center",

      alignItems:
        "center",

    },


    uploadText: {

      fontSize:
        23,

    },


    input: {

      flex:
        1,

      backgroundColor:
        "#101E30",

      color:
        "#FFFFFF",

      borderRadius:
        22,

      paddingHorizontal:
        16,

      paddingVertical:
        11,

      maxHeight:
        120,

      fontSize:
        16,

    },


    sendButton: {

      width:
        48,

      height:
        48,

      backgroundColor:
        "#FFD700",

      borderRadius:
        24,

      justifyContent:
        "center",

      alignItems:
        "center",

      marginLeft:
        10,

    },


    disabledButton: {

      opacity:
        0.5,

    },


    sendText: {

      fontSize:
        22,

      color:
        "#07111F",

      fontWeight:
        "bold",

    },

  });