import React, { useRef, useState } from "react";

import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from "react-native";

import { StatusBar } from "expo-status-bar";

import * as ImagePicker from "expo-image-picker";

import * as Speech from "expo-speech";


const BACKEND_URL = "YOUR_BACKEND_URL";


export default function App() {

  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);

  const [selectedImage, setSelectedImage] = useState(null);

  const [plan, setPlan] = useState("Free");

  const scrollViewRef = useRef(null);


  const [messages, setMessages] = useState([

    {
      id: "welcome",
      role: "assistant",
      type: "text",
      text: "Hello! I'm Destiny AI ✦. How can I assist you today?"
    }

  ]);


  function addMessage(newMessage) {

    setMessages((oldMessages) => [

      ...oldMessages,

      {
        id: Date.now().toString(),
        ...newMessage
      }

    ]);

  }


  async function pickImage() {

    try {

      const result =
        await ImagePicker.launchImageLibraryAsync({

          mediaTypes: ["images"],

          allowsEditing: false,

          quality: 1

        });


      if (!result.canceled) {

        setSelectedImage(
          result.assets[0].uri
        );

      }

    }

    catch (error) {

      Alert.alert(
        "Error",
        "Could not select image."
      );

    }

  }


  async function sendMessage() {

    const cleanMessage =
      message.trim();


    if (!cleanMessage && !selectedImage) {

      return;

    }


    const userMessage = {

      role: "user",

      type: "text",

      text: cleanMessage,

      image: selectedImage

    };


    addMessage(userMessage);


    setMessage("");

    setSelectedImage(null);

    setLoading(true);


    try {

      /*
       SEND REQUEST TO YOUR SECURE BACKEND

       The backend decides whether to:

       - Send chat to Groq
       - Generate an image using fal.ai
      */

      const response = await fetch(

        BACKEND_URL,

        {

          method: "POST",

          headers: {

            "Content-Type": "application/json"

          },

          body: JSON.stringify({

            message: cleanMessage,

            image: userMessage.image,

            plan: plan

          })

        }

      );


      if (!response.ok) {

        throw new Error(
          "Backend request failed"
        );

      }


      const data =
        await response.json();


      /*
       EXPECTED BACKEND RESPONSE:

       {
         type: "text",
         reply: "Hello"
       }

       OR

       {
         type: "image",
         imageUrl: "https://..."
       }
      */


      if (data.type === "image") {

        addMessage({

          role: "assistant",

          type: "image",

          image: data.imageUrl,

          text:
            data.reply ||
            "Your image is ready ✦"

        });

      }

      else {

        addMessage({

          role: "assistant",

          type: "text",

          text:

            data.reply ||

            "Sorry, I could not generate a response."

        });

      }

    }

    catch (error) {

      addMessage({

        role: "assistant",

        type: "text",

        text:

          "⚠️ Could not reach Destiny AI. Please check your internet connection and backend URL."

      });

    }

    finally {

      setLoading(false);

    }

  }


  function speakMessage(text) {

    Speech.stop();

    Speech.speak(text, {

      language: "en",

      rate: 0.9

    });

  }


  function clearChat() {

    setMessages([

      {
        id: Date.now().toString(),

        role: "assistant",

        type: "text",

        text:
          "New chat started ✦ How can I help you?"
      }

    ]);

  }


  return (

    <SafeAreaView style={styles.container}>

      <StatusBar style="light" />


      {/* HEADER */}

      <View style={styles.header}>


        <View>

          <Text style={styles.logo}>

            ✦ Destiny AI

          </Text>


          <Text style={styles.planText}>

            {plan} Plan

          </Text>

        </View>


        <TouchableOpacity
          onPress={clearChat}
          style={styles.newButton}
        >

          <Text style={styles.newButtonText}>

            + New

          </Text>

        </TouchableOpacity>


      </View>


      {/* PLAN SELECTOR */}

      <View style={styles.plans}>


        {["Free", "Premium", "Pro"].map(

          (item) => (

            <TouchableOpacity

              key={item}

              onPress={() => setPlan(item)}

              style={[

                styles.planButton,

                plan === item &&
                  styles.activePlan

              ]}

            >

              <Text
                style={[

                  styles.planButtonText,

                  plan === item &&
                    styles.activePlanText

                ]}
              >

                {item}

              </Text>

            </TouchableOpacity>

          )

        )}

      </View>


      {/* CHAT */}

      <ScrollView

        ref={scrollViewRef}

        style={styles.chat}

        contentContainerStyle={
          styles.chatContent
        }

        onContentSizeChange={() =>
          scrollViewRef.current?.scrollToEnd({
            animated: true
          })
        }

      >


        {messages.map((item) => (

          <View

            key={item.id}

            style={[

              styles.messageRow,

              item.role === "user"
                ? styles.userRow
                : styles.aiRow

            ]}

          >


            <View

              style={[

                styles.messageBubble,

                item.role === "user"
                  ? styles.userBubble
                  : styles.aiBubble

              ]}

            >


              {item.image && (

                <Image

                  source={{
                    uri: item.image
                  }}

                  style={styles.messageImage}

                />

              )}


              {item.type === "image" &&
                item.image && (

                  <Image

                    source={{
                      uri: item.image
                    }}

                    style={styles.generatedImage}

                  />

                )}


              {!!item.text && (

                <Text style={styles.messageText}>

                  {item.text}

                </Text>

              )}


              {item.role === "assistant" &&
                item.type === "text" && (

                  <TouchableOpacity

                    onPress={() =>
                      speakMessage(item.text)
                    }

                    style={styles.speakButton}

                  >

                    <Text style={styles.speakText}>

                      🔊 Listen

                    </Text>

                  </TouchableOpacity>

                )}


            </View>


          </View>

        ))}


        {loading && (

          <View style={styles.loadingBox}>

            <ActivityIndicator size="small" />

            <Text style={styles.loadingText}>

              Destiny AI is thinking...

            </Text>

          </View>

        )}


      </ScrollView>


      {/* SELECTED IMAGE */}

      {selectedImage && (

        <View style={styles.previewBox}>

          <Image

            source={{
              uri: selectedImage
            }}

            style={styles.previewImage}

          />

          <TouchableOpacity
            onPress={() =>
              setSelectedImage(null)
            }
          >

            <Text style={styles.removeText}>

              ✕ Remove

            </Text>

          </TouchableOpacity>

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
            onPress={pickImage}
            style={styles.attachButton}
          >

            <Text style={styles.attachText}>

              📎

            </Text>

          </TouchableOpacity>


          <TextInput

            value={message}

            onChangeText={setMessage}

            placeholder="Message Destiny AI..."

            placeholderTextColor="#718096"

            multiline

            style={styles.input}

          />


          <TouchableOpacity

            onPress={sendMessage}

            disabled={loading}

            style={styles.sendButton}

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
    backgroundColor: "#07111f"
  },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#17283d"
  },

  logo: {
    color: "#ffffff",
    fontSize: 25,
    fontWeight: "bold"
  },

  planText: {
    color: "#8fa3ba",
    marginTop: 4
  },

  newButton: {
    backgroundColor: "#d4af37",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22
  },

  newButtonText: {
    color: "#07111f",
    fontWeight: "bold"
  },

  plans: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 8
  },

  planButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#102238"
  },

  activePlan: {
    backgroundColor: "#d4af37"
  },

  planButtonText: {
    color: "#9eb0c3",
    fontWeight: "bold"
  },

  activePlanText: {
    color: "#07111f"
  },

  chat: {
    flex: 1
  },

  chatContent: {
    padding: 16,
    paddingBottom: 25
  },

  messageRow: {
    marginBottom: 14
  },

  userRow: {
    alignItems: "flex-end"
  },

  aiRow: {
    alignItems: "flex-start"
  },

  messageBubble: {
    maxWidth: "88%",
    padding: 14,
    borderRadius: 20
  },

  userBubble: {
    backgroundColor: "#d4af37"
  },

  aiBubble: {
    backgroundColor: "#102238",
    borderWidth: 1,
    borderColor: "#1d3550"
  },

  messageText: {
    color: "#ffffff",
    fontSize: 16,
    lineHeight: 23
  },

  messageImage: {
    width: 220,
    height: 220,
    borderRadius: 14,
    marginBottom: 8
  },

  generatedImage: {
    width: 260,
    height: 260,
    borderRadius: 14,
    marginBottom: 10
  },

  speakButton: {
    marginTop: 10,
    alignSelf: "flex-start"
  },

  speakText: {
    color: "#d4af37",
    fontSize: 13
  },

  loadingBox: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    padding: 12
  },

  loadingText: {
    color: "#8fa3ba"
  },

  previewBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingBottom: 8,
    gap: 12
  },

  previewImage: {
    width: 55,
    height: 55,
    borderRadius: 10
  },

  removeText: {
    color: "#ff7b7b"
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    margin: 12,
    padding: 8,
    borderRadius: 25,
    backgroundColor: "#102238",
    borderWidth: 1,
    borderColor: "#233a55"
  },

  attachButton: {
    padding: 10
  },

  attachText: {
    fontSize: 21
  },

  input: {
    flex: 1,
    color: "#ffffff",
    minHeight: 45,
    maxHeight: 120,
    paddingHorizontal: 8,
    paddingTop: 10
  },

  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#d4af37"
  },

  sendText: {
    fontSize: 21,
    fontWeight: "bold",
    color: "#07111f"
  }

});