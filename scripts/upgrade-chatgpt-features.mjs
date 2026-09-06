import fs from "node:fs";

const path = "App.tsx";
let app = fs.readFileSync(path, "utf8");

if (app.includes("CHATGPT_FEATURES_V1")) {
  console.log("ChatGPT feature upgrade already applied.");
  process.exit(0);
}

const replaceOnce = (from, to, label) => {
  if (!app.includes(from)) {
    throw new Error(`Could not find patch anchor: ${label}`);
  }
  app = app.replace(from, to);
};

replaceOnce(
  'type Screen =\n  | "chat"\n  | "studio"\n  | "settings"\n  | "profile";',
  'type Screen =\n  | "chat"\n  | "studio"\n  | "features"\n  | "settings"\n  | "profile";',
  "Screen type"
);

replaceOnce(
  '  const [darkMode] = useState(true);\n\n  const listRef',
  '  const [darkMode] = useState(true);\n\n  // CHATGPT_FEATURES_V1\n  const [memoryEnabled, setMemoryEnabled] = useState(true);\n  const [memoryText, setMemoryText] = useState("");\n  const [canvasText, setCanvasText] = useState("");\n  const [projects, setProjects] = useState<string[]>([]);\n  const [selectedProject, setSelectedProject] = useState("");\n\n  const listRef',
  "feature state"
);

replaceOnce(
  '      if (session?.user?.email) {\n        setUserEmail(session.user.email);\n      }',
  '      if (session?.user?.email) {\n        setUserEmail(session.user.email);\n      }\n\n      const savedMemory = await AsyncStorage.getItem("destiny_ai_memory_v1");\n      const savedProjects = await AsyncStorage.getItem("destiny_ai_projects_v1");\n      const savedCanvas = await AsyncStorage.getItem("destiny_ai_canvas_v1");\n\n      if (savedMemory) setMemoryText(savedMemory);\n      if (savedProjects) {\n        try { setProjects(JSON.parse(savedProjects)); } catch {}\n      }\n      if (savedCanvas) setCanvasText(savedCanvas);',
  "load feature state"
);

