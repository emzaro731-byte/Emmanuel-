import "react-native-url-polyfill/auto";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
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

type Screen = "chat" | "studio" | "tools" | "settings" | "profile";
type ChatMode = "Chat" | "Code" | "Study" | "Write" | "Creative";
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

const SUPABASE_URL = "https://vihbsfrwnslnmheowkhy.supabase.co";
const AI_FUNCTION_NAME = "destiny-ai";
const CHAT_STORAGE = "destiny_ai_conversations_v2";
const MEMORY_STORAGE = "destiny_ai_memory_v2";
const PROJECT_STORAGE = "destiny_ai_projects_v2";
const CANVAS_STORAGE = "destiny_ai_canvas_v2";

const C = {
  bg: "#050816",
  surface: "#0B1020",
  surface2: "#11182C",
  surface3: "#17213A",
  border: "#202B49",
  primary: "#7C5CFF",
  primary2: "#A18CFF",
  text: "#FFFFFF",
  muted: "#98A3BF",
  dim: "#68728C",
  green: "#35D49A",
  red: "#FF5C7A",
};

const id = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const now = () => new Date().toISOString();

function Icon({ name, size = 21, color = C.text }: { name: string; size?: number; color?: string }) {
  const map: Record<string, string> = {
    menu: "☰", plus: "+", send: "➤", search: "⌕", user: "◉", settings: "⚙",
    chat: "▢", studio: "✦", tools: "✧", copy: "▣", trash: "⌫", pin: "📌",
    close: "×", back: "‹", mic: "◉", image: "▧", check: "✓", bolt: "⚡",
    folder: "□", edit: "✎", more: "⋯", spark: "✦", shield: "◇",
  };
  return <Text style={{ color, fontSize: size, fontWeight: "800" }}>{map[name] ?? "•"}</Text>;
}

