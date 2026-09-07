import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'screens/chat_page.dart';
import 'screens/media_studio_page.dart';
import 'screens/payment_screen.dart';

const defaultSupabaseUrl = 'https://vihbsfrwnslnmheowkhy.supabase.co';
const defaultSupabaseKey = 'sb_publishable_j8gV4-PeFte1RMgl759uQQ_KrM_3vzK';
const gold = Color(0xFFD8B15A);
const navy = Color(0xFF050816);
const card = Color(0xFF10172B);
const muted = Color(0xFF9BA5C0);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  const url = String.fromEnvironment('SUPABASE_URL', defaultValue: defaultSupabaseUrl);
  const key = String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY', defaultValue: defaultSupabaseKey);
  try {
    await Supabase.initialize(url: url, publishableKey: key);
    runApp(const DestinyApp());
  } catch (e, st) {
    debugPrint('Startup error: $e');
    debugPrintStack(stackTrace: st);
    runApp(DestinyApp(configError: true, message: 'Destiny AI could not initialize its secure backend.\n\n$e'));
  }
}

class DestinyApp extends StatelessWidget {
  final bool configError;
  final String? message;
  const DestinyApp({super.key, this.configError = false, this.message});
  @override
  Widget build(BuildContext context) => MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'Destiny AI',
        theme: ThemeData.dark(useMaterial3: true).copyWith(
          scaffoldBackgroundColor: navy,
          colorScheme: ColorScheme.fromSeed(seedColor: gold, brightness: Brightness.dark),
          inputDecorationTheme: InputDecorationTheme(
            filled: true,
            fillColor: card,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
          ),
        ),
        home: configError ? ConfigScreen(message: message) : const AuthGate(),
      );
}

class ConfigScreen extends StatelessWidget {
  final String? message;
  const ConfigScreen({super.key, this.message});
  @override
  Widget build(BuildContext context) => Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.auto_awesome, size: 72, color: gold),
                const SizedBox(height: 18),
                const Text('Destiny AI', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w900)),
                const SizedBox(height: 12),
                Text(message ?? 'Destiny AI could not initialize.', textAlign: TextAlign.center, style: const TextStyle(color: muted, height: 1.45)),
              ],
            ),
          ),
        ),
      );
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});
  @override
  Widget build(BuildContext context) => StreamBuilder<AuthState>(
        stream: Supabase.instance.client.auth.onAuthStateChange,
        builder: (_, snap) {
          final signedIn = snap.data?.session != null || Supabase.instance.client.auth.currentSession != null;
          return signedIn ? const HomeScreen() : const LoginScreen();
        },
      );
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginState();
}

class _LoginState extends State<LoginScreen> {
  final email = TextEditingController();
  final password = TextEditingController();
  bool busy = false;
  bool register = false;
  bool obscure = true;

  @override
  void dispose() {
    email.dispose();
    password.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    final e = email.text.trim();
    final p = password.text;
    if (e.isEmpty || p.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter a valid email and a password of at least 6 characters.')));
      return;
    }
    setState(() => busy = true);
    try {
      if (register) {
        final result = await Supabase.instance.client.auth.signUp(email: e, password: p);
        if (mounted && result.session == null) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Account created. Check your email to confirm it.')));
      } else {
        await Supabase.instance.client.auth.signInWithPassword(email: e, password: p);
      }
    } on AuthException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Sign-in error: $e')));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 520),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Icon(Icons.auto_awesome, size: 72, color: gold),
                    const SizedBox(height: 14),
                    const Text('Destiny AI', textAlign: TextAlign.center, style: TextStyle(fontSize: 36, fontWeight: FontWeight.w900)),
                    const SizedBox(height: 8),
                    const Text('Your intelligent AI assistant', textAlign: TextAlign.center, style: TextStyle(color: muted)),
                    const SizedBox(height: 36),
                    TextField(controller: email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.email_outlined))),
                    const SizedBox(height: 14),
                    TextField(
                      controller: password,
                      obscureText: obscure,
                      decoration: InputDecoration(
                        labelText: 'Password',
                        prefixIcon: const Icon(Icons.lock_outline),
                        suffixIcon: IconButton(onPressed: () => setState(() => obscure = !obscure), icon: Icon(obscure ? Icons.visibility : Icons.visibility_off)),
                      ),
                    ),
                    const SizedBox(height: 20),
                    FilledButton(onPressed: busy ? null : submit, child: Padding(padding: const EdgeInsets.all(13), child: Text(busy ? 'Please wait...' : (register ? 'Create account' : 'Sign in')))),
                    TextButton(onPressed: busy ? null : () => setState(() => register = !register), child: Text(register ? 'Already have an account? Sign in' : 'New to Destiny AI? Create an account')),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeState();
}