replaceOnce(
  '  /* =======================================================\n     LOGOUT\n  ======================================================= */',
  '  /* =======================================================\n     CHATGPT-STYLE TOOLS\n  ======================================================= */\n\n  const saveMemory = async (value: string) => {\n    setMemoryText(value);\n    await AsyncStorage.setItem("destiny_ai_memory_v1", value);\n  };\n\n  const saveCanvas = async () => {\n    await AsyncStorage.setItem("destiny_ai_canvas_v1", canvasText);\n    Alert.alert("Canvas saved", "Your canvas is stored on this device.");\n  };\n\n  const createProject = async () => {\n    Alert.prompt(\n      "New project",\n      "Enter a project name",\n      async (name) => {\n        const value = name?.trim();\n        if (!value) return;\n        const next = [...projects, value];\n        setProjects(next);\n        setSelectedProject(value);\n        await AsyncStorage.setItem("destiny_ai_projects_v1", JSON.stringify(next));\n      }\n    );\n  };\n\n  const chooseCustomGPT = (name: string, instructions: string) => {\n    setMessage(instructions);\n    setMode(name as ChatMode);\n    setScreen("chat");\n  };\n\n  const renderFeatures = () => (\n    <ScrollView contentContainerStyle={styles.settingsContent}>\n      <Text style={styles.pageTitle}>AI Tools</Text>\n      <Text style={styles.pageSubtitle}>ChatGPT-inspired tools for Destiny AI.</Text>\n\n      <View style={styles.settingsCard}>\n        <Text style={styles.settingsHeading}>Memory</Text>\n        <View style={styles.settingRow}>\n          <View style={{ flex: 1, paddingRight: 12 }}>\n            <Text style={styles.settingTitle}>Remember useful details</Text>\n            <Text style={styles.settingDescription}>Keep a local memory that can be reused in future chats.</Text>\n          </View>\n          <TouchableOpacity\n            style={[styles.toggle, !memoryEnabled && { backgroundColor: "#30384F" }]}\n            onPress={() => setMemoryEnabled((v) => !v)}\n          >\n            <View style={[styles.toggleDot, !memoryEnabled && { alignSelf: "flex-start" }]} />\n          </TouchableOpacity>\n        </View>\n        {memoryEnabled && (\n          <TextInput\n            value={memoryText}\n            onChangeText={saveMemory}\n            placeholder="Example: I prefer concise answers..."\n            placeholderTextColor="#68718A"\n            multiline\n            style={[styles.studioInput, { minHeight: 90, marginTop: 10 }]}\n          />\n        )}\n      </View>\n\n      <View style={styles.settingsCard}>\n        <Text style={styles.settingsHeading}>Projects</Text>\n        <TouchableOpacity style={styles.newChatButton} onPress={createProject}>\n          <Icon name="plus" size={20} color="#FFFFFF" />\n          <Text style={styles.newChatText}>New project</Text>\n        </TouchableOpacity>\n        {projects.map((project) => (\n          <TouchableOpacity\n            key={project}\n            style={[styles.settingRow, selectedProject === project && { backgroundColor: COLORS.surface2 }]}\n            onPress={() => setSelectedProject(project)}\n          >\n            <Text style={styles.settingTitle}>{project}</Text>\n            {selectedProject === project && <Icon name="check" size={19} color={COLORS.success} />}\n          </TouchableOpacity>\n        ))}\n      </View>\n\n      <View style={styles.settingsCard}>\n        <Text style={styles.settingsHeading}>Canvas</Text>\n        <Text style={styles.settingDescription}>Draft, edit and refine longer text or code beside your chat.</Text>\n        <TextInput\n          value={canvasText}\n          onChangeText={setCanvasText}\n          placeholder="Start writing or paste code here..."\n          placeholderTextColor="#68718A"\n          multiline\n          style={[styles.studioInput, { minHeight: 170, marginTop: 10 }]}\n        />\n        <TouchableOpacity style={styles.uploadButton} onPress={saveCanvas}>\n          <Icon name="check" size={19} color={COLORS.text} />\n          <Text style={styles.uploadText}>Save canvas</Text>\n        </TouchableOpacity>\n      </View>\n\n      <View style={styles.settingsCard}>\n        <Text style={styles.settingsHeading}>Custom AI assistants</Text>\n        {[\n          ["Coder", "Act as an expert software engineer. Give production-ready code and explain important decisions."],\n          ["Writer", "Act as a professional editor and writer. Improve clarity, tone, structure and grammar."],\n          ["Tutor", "Act as a patient tutor. Teach step by step with examples and practice questions."],\n          ["Researcher", "Act as a careful research assistant. Separate facts from uncertainty and cite sources when available."],\n        ].map(([name, instructions]) => (\n          <TouchableOpacity key={name} style={styles.settingRow} onPress={() => chooseCustomGPT(name, instructions)}>\n            <View>\n              <Text style={styles.settingTitle}>{name}</Text>\n              <Text style={styles.settingDescription}>Use this specialist in a new chat.</Text>\n            </View>\n            <Icon name="chevron" size={18} color={COLORS.muted} />\n          </TouchableOpacity>\n        ))}\n      </View>\n\n      <View style={styles.settingsCard}>\n        <Text style={styles.settingsHeading}>Advanced capabilities</Text>\n        {[\n          ["Web Search", "Connect a web-search provider to retrieve current information."],\n          ["Deep Research", "Add a multi-step research worker with citations and source tracking."],\n          ["Files & Data Analysis", "Add native file selection and a secure analysis worker for PDFs, CSV and spreadsheets."],\n          ["Voice", "Add native speech recognition and text-to-speech for live conversations."],\n          ["Agent / Actions", "Add a permissioned action runner for external APIs and browser workflows."],\n        ].map(([name, description]) => (\n          <View key={name} style={styles.settingRow}>\n            <View style={{ flex: 1, paddingRight: 10 }}>\n              <Text style={styles.settingTitle}>{name}</Text>\n              <Text style={styles.settingDescription}>{description}</Text>\n            </View>\n            <Text style={{ color: COLORS.primary2, fontSize: 10, fontWeight: "700" }}>NEXT</Text>\n          </View>\n        ))}\n      </View>\n    </ScrollView>\n  );\n\n  /* =======================================================\n     LOGOUT\n  ======================================================= */',
  "tools screen"
);

replaceOnce(
  '    if (screen === "settings") {\n      return "Settings";\n    }',
  '    if (screen === "features") {\n      return "AI Tools";\n    }\n\n    if (screen === "settings") {\n      return "Settings";\n    }',
  "screen title"
);

replaceOnce(
  '          {screen === "studio" &&\n            renderStudio()}\n\n          {screen === "settings" &&',
  '          {screen === "studio" &&\n            renderStudio()}\n\n          {screen === "features" &&\n            renderFeatures()}\n\n          {screen === "settings" &&',
  "feature render"
);

replaceOnce(
  '          <TouchableOpacity\n            style={styles.navItem}\n            onPress={() =>\n              setScreen("settings")\n            }\n          >',
  '          <TouchableOpacity\n            style={styles.navItem}\n            onPress={() =>\n              setScreen("features")\n            }\n          >\n            <Icon\n              name="sparkle"\n              size={21}\n              color={\n                screen === "features"\n                  ? COLORS.primary2\n                  : COLORS.muted\n              }\n            />\n\n            <Text\n              style={[\n                styles.navText,\n                screen === "features" &&\n                  styles.navTextActive,\n              ]}\n            >\n              Tools\n            </Text>\n          </TouchableOpacity>\n\n          <TouchableOpacity\n            style={styles.navItem}\n            onPress={() =>\n              setScreen("settings")\n            }\n          >',
  "tools navigation"
);

replaceOnce(
  '    logout: "↪",\n    image: "▧",',
  '    logout: "↪",\n    chevron: "›",\n    image: "▧",',
  "chevron icon"
);

fs.writeFileSync(path, app);
console.log("Applied ChatGPT-style feature foundation to App.tsx");
