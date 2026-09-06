import fs from "node:fs";

const path = "App.tsx";
let app = fs.readFileSync(path, "utf8");

const replaceOnce = (from, to, label) => {
  if (!app.includes(from)) {
    throw new Error(`Missing feature hardening anchor: ${label}`);
  }
  app = app.replace(from, to);
};

if (app.includes("CHATGPT_FEATURES_HARDENED_V1")) {
  console.log("Feature hardening already applied.");
  process.exit(0);
}

replaceOnce(
  '  const createProject = async () => {\n    Alert.prompt(\n      "New project",\n      "Enter a project name",\n      async (name) => {\n        const value = name?.trim();\n        if (!value) return;\n        const next = [...projects, value];\n        setProjects(next);\n        setSelectedProject(value);\n        await AsyncStorage.setItem("destiny_ai_projects_v1", JSON.stringify(next));\n      }\n    );\n  };',
  '  // CHATGPT_FEATURES_HARDENED_V1\n  const createProject = async () => {\n    const value = `Project ${projects.length + 1}`;\n    const next = [...projects, value];\n    setProjects(next);\n    setSelectedProject(value);\n    await AsyncStorage.setItem("destiny_ai_projects_v1", JSON.stringify(next));\n    Alert.alert("Project created", `${value} is ready.`);\n  };',
  "Android-safe project creation"
);

replaceOnce(
  '  const chooseCustomGPT = (name: string, instructions: string) => {\n    setMessage(instructions);\n    setMode(name as ChatMode);\n    setScreen("chat");\n  };',
  '  const chooseCustomGPT = (name: string, instructions: string) => {\n    const modeMap: Record<string, ChatMode> = {\n      Coder: "Code",\n      Writer: "Write",\n      Tutor: "Study",\n      Researcher: "Chat",\n    };\n    setMode(modeMap[name] ?? "Chat");\n    setMessage(instructions);\n    setScreen("chat");\n  };',
  "safe GPT mode mapping"
);

replaceOnce(
  '          body: JSON.stringify({\n            message: text,\n            prompt: text,\n            mode,\n            messages: history,\n          }),',
  '          body: JSON.stringify({\n            message: text,\n            prompt: text,\n            mode,\n            memory: memoryEnabled ? memoryText : "",\n            project: selectedProject,\n            messages: history,\n          }),',
  "memory and project context"
);

fs.writeFileSync(path, app);
console.log("Hardened ChatGPT-style features for Android and AI context.");