class _HomeState extends State<HomeScreen> {
  int index = 0;
  final pages = const [ChatPage(), MediaStudioPage(), ProfilePage(), SettingsPage()];
  @override
  Widget build(BuildContext context) => Scaffold(
        body: IndexedStack(index: index, children: pages),
        bottomNavigationBar: NavigationBar(
          selectedIndex: index,
          onDestinationSelected: (value) => setState(() => index = value),
          destinations: const [
            NavigationDestination(icon: Icon(Icons.chat_bubble_outline), selectedIcon: Icon(Icons.chat_bubble), label: 'Chat'),
            NavigationDestination(icon: Icon(Icons.auto_awesome_outlined), selectedIcon: Icon(Icons.auto_awesome), label: 'Create'),
            NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profile'),
            NavigationDestination(icon: Icon(Icons.settings_outlined), selectedIcon: Icon(Icons.settings), label: 'Settings'),
          ],
        ),
      );
}

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});
  @override
  State<ProfilePage> createState() => _ProfileState();
}

class _ProfileState extends State<ProfilePage> {
  final name = TextEditingController();
  final bio = TextEditingController();
  bool editing = false;
  bool saving = false;

  @override
  void initState() { super.initState(); _loadProfile(); }
  @override
  void dispose() { name.dispose(); bio.dispose(); super.dispose(); }

  Future<void> _loadProfile() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    try {
      final row = await Supabase.instance.client.from('destiny_profiles').select('display_name, bio').eq('id', user.id).maybeSingle();
      if (!mounted) return;
      name.text = (row?['display_name'] ?? user.email?.split('@').first ?? 'Destiny User').toString();
      bio.text = (row?['bio'] ?? 'Exploring the future with Destiny AI.').toString();
      setState(() {});
    } catch (_) {}
  }

  Future<void> _saveProfile() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    setState(() => saving = true);
    try {
      await Supabase.instance.client.from('destiny_profiles').upsert({'id': user.id, 'display_name': name.text.trim(), 'bio': bio.text.trim()});
      if (mounted) {
        setState(() { saving = false; editing = false; });
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile saved.')));
      }
    } catch (e) {
      if (mounted) {
        setState(() => saving = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not save profile: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = Supabase.instance.client.auth.currentUser;
    final display = name.text.isEmpty ? (user?.email?.split('@').first ?? 'Destiny User') : name.text;
    return Scaffold(
      appBar: AppBar(title: const Text('Profile'), actions: [IconButton(onPressed: () => setState(() => editing = !editing), icon: Icon(editing ? Icons.close : Icons.edit))]),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Center(child: CircleAvatar(radius: 42, backgroundColor: gold.withValues(alpha: .14), child: Text(display.isEmpty ? 'D' : display[0].toUpperCase(), style: const TextStyle(color: gold, fontSize: 30, fontWeight: FontWeight.w900)))),
          const SizedBox(height: 14),
          Center(child: Text(display, style: const TextStyle(fontSize: 23, fontWeight: FontWeight.w900))),
          const SizedBox(height: 4),
          Center(child: Text(user?.email ?? '', style: const TextStyle(color: muted))),
          const SizedBox(height: 26),
          if (editing) ...[
            TextField(controller: name, decoration: const InputDecoration(labelText: 'Display name')),
            const SizedBox(height: 14),
            TextField(controller: bio, maxLines: 4, decoration: const InputDecoration(labelText: 'Bio')),
            const SizedBox(height: 18),
            FilledButton(onPressed: saving ? null : _saveProfile, child: Text(saving ? 'Saving...' : 'Save profile')),
          ] else ...[
            Card(color: card, child: Padding(padding: const EdgeInsets.all(18), child: Text(bio.text.isEmpty ? 'Welcome to Destiny AI.' : bio.text, style: const TextStyle(color: muted, height: 1.45)))),
            const SizedBox(height: 14),
            _InfoCard(icon: Icons.workspace_premium_outlined, title: 'Destiny AI Free', subtitle: 'Your current plan', action: 'Upgrade', onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PaymentScreen()))),
            const _InfoCard(icon: Icons.auto_awesome, title: 'AI Studio', subtitle: 'Create images, videos and music with AI.', action: 'Open'),
            const _InfoCard(icon: Icons.cloud_outlined, title: 'Cloud history', subtitle: 'Your conversations can sync with your account.', action: 'Enabled'),
          ],
        ],
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String action;
  final VoidCallback? onPressed;
  const _InfoCard({required this.icon, required this.title, required this.subtitle, required this.action, this.onPressed});
  @override
  Widget build(BuildContext context) => Card(
        color: card,
        margin: const EdgeInsets.only(bottom: 12),
        child: ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          leading: CircleAvatar(backgroundColor: gold.withValues(alpha: .12), child: Icon(icon, color: gold)),
          title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
          subtitle: Padding(padding: const EdgeInsets.only(top: 4), child: Text(subtitle, style: const TextStyle(color: muted))),
          trailing: TextButton(onPressed: onPressed, child: Text(action)),
        ),
      );
}

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});
  @override
  State<SettingsPage> createState() => _SettingsState();
}

