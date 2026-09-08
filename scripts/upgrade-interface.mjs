import fs from "node:fs";

const file = "App.tsx";
if (!fs.existsSync(file)) {
  console.log("upgrade-interface: App.tsx not found; skipping");
  process.exit(0);
}

let source = fs.readFileSync(file, "utf8");
let changed = false;

const replaceOnce = (from, to, label) => {
  if (source.includes(to)) return;
  if (!source.includes(from)) {
    console.log(`upgrade-interface: marker missing for ${label}`);
    return;
  }
  source = source.replace(from, to);
  changed = true;
};

// More depth and glass without adding a native UI dependency.
replaceOnce('  surface: "#0B1020",', '  surface: "rgba(11,16,32,0.78)",', "surface glass");
replaceOnce('  surface2: "#11182C",', '  surface2: "rgba(17,24,44,0.82)",', "surface2 glass");
replaceOnce('  surface3: "#17213A",', '  surface3: "rgba(23,33,58,0.88)",', "surface3 glass");
replaceOnce('  border: "#202B49",', '  border: "rgba(161,140,255,0.20)",', "glass border");
replaceOnce('  primary: "#7C5CFF",', '  primary: "#8B6CFF",', "primary");
replaceOnce('  primary2: "#A18CFF",', '  primary2: "#B8A7FF",', "primary2");

replaceOnce(
  '        <View style={styles.app}>',
  `        <View style={styles.app}>\n          <View pointerEvents="none" style={styles.glowLayer}>\n            <View style={[styles.glowOrb, styles.glowOrbOne]} />\n            <View style={[styles.glowOrb, styles.glowOrbTwo]} />\n          </View>`,
  "ambient glow"
);

replaceOnce(
  '      <Text style={styles.heroSubtitle}>Chat, create, code, study and build with Destiny AI.</Text>',
  `      <Text style={styles.heroSubtitle}>Chat, create, code, study and build with Destiny AI.</Text>\n      <TouchableOpacity activeOpacity={0.88} style={styles.premiumBanner} onPress={() => Alert.alert("Destiny AI Pro", "Unlock advanced AI features and creation tools from your Destiny AI upgrade page.")}>\n        <View style={styles.premiumIcon}><Text style={styles.premiumIconText}>✦</Text></View>\n        <View style={styles.premiumCopy}><Text style={styles.premiumTitle}>Destiny AI Pro</Text><Text style={styles.premiumSub}>Advanced creation • smarter workflows • premium workspace</Text></View>\n        <Text style={styles.premiumArrow}>›</Text>\n      </TouchableOpacity>`,
  "premium banner"
);

replaceOnce(
  '  welcome: {',
  `  glowLayer: { ...StyleSheet.absoluteFillObject, overflow: "hidden" }, glowOrb: { position: "absolute", width: 220, height: 220, borderRadius: 110, opacity: 0.10 }, glowOrbOne: { backgroundColor: C.primary, top: -100, right: -80 }, glowOrbTwo: { backgroundColor: C.primary2, bottom: 120, left: -120 },\n  premiumBanner: { width: "100%", flexDirection: "row", alignItems: "center", backgroundColor: "rgba(124,92,255,0.12)", borderWidth: 1, borderColor: "rgba(161,140,255,0.28)", borderRadius: 18, padding: 12, marginTop: 18, marginBottom: 6 }, premiumIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: "rgba(124,92,255,0.24)", alignItems: "center", justifyContent: "center" }, premiumIconText: { color: C.primary2, fontSize: 20 }, premiumCopy: { flex: 1, marginLeft: 10 }, premiumTitle: { color: C.text, fontSize: 13, fontWeight: "900" }, premiumSub: { color: C.muted, fontSize: 9, lineHeight: 14, marginTop: 2 }, premiumArrow: { color: C.primary2, fontSize: 27, fontWeight: "300", paddingHorizontal: 4 },\n  welcome: {`,
  "premium styles"
);

replaceOnce('  bottomNav: { height: 65,', '  bottomNav: { height: 70,', "bottom nav height");
replaceOnce('  header: {', '  header: {', "header");

if (changed) {
  fs.writeFileSync(file, source);
  console.log("upgrade-interface: premium glass UI applied");
} else {
  console.log("upgrade-interface: already applied");
}