function newConversation(): Conversation {
  const stamp = now();
  return { id: id(), title: "New conversation", messages: [], createdAt: stamp, updatedAt: stamp, pinned: false };
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("chat");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sidebar, setSidebar] = useState(false);
  const [mode, setMode] = useState<ChatMode>("Chat");
  const [modeModal, setModeModal] = useState(false);
  const [profileModal, setProfileModal] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [studioPrompt, setStudioPrompt] = useState("");
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [memory, setMemory] = useState("");
  const [projects, setProjects] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [canvas, setCanvas] = useState("");
  const [menuModal, setMenuModal] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);
  const pulse = useRef(new Animated.Value(1)).current;

  const active = useMemo(() => conversations.find(x => x.id === activeId) ?? null, [conversations, activeId]);
  const messages = active?.messages ?? [];

  useEffect(() => {
    (async () => {
      try {
        const [stored, savedMemory, savedProjects, savedCanvas] = await Promise.all([
          AsyncStorage.getItem(CHAT_STORAGE), AsyncStorage.getItem(MEMORY_STORAGE),
          AsyncStorage.getItem(PROJECT_STORAGE), AsyncStorage.getItem(CANVAS_STORAGE),
        ]);
        const parsed = stored ? JSON.parse(stored) : [];
        if (Array.isArray(parsed) && parsed.length) {
          setConversations(parsed);
          setActiveId(parsed[0].id);
        } else {
          const first = newConversation();
          setConversations([first]);
          setActiveId(first.id);
        }
        if (savedMemory) setMemory(savedMemory);
        if (savedProjects) setProjects(JSON.parse(savedProjects));
        if (savedCanvas) setCanvas(savedCanvas);
        const { data } = await supabase.auth.getSession();
        setUserEmail(data.session?.user?.email ?? "");
      } catch (e) {
        const first = newConversation();
        setConversations([first]);
        setActiveId(first.id);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? "");
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (conversations.length) AsyncStorage.setItem(CHAT_STORAGE, JSON.stringify(conversations)).catch(() => {});
  }, [conversations]);

  useEffect(() => {
    if (!loading) return;
    const a = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.08, duration: 650, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [loading, pulse]);

  const updateConversation = (conversationId: string, fn: (x: Conversation) => Conversation) => {
    setConversations(prev => prev.map(x => x.id === conversationId ? fn(x) : x));
  };

  const createChat = () => {
    const chat = newConversation();
    setConversations(prev => [chat, ...prev]);
    setActiveId(chat.id);
    setScreen("chat");
    setSidebar(false);
    setMessage("");
  };

  const sendMessage = async () => {
    const text = message.trim();
    if (!text || loading) return;
    let conversationId = activeId;
    if (!conversationId) {
      const chat = newConversation();
      conversationId = chat.id;
      setConversations(prev => [chat, ...prev]);
      setActiveId(conversationId);
    }
    const userMessage: Message = { id: id(), role: "user", content: text, createdAt: now() };
    const history = [...(active?.messages ?? []), userMessage].map(x => ({ role: x.role, content: x.content }));
    setMessage("");
    setLoading(true);
    updateConversation(conversationId, x => ({ ...x, title: x.messages.length ? x.title : text.slice(0, 42), messages: [...x.messages, userMessage], updatedAt: now() }));
    try {
      const { data } = await supabase.auth.getSession();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/${AI_FUNCTION_NAME}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}),
        },
        body: JSON.stringify({ message: text, prompt: text, mode, memory: memoryEnabled ? memory : "", project: selectedProject, messages: history }),
      });
      const raw = await response.text();
      let result: any = {};
      try { result = raw ? JSON.parse(raw) : {}; } catch { result = { response: raw }; }
      if (!response.ok) throw new Error(result?.error || result?.message || `Server error ${response.status}`);
      const answer = String(result?.response ?? result?.answer ?? result?.message ?? result?.content ?? result?.text ?? "No response was returned.");
      updateConversation(conversationId, x => ({ ...x, messages: [...x.messages, { id: id(), role: "assistant", content: answer, createdAt: now() }], updatedAt: now() }));
    } catch (e: any) {
      updateConversation(conversationId, x => ({ ...x, messages: [...x.messages, { id: id(), role: "assistant", content: e?.message || "I couldn't connect to Destiny AI.", createdAt: now() }], updatedAt: now() }));
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
    }
  };

  const copy = (text: string) => { Clipboard.setString(text); Alert.alert("Copied", "Message copied to clipboard."); };
  const saveMemory = async (value: string) => { setMemory(value); await AsyncStorage.setItem(MEMORY_STORAGE, value); };
  const saveCanvas = async () => { await AsyncStorage.setItem(CANVAS_STORAGE, canvas); Alert.alert("Canvas saved", "Your canvas is saved on this device."); };
  const createProject = async () => {
    const name = `Project ${projects.length + 1}`;
    const next = [...projects, name];
    setProjects(next); setSelectedProject(name);
    await AsyncStorage.setItem(PROJECT_STORAGE, JSON.stringify(next));
  };

  const generateMedia = async (type: "image" | "video" | "music") => {
    const prompt = studioPrompt.trim();
    if (!prompt) { Alert.alert("Add a prompt", "Describe what you want Destiny AI to create first."); return; }
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const fn = type === "image" ? "generate-image" : type === "video" ? "generate-video" : "generate-music";
      const response = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
        method: "POST", headers: { "Content-Type": "application/json", ...(data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}) },
        body: JSON.stringify({ prompt }),
      });
      const raw = await response.text();
      let result: any = {};
      try { result = raw ? JSON.parse(raw) : {}; } catch { result = { message: raw }; }
      if (!response.ok) throw new Error(result?.error || result?.message || `Generation failed (${response.status})`);
      Alert.alert("Request sent", result?.message || `Your ${type} generation request completed.`);
    } catch (e: any) { Alert.alert("Generation failed", e?.message || "Unable to generate media."); }
    finally { setLoading(false); }
  };

  const filteredChats = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...conversations].filter(x => !q || x.title.toLowerCase().includes(q) || x.messages.some(m => m.content.toLowerCase().includes(q))).sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [conversations, search]);

  const chooseMode = (m: ChatMode) => { setMode(m); setModeModal(false); };

  const renderMessage = ({ item }: { item: Message }) => {
    const user = item.role === "user";
    return (
      <View style={[styles.messageRow, user ? styles.messageRowUser : styles.messageRowAssistant]}>
        {!user && <Animated.View style={[styles.aiAvatar, loading && { transform: [{ scale: pulse }] }]}><Text style={styles.aiAvatarText}>✦</Text></Animated.View>}
        <View style={[styles.messageWrap, user ? styles.userWrap : styles.aiWrap]}>
          <View style={[styles.bubble, user ? styles.userBubble : styles.aiBubble]}>
            <Text style={styles.messageText}>{item.content}</Text>
          </View>
          <View style={styles.messageMeta}>
            <Text style={styles.time}>{new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
            {!user && <TouchableOpacity onPress={() => copy(item.content)} style={styles.tinyButton}><Icon name="copy" size={14} color={C.dim} /></TouchableOpacity>}
          </View>
        </View>
      </View>
    );
  };

  const quickPrompt = (text: string, selectedMode: ChatMode = "Chat") => { setMode(selectedMode); setMessage(text); setScreen("chat"); };

  const renderWelcome = () => (
    <ScrollView contentContainerStyle={styles.welcome} keyboardShouldPersistTaps="handled">
      <View style={styles.heroLogo}><Text style={styles.heroLogoText}>✦</Text></View>
      <Text style={styles.heroTitle}>What can I help you with?</Text>
      <Text style={styles.heroSubtitle}>Chat, create, code, study and build with Destiny AI.</Text>
      <View style={styles.quickGrid}>
        {[
          ["Ask anything", "Explain a difficult topic", "Chat"],
          ["Build & code", "Create a React Native app", "Code"],
          ["Study", "Make me a study plan", "Study"],
          ["Write", "Write a professional email", "Write"],
        ].map(([title, prompt, m]) => (
          <TouchableOpacity key={title} style={styles.quickCard} onPress={() => quickPrompt(prompt, m as ChatMode)}>
            <Text style={styles.quickTitle}>{title}</Text><Text style={styles.quickPrompt}>{prompt}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.featureStrip}>
        <View style={styles.featureItem}><Icon name="shield" color={C.green} size={18} /><Text style={styles.featureText}>Private local history</Text></View>
        <View style={styles.featureItem}><Icon name="bolt" color={C.primary2} size={18} /><Text style={styles.featureText}>Fast AI modes</Text></View>
      </View>
    </ScrollView>
  );

  const renderChat = () => (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {messages.length === 0 ? renderWelcome() : <FlatList ref={listRef} data={messages} keyExtractor={x => x.id} renderItem={renderMessage} contentContainerStyle={styles.messageList} keyboardShouldPersistTaps="handled" onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })} />}
      {loading && <View style={styles.thinking}><ActivityIndicator size="small" color={C.primary2} /><Text style={styles.thinkingText}>Destiny AI is thinking…</Text></View>}
      <View style={styles.composerArea}>
        <View style={styles.modePillRow}>
          <TouchableOpacity style={styles.modePill} onPress={() => setModeModal(true)}><Icon name="spark" size={15} color={C.primary2} /><Text style={styles.modePillText}>{mode}</Text><Text style={styles.chevron}>▾</Text></TouchableOpacity>
          {selectedProject ? <View style={styles.projectPill}><Icon name="folder" size={13} color={C.green} /><Text style={styles.projectPillText}>{selectedProject}</Text></View> : null}
        </View>
        <View style={styles.composer}>
          <TouchableOpacity style={styles.composerButton} onPress={() => setMenuModal(true)}><Icon name="plus" size={24} color={C.muted} /></TouchableOpacity>
          <TextInput value={message} onChangeText={setMessage} placeholder="Message Destiny AI…" placeholderTextColor={C.dim} multiline style={styles.input} onSubmitEditing={() => Platform.OS !== "ios" && sendMessage()} />
          <TouchableOpacity disabled={!message.trim() || loading} onPress={sendMessage} style={[styles.sendButton, (!message.trim() || loading) && styles.sendDisabled]}><Icon name="send" size={17} color={message.trim() && !loading ? "#fff" : C.dim} /></TouchableOpacity>
        </View>
        <Text style={styles.disclaimer}>AI can make mistakes. Verify important information.</Text>
      </View>
    </KeyboardAvoidingView>
  );

  const renderStudio = () => (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <View style={styles.studioHero}><View style={styles.studioLogo}><Text style={styles.studioLogoText}>✦</Text></View><Text style={styles.pageTitle}>Destiny Studio</Text><Text style={styles.pageSubtitle}>Turn ideas into images, video and music.</Text></View>
      <Text style={styles.sectionLabel}>Describe your creation</Text>
      <View style={styles.promptBox}><TextInput value={studioPrompt} onChangeText={setStudioPrompt} multiline placeholder="A cinematic city at night, realistic lighting…" placeholderTextColor={C.dim} style={styles.studioInput} /></View>
      <Text style={styles.sectionLabel}>Create with AI</Text>
      <View style={styles.creationGrid}>
        {[["image", "Image", "Generate artwork"], ["studio", "Video", "Create a video"], ["tools", "Music", "Generate music"]].map(([icon, title, desc]) => (
          <TouchableOpacity key={title} style={styles.creationCard} onPress={() => generateMedia(title.toLowerCase() as "image" | "video" | "music")}><Text style={styles.creationEmoji}>{icon === "image" ? "🖼" : icon === "studio" ? "🎬" : "♪"}</Text><Text style={styles.creationTitle}>{title}</Text><Text style={styles.creationDesc}>{desc}</Text></TouchableOpacity>
        ))}
      </View>
      <View style={styles.infoCard}><Icon name="bolt" color={C.primary2} /><View style={styles.infoCopy}><Text style={styles.infoTitle}>Creation pipeline</Text><Text style={styles.infoText}>Prompts are sent securely to your configured Supabase Edge Functions.</Text></View></View>
    </ScrollView>
  );

  const renderTools = () => (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.pageTitle}>AI Command Center</Text><Text style={styles.pageSubtitle}>Tools that make Destiny AI feel like a real workspace.</Text>
      <View style={styles.statsRow}><View style={styles.stat}><Text style={styles.statNumber}>{conversations.length}</Text><Text style={styles.statLabel}>Chats</Text></View><View style={styles.stat}><Text style={styles.statNumber}>{projects.length}</Text><Text style={styles.statLabel}>Projects</Text></View><View style={styles.stat}><Text style={styles.statNumber}>{messages.length}</Text><Text style={styles.statLabel}>Messages</Text></View></View>
      <View style={styles.toolCard}><View style={styles.cardHeader}><View><Text style={styles.cardTitle}>Memory</Text><Text style={styles.cardSub}>Give Destiny AI reusable context.</Text></View><TouchableOpacity style={[styles.toggle, !memoryEnabled && styles.toggleOff]} onPress={() => setMemoryEnabled(v => !v)}><View style={[styles.toggleDot, !memoryEnabled && styles.toggleDotOff]} /></TouchableOpacity></View>{memoryEnabled && <TextInput value={memory} onChangeText={saveMemory} multiline placeholder="Example: I prefer concise answers…" placeholderTextColor={C.dim} style={styles.memoryInput} />}</View>
      <View style={styles.toolCard}><View style={styles.cardHeader}><View><Text style={styles.cardTitle}>Projects</Text><Text style={styles.cardSub}>Keep chats grouped by project.</Text></View><TouchableOpacity style={styles.smallPrimary} onPress={createProject}><Icon name="plus" size={16} color="#fff" /><Text style={styles.smallPrimaryText}>New</Text></TouchableOpacity></View>{projects.map(p => <TouchableOpacity key={p} style={[styles.projectRow, selectedProject === p && styles.projectSelected]} onPress={() => setSelectedProject(p)}><Icon name="folder" size={17} color={selectedProject === p ? C.primary2 : C.muted} /><Text style={styles.projectName}>{p}</Text>{selectedProject === p && <Icon name="check" size={16} color={C.green} />}</TouchableOpacity>)}</View>
      <View style={styles.toolCard}><Text style={styles.cardTitle}>Canvas</Text><Text style={styles.cardSub}>Draft longer writing or code beside your chat.</Text><TextInput value={canvas} onChangeText={setCanvas} multiline placeholder="Start a draft…" placeholderTextColor={C.dim} style={styles.canvas} /><TouchableOpacity style={styles.saveButton} onPress={saveCanvas}><Icon name="check" size={17} color="#fff" /><Text style={styles.saveButtonText}>Save canvas</Text></TouchableOpacity></View>
      <View style={styles.toolCard}><Text style={styles.cardTitle}>Specialists</Text>{[["Coder", "Code"], ["Writer", "Write"], ["Tutor", "Study"], ["Creative", "Creative"]].map(([name, m]) => <TouchableOpacity key={name} style={styles.specialistRow} onPress={() => { setMode(m as ChatMode); setScreen("chat"); }}><View style={styles.specialistIcon}><Text style={styles.specialistIconText}>{name[0]}</Text></View><View style={{ flex: 1 }}><Text style={styles.specialistName}>{name}</Text><Text style={styles.cardSub}>Open a focused {m.toLowerCase()} session.</Text></View><Icon name="more" size={19} color={C.dim} /></TouchableOpacity>)}</View>
    </ScrollView>
  );

  const renderSettings = () => (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.pageTitle}>Settings</Text><Text style={styles.pageSubtitle}>Control your Destiny AI experience.</Text>
      <View style={styles.toolCard}><Text style={styles.cardTitle}>Appearance</Text><View style={styles.settingRow}><View><Text style={styles.settingTitle}>Dark interface</Text><Text style={styles.cardSub}>Optimized for a premium night UI.</Text></View><View style={styles.toggle}><View style={styles.toggleDot} /></View></View></View>
      <View style={styles.toolCard}><Text style={styles.cardTitle}>Default AI mode</Text>{(["Chat", "Code", "Study", "Write", "Creative"] as ChatMode[]).map(m => <TouchableOpacity key={m} style={styles.settingRow} onPress={() => setMode(m)}><Text style={styles.settingTitle}>{m}</Text>{mode === m && <Icon name="check" color={C.green} size={18} />}</TouchableOpacity>)}</View>
      <TouchableOpacity style={styles.dangerButton} onPress={() => Alert.alert("Clear conversations", "Delete all local conversations?", [{ text: "Cancel", style: "cancel" }, { text: "Clear", style: "destructive", onPress: async () => { await AsyncStorage.removeItem(CHAT_STORAGE); const chat = newConversation(); setConversations([chat]); setActiveId(chat.id); } }])}><Icon name="trash" color={C.red} size={18} /><Text style={styles.dangerText}>Clear conversations</Text></TouchableOpacity>
    </ScrollView>
  );

  const logout = async () => { try { await supabase.auth.signOut(); setProfileModal(false); setUserEmail(""); } catch (e: any) { Alert.alert("Sign out failed", e?.message || "Unable to sign out."); } };

  const renderProfile = () => (
    <ScrollView contentContainerStyle={styles.profilePage}>
      <View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>{userEmail ? userEmail[0].toUpperCase() : "D"}</Text></View>
      <Text style={styles.profileName}>{userEmail ? "Destiny AI User" : "Guest"}</Text><Text style={styles.profileEmail}>{userEmail || "Not signed in"}</Text>
      <View style={styles.toolCard}><Text style={styles.cardTitle}>Account</Text><View style={styles.settingRow}><Text style={styles.settingTitle}>Email</Text><Text style={styles.profileValue}>{userEmail || "—"}</Text></View></View>
      {userEmail ? <TouchableOpacity style={styles.dangerButton} onPress={logout}><Icon name="back" color={C.red} size={19} /><Text style={styles.dangerText}>Sign out</Text></TouchableOpacity> : <View style={styles.infoCard}><Icon name="shield" color={C.green} /><View style={styles.infoCopy}><Text style={styles.infoTitle}>Guest mode</Text><Text style={styles.infoText}>You can use local chat features without signing in.</Text></View></View>}
    </ScrollView>
  );

  const renderSidebar = () => (
    <Modal visible={sidebar} transparent animationType="slide" onRequestClose={() => setSidebar(false)}>
      <View style={styles.overlay}><View style={styles.sidebar}>
        <View style={styles.sidebarHeader}><View style={styles.brand}><View style={styles.brandLogo}><Text style={styles.brandLogoText}>✦</Text></View><Text style={styles.brandText}>Destiny AI</Text></View><TouchableOpacity onPress={() => setSidebar(false)}><Icon name="close" size={27} /></TouchableOpacity></View>
        <TouchableOpacity style={styles.newChat} onPress={createChat}><Icon name="plus" size={21} color="#fff" /><Text style={styles.newChatText}>New chat</Text></TouchableOpacity>
        <View style={styles.searchBox}><Icon name="search" size={19} color={C.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="Search conversations" placeholderTextColor={C.dim} style={styles.searchInput} /></View>
        <Text style={styles.sideLabel}>RECENT</Text>
        <FlatList data={filteredChats} keyExtractor={x => x.id} renderItem={({ item }) => <TouchableOpacity style={[styles.chatItem, item.id === activeId && styles.chatItemActive]} onPress={() => { setActiveId(item.id); setScreen("chat"); setSidebar(false); }} onLongPress={() => updateConversation(item.id, x => ({ ...x, pinned: !x.pinned }))}><Icon name="chat" size={17} color={C.muted} /><View style={styles.chatInfo}><Text style={styles.chatTitle} numberOfLines={1}>{item.title}</Text><Text style={styles.chatPreview} numberOfLines={1}>{item.messages[item.messages.length - 1]?.content || "New conversation"}</Text></View>{item.pinned && <Icon name="pin" size={13} color={C.primary2} />}<TouchableOpacity onPress={() => { setConversations(prev => prev.filter(x => x.id !== item.id)); if (item.id === activeId) createChat(); }}><Icon name="trash" size={15} color={C.dim} /></TouchableOpacity></TouchableOpacity>} ListEmptyComponent={<Text style={styles.emptySide}>No conversations found.</Text>} />
      </View></View>
    </Modal>
  );

  const renderModeModal = () => <Modal visible={modeModal} transparent animationType="fade" onRequestClose={() => setModeModal(false)}><Pressable style={styles.modalOverlay} onPress={() => setModeModal(false)}><Pressable style={styles.modeModal} onPress={e => e.stopPropagation()}><Text style={styles.modalTitle}>Choose AI mode</Text>{(["Chat", "Code", "Study", "Write", "Creative"] as ChatMode[]).map(m => <TouchableOpacity key={m} style={[styles.modeOption, mode === m && styles.modeActive]} onPress={() => chooseMode(m)}><Text style={[styles.modeText, mode === m && styles.modeTextActive]}>{m}</Text>{mode === m && <Icon name="check" color={C.primary2} size={18} />}</TouchableOpacity>)}</Pressable></Pressable></Modal>;

  const renderMoreModal = () => <Modal visible={menuModal} transparent animationType="fade" onRequestClose={() => setMenuModal(false)}><Pressable style={styles.modalOverlay} onPress={() => setMenuModal(false)}><Pressable style={styles.actionModal} onPress={e => e.stopPropagation()}><Text style={styles.modalTitle}>Quick actions</Text><TouchableOpacity style={styles.actionRow} onPress={() => { setMenuModal(false); setStudioPrompt(message); setScreen("studio"); }}><Icon name="studio" color={C.primary2} /><View><Text style={styles.actionTitle}>Create in Studio</Text><Text style={styles.cardSub}>Turn your prompt into media.</Text></View></TouchableOpacity><TouchableOpacity style={styles.actionRow} onPress={() => { setMenuModal(false); setScreen("tools"); }}><Icon name="tools" color={C.primary2} /><View><Text style={styles.actionTitle}>Open AI tools</Text><Text style={styles.cardSub}>Memory, projects and canvas.</Text></View></TouchableOpacity><TouchableOpacity style={styles.actionRow} onPress={() => { setMenuModal(false); setMessage("Summarize my recent conversation"); }}><Icon name="spark" color={C.primary2} /><View><Text style={styles.actionTitle}>Smart prompt</Text><Text style={styles.cardSub}>Start with an AI-assisted request.</Text></View></TouchableOpacity></Pressable></Pressable></Modal>;

  const title = screen === "chat" ? (active?.title || "Destiny AI") : screen === "studio" ? "Studio" : screen === "tools" ? "AI Tools" : screen === "settings" ? "Settings" : "Profile";

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.app}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => screen === "chat" ? setSidebar(true) : setScreen("chat")}><Icon name={screen === "chat" ? "menu" : "back"} size={24} /></TouchableOpacity>
          <View style={styles.headerCenter}><Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>{screen === "chat" && <TouchableOpacity onPress={() => setModeModal(true)} style={styles.headerMode}><Text style={styles.headerModeText}>{mode}</Text><Text style={styles.headerChevron}>▾</Text></TouchableOpacity>}</View>
          <TouchableOpacity style={styles.headerButton} onPress={() => screen === "chat" ? createChat() : setProfileModal(true)}><Icon name={screen === "chat" ? "plus" : "user"} size={23} /></TouchableOpacity>
        </View>
        <View style={styles.content}>{screen === "chat" && renderChat()}{screen === "studio" && renderStudio()}{screen === "tools" && renderTools()}{screen === "settings" && renderSettings()}{screen === "profile" && renderProfile()}</View>
        <View style={styles.bottomNav}>{[["chat", "chat", "Chat"], ["studio", "studio", "Studio"], ["tools", "tools", "Tools"], ["settings", "settings", "Settings"], ["profile", "user", "Profile"]].map(([s, icon, label]) => <TouchableOpacity key={s} style={styles.navItem} onPress={() => setScreen(s as Screen)}><Icon name={icon} size={20} color={screen === s ? C.primary2 : C.muted} /><Text style={[styles.navText, screen === s && styles.navTextActive]}>{label}</Text></TouchableOpacity>)}</View>
      </View>
      {renderSidebar()}{renderModeModal()}{renderMoreModal()}
      <Modal visible={profileModal} transparent animationType="slide" onRequestClose={() => setProfileModal(false)}><View style={styles.modalOverlay}><View style={styles.profileModal}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Profile</Text><TouchableOpacity onPress={() => setProfileModal(false)}><Icon name="close" size={27} /></TouchableOpacity></View><View style={styles.modalAvatar}><Text style={styles.modalAvatarText}>{userEmail ? userEmail[0].toUpperCase() : "D"}</Text></View><Text style={styles.modalName}>{userEmail || "Guest account"}</Text><TouchableOpacity style={styles.actionRow} onPress={() => { setProfileModal(false); setScreen("profile"); }}><Icon name="user" color={C.primary2} /><Text style={styles.actionTitle}>View profile</Text></TouchableOpacity><TouchableOpacity style={styles.actionRow} onPress={() => { setProfileModal(false); setScreen("settings"); }}><Icon name="settings" color={C.primary2} /><Text style={styles.actionTitle}>Settings</Text></TouchableOpacity>{userEmail && <TouchableOpacity style={styles.actionRow} onPress={logout}><Icon name="back" color={C.red} /><Text style={[styles.actionTitle, { color: C.red }]}>Sign out</Text></TouchableOpacity>}</View></View></Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, safe: { flex: 1, backgroundColor: C.bg }, app: { flex: 1, backgroundColor: C.bg }, content: { flex: 1 },
  header: { height: 62, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.bg },
  headerButton: { width: 43, height: 43, borderRadius: 22, alignItems: "center", justifyContent: "center" }, headerCenter: { flex: 1, alignItems: "center", paddingHorizontal: 10 }, headerTitle: { color: C.text, fontSize: 16, fontWeight: "800", maxWidth: "88%" }, headerMode: { flexDirection: "row", alignItems: "center", marginTop: 2 }, headerModeText: { color: C.muted, fontSize: 10 }, headerChevron: { color: C.dim, fontSize: 11, marginLeft: 4 },
  welcome: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 20, paddingBottom: 45 }, heroLogo: { width: 82, height: 82, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: "#17112F", borderWidth: 1, borderColor: "#3A2C69", marginBottom: 22 }, heroLogoText: { color: C.primary2, fontSize: 45 }, heroTitle: { color: C.text, fontSize: 27, fontWeight: "900", textAlign: "center" }, heroSubtitle: { color: C.muted, fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 9, maxWidth: 350 },
  quickGrid: { width: "100%", marginTop: 28 }, quickCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 15, marginBottom: 10 }, quickTitle: { color: C.text, fontSize: 14, fontWeight: "800" }, quickPrompt: { color: C.muted, fontSize: 12, marginTop: 5 }, featureStrip: { flexDirection: "row", justifyContent: "center", gap: 18, marginTop: 10 }, featureItem: { flexDirection: "row", alignItems: "center" }, featureText: { color: C.dim, fontSize: 10, marginLeft: 5 },
  messageList: { padding: 14, paddingBottom: 25 }, messageRow: { flexDirection: "row", marginBottom: 18 }, messageRowUser: { justifyContent: "flex-end" }, messageRowAssistant: { justifyContent: "flex-start" }, aiAvatar: { width: 31, height: 31, borderRadius: 16, backgroundColor: "#17112F", borderWidth: 1, borderColor: "#3A2C69", alignItems: "center", justifyContent: "center", marginRight: 8, marginTop: 3 }, aiAvatarText: { color: C.primary2, fontSize: 17 }, messageWrap: { maxWidth: "84%" }, userWrap: { alignItems: "flex-end" }, aiWrap: { alignItems: "flex-start" }, bubble: { borderRadius: 18, paddingHorizontal: 15, paddingVertical: 12 }, userBubble: { backgroundColor: C.primary, borderBottomRightRadius: 5 }, aiBubble: { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, borderBottomLeftRadius: 5 }, messageText: { color: C.text, fontSize: 15, lineHeight: 22 }, messageMeta: { flexDirection: "row", alignItems: "center", marginTop: 4 }, time: { color: C.dim, fontSize: 9 }, tinyButton: { padding: 5 }, thinking: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 7 }, thinkingText: { color: C.muted, fontSize: 11, marginLeft: 8 },
  composerArea: { paddingHorizontal: 10, paddingTop: 7, paddingBottom: 8, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg }, modePillRow: { flexDirection: "row", alignItems: "center", marginBottom: 7 }, modePill: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, borderRadius: 15, paddingHorizontal: 10, paddingVertical: 6 }, modePillText: { color: C.text, fontSize: 10, fontWeight: "700", marginLeft: 5 }, projectPill: { flexDirection: "row", alignItems: "center", backgroundColor: "#0D2A22", borderRadius: 14, paddingHorizontal: 9, paddingVertical: 5, marginLeft: 6 }, projectPillText: { color: C.green, fontSize: 9, marginLeft: 4 }, composer: { minHeight: 51, maxHeight: 135, flexDirection: "row", alignItems: "flex-end", backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 6 }, composerButton: { width: 39, height: 39, alignItems: "center", justifyContent: "center" }, input: { flex: 1, color: C.text, fontSize: 15, maxHeight: 110, paddingHorizontal: 6, paddingVertical: 8 }, sendButton: { width: 39, height: 39, borderRadius: 20, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" }, sendDisabled: { backgroundColor: "#20263A" }, disclaimer: { color: "#4E5871", textAlign: "center", fontSize: 8, marginTop: 5 },
  bottomNav: { height: 65, flexDirection: "row", backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border }, navItem: { flex: 1, alignItems: "center", justifyContent: "center" }, navText: { color: C.muted, fontSize: 9, marginTop: 4 }, navTextActive: { color: C.primary2, fontWeight: "800" },
  page: { padding: 18, paddingBottom: 45 }, pageTitle: { color: C.text, fontSize: 27, fontWeight: "900" }, pageSubtitle: { color: C.muted, fontSize: 13, lineHeight: 20, marginTop: 5, marginBottom: 20 }, sectionLabel: { color: C.text, fontSize: 14, fontWeight: "800", marginBottom: 9, marginTop: 5 }, studioHero: { alignItems: "center", paddingVertical: 10, marginBottom: 12 }, studioLogo: { width: 65, height: 65, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "#17112F", borderWidth: 1, borderColor: "#3A2C69", marginBottom: 13 }, studioLogoText: { color: C.primary2, fontSize: 34 }, promptBox: { minHeight: 150, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 12 }, studioInput: { color: C.text, fontSize: 14, lineHeight: 21, minHeight: 125, textAlignVertical: "top" }, creationGrid: { flexDirection: "row", justifyContent: "space-between" }, creationCard: { width: "31.5%", minHeight: 130, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 12 }, creationEmoji: { fontSize: 25, marginBottom: 8 }, creationTitle: { color: C.text, fontSize: 13, fontWeight: "800" }, creationDesc: { color: C.muted, fontSize: 10, lineHeight: 15, marginTop: 5 }, infoCard: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 15, padding: 14, marginTop: 18 }, infoCopy: { flex: 1, marginLeft: 10 }, infoTitle: { color: C.text, fontSize: 12, fontWeight: "800" }, infoText: { color: C.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 15 }, stat: { width: "31.5%", backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 15, padding: 13 }, statNumber: { color: C.text, fontSize: 22, fontWeight: "900" }, statLabel: { color: C.muted, fontSize: 10, marginTop: 3 }, toolCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingHorizontal: 15, paddingVertical: 14, marginBottom: 14 }, cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, cardTitle: { color: C.text, fontSize: 14, fontWeight: "900" }, cardSub: { color: C.muted, fontSize: 10, lineHeight: 15, marginTop: 3 }, toggle: { width: 45, height: 25, borderRadius: 14, backgroundColor: C.primary, padding: 3, justifyContent: "center" }, toggleOff: { backgroundColor: "#30384F" }, toggleDot: { width: 19, height: 19, borderRadius: 10, backgroundColor: "#fff", alignSelf: "flex-end" }, toggleDotOff: { alignSelf: "flex-start" }, memoryInput: { minHeight: 85, marginTop: 11, borderWidth: 1, borderColor: C.border, borderRadius: 12, color: C.text, padding: 11, textAlignVertical: "top", fontSize: 12 }, smallPrimary: { flexDirection: "row", alignItems: "center", backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 }, smallPrimaryText: { color: "#fff", fontSize: 10, fontWeight: "800", marginLeft: 3 }, projectRow: { minHeight: 46, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#171E34", paddingHorizontal: 4 }, projectSelected: { backgroundColor: C.surface2, borderRadius: 9 }, projectName: { flex: 1, color: C.text, fontSize: 12, fontWeight: "600", marginLeft: 8 }, canvas: { minHeight: 150, marginTop: 10, borderWidth: 1, borderColor: C.border, borderRadius: 12, color: C.text, padding: 11, textAlignVertical: "top", fontSize: 12 }, saveButton: { height: 43, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: C.primary, borderRadius: 12, marginTop: 9 }, saveButtonText: { color: "#fff", fontSize: 12, fontWeight: "800", marginLeft: 7 }, specialistRow: { minHeight: 61, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#171E34" }, specialistIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: "#17112F", alignItems: "center", justifyContent: "center", marginRight: 9 }, specialistIconText: { color: C.primary2, fontWeight: "900" }, specialistName: { color: C.text, fontSize: 12, fontWeight: "800" },
  settingRow: { minHeight: 57, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#171E34" }, settingTitle: { color: C.text, fontSize: 12, fontWeight: "700" }, dangerButton: { minHeight: 50, borderRadius: 14, backgroundColor: "#21121B", borderWidth: 1, borderColor: "#512033", flexDirection: "row", alignItems: "center", justifyContent: "center" }, dangerText: { color: C.red, fontSize: 12, fontWeight: "800", marginLeft: 7 },
  profilePage: { alignItems: "center", padding: 20 }, profileAvatar: { width: 92, height: 92, borderRadius: 46, backgroundColor: C.primary, alignItems: "center", justifyContent: "center", marginTop: 25 }, profileAvatarText: { color: "#fff", fontSize: 36, fontWeight: "900" }, profileName: { color: C.text, fontSize: 21, fontWeight: "900", marginTop: 14 }, profileEmail: { color: C.muted, fontSize: 12, marginTop: 4 }, profileValue: { color: C.muted, fontSize: 11, maxWidth: "60%" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.68)" }, sidebar: { width: "88%", maxWidth: 400, flex: 1, backgroundColor: C.bg, paddingTop: Platform.OS === "android" ? 25 : 45, paddingHorizontal: 13 }, sidebarHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 19 }, brand: { flexDirection: "row", alignItems: "center" }, brandLogo: { width: 36, height: 36, borderRadius: 11, backgroundColor: "#17112F", alignItems: "center", justifyContent: "center", marginRight: 9 }, brandLogoText: { color: C.primary2, fontSize: 20 }, brandText: { color: C.text, fontSize: 17, fontWeight: "900" }, newChat: { height: 47, borderRadius: 13, backgroundColor: C.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 12 }, newChatText: { color: "#fff", fontSize: 13, fontWeight: "800", marginLeft: 7 }, searchBox: { height: 44, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, flexDirection: "row", alignItems: "center", paddingHorizontal: 11 }, searchInput: { flex: 1, color: C.text, fontSize: 12, marginLeft: 8 }, sideLabel: { color: C.muted, fontSize: 10, fontWeight: "800", marginTop: 20, marginBottom: 8 }, chatItem: { minHeight: 60, flexDirection: "row", alignItems: "center", borderRadius: 12, paddingHorizontal: 9, marginBottom: 4 }, chatItemActive: { backgroundColor: C.surface2 }, chatInfo: { flex: 1, marginLeft: 8, marginRight: 6 }, chatTitle: { color: C.text, fontSize: 12, fontWeight: "700" }, chatPreview: { color: C.muted, fontSize: 9, marginTop: 3 }, emptySide: { color: C.muted, textAlign: "center", marginTop: 25, fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "center", padding: 18 }, modeModal: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 16 }, modalTitle: { color: C.text, fontSize: 18, fontWeight: "900", marginBottom: 9 }, modeOption: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, borderRadius: 11 }, modeActive: { backgroundColor: C.surface2 }, modeText: { color: C.muted, fontSize: 13 }, modeTextActive: { color: C.text, fontWeight: "800" }, actionModal: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 16 }, actionRow: { minHeight: 55, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.surface2, borderRadius: 12, paddingHorizontal: 12, marginTop: 9 }, actionTitle: { color: C.text, fontSize: 12, fontWeight: "800" }, profileModal: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 22, padding: 19 }, modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, modalAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.primary, alignItems: "center", justifyContent: "center", alignSelf: "center", marginTop: 22 }, modalAvatarText: { color: "#fff", fontSize: 28, fontWeight: "900" }, modalName: { color: C.text, textAlign: "center", fontSize: 15, fontWeight: "800", marginTop: 10, marginBottom: 10 },
});