class _SettingsState extends State<SettingsPage> {
  bool notifications = true;
  bool saveHistory = true;
  bool compact = false;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    final p = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(() {
      notifications = p.getBool('notifications') ?? true;
      saveHistory = p.getBool('save_history') ?? true;
      compact = p.getBool('compact_mode') ?? false;
    });
  }

  Future<void> _set(String key, bool value) async {
    final p = await SharedPreferences.getInstance();
    await p.setBool(key, value);
  }

  Future<void> _signOut() => Supabase.instance.client.auth.signOut();

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Settings')),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text('Preferences', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Card(color: card, child: Column(children: [
              SwitchListTile(title: const Text('Notifications'), subtitle: const Text('Receive useful Destiny AI updates'), value: notifications, onChanged: (v) { setState(() => notifications = v); _set('notifications', v); }),
              SwitchListTile(title: const Text('Save chat history'), subtitle: const Text('Keep a local backup of conversations'), value: saveHistory, onChanged: (v) { setState(() => saveHistory = v); _set('save_history', v); }),
              SwitchListTile(title: const Text('Compact interface'), subtitle: const Text('Use tighter spacing in supported screens'), value: compact, onChanged: (v) { setState(() => compact = v); _set('compact_mode', v); }),
            ])),
            const SizedBox(height: 18),
            const Text('Destiny AI', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Card(color: card, child: Column(children: [
              const ListTile(leading: Icon(Icons.psychology_outlined, color: gold), title: Text('AI modes'), subtitle: Text('Chat, Code, Study, Write and Creative')),
              const ListTile(leading: Icon(Icons.auto_awesome, color: gold), title: Text('AI Studio'), subtitle: Text('Image, video and music generation')),
              const ListTile(leading: Icon(Icons.security_outlined, color: gold), title: Text('Privacy & security'), subtitle: Text('Provider credentials stay server-side.')),
              const ListTile(leading: Icon(Icons.info_outline, color: gold), title: Text('About Destiny AI'), subtitle: Text('Version 1.0.0')),
            ])),
            const SizedBox(height: 22),
            OutlinedButton.icon(onPressed: _signOut, icon: const Icon(Icons.logout), label: const Text('Sign out')),
            const SizedBox(height: 28),
            const Center(child: Text('Destiny AI • Built for the future', style: TextStyle(color: muted))),
          ],
        ),
      );
}
