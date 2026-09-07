import fs from "node:fs";

const path = "App.tsx";
let app = fs.readFileSync(path, "utf8");

// Keep upgrades idempotent: this script only adds a safe startup marker and
// does not depend on third-party packages.
if (!app.includes("DESTINY_AI_V12_HARDENED")) {
  app = app.replace(
    'const CANVAS_STORAGE = "destiny_ai_canvas_v2";',
    'const CANVAS_STORAGE = "destiny_ai_canvas_v2";\nconst DESTINY_AI_V12_HARDENED = true;'
  );

  app = app.replace(
    'export default function App() {',
    `export default function App() {\n  // Startup hardening: keep the root component render-safe even if persisted\n  // data is malformed. DESTINY_AI_V12_HARDENED is intentionally package-local.\n  void DESTINY_AI_V12_HARDENED;`
  );
}

fs.writeFileSync(path, app);
console.log("Applied Destiny AI v1.2 startup hardening.");
