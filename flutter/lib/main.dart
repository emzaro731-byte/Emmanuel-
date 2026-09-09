import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'services/destiny_api.dart';
import 'screens/chat_page.dart';
import 'screens/media_studio_page.dart';
import 'screens/payment_screen.dart';
import 'screens/integrations_page.dart';
import 'theme/destiny_theme.dart';

const gold = Color(0xFFD8B15A);
const navy = Color(0xFF050816);
const card = Color(0xFF10172B);
const muted = Color(0xFF9BA5C0);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const DestinyApp());
}

class DestinyApp extends StatelessWidget {
  const DestinyApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    title: 'Destiny AI',
    theme: DestinyTheme.dark(),
    themeMode: ThemeMode.dark,
    home: const AuthGate(),
  );
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});
  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  bool loading = true;
  bool signedIn = false;
  @override
  void initState() { super.initState(); _check(); }
  Future<void> _check() async {
    try { await DestinyApi.instance.me(); signedIn = true; }
    catch (_) { signedIn = false; }
    if (mounted) setState(() => loading = false);
  }
  @override
  Widget build(BuildContext context) {
    if (loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    return signedIn ? const HomeScreen() : LoginScreen(onSignedIn: () => setState(() => signedIn = true));
  }
}

class LoginScreen extends StatefulWidget {
  final VoidCallback onSignedIn;
  const LoginScreen({super.key, required this.onSignedIn});
  @override
  State<LoginScreen> createState() => _LoginState();
}
class _LoginState extends State<LoginScreen> {
  final email = TextEditingController();
  final password = TextEditingController();
  final name = TextEditingController();
  bool busy = false, register = false, obscure = true;
  @override
  void dispose() { email.dispose(); password.dispose(); name.dispose(); super.dispose(); }
  Future<void> submit() async {
    final e = email.text.trim(), p = password.text;
    if (e.isEmpty || p.length < 8) { _error('Enter a valid email and password of at least 8 characters.'); return; }
    setState(() => busy = true);
    try {
      if (register) {
        await DestinyApi.instance.register(e, p, name: name.text);
      } else {
        await DestinyApi.instance.login(e, p);
      }
      if (mounted) widget.onSignedIn();
    } catch (e) { _error(e.toString().replaceFirst('Exception: ', '')); }
    finally { if (mounted) setState(() => busy = false); }
  }
  void _error(String message) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(child: Center(child: SingleChildScrollView(padding: const EdgeInsets.all(24), child: ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 520),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const Icon(Icons.auto_awesome, size: 72, color: gold),
        const SizedBox(height: 14),
        const Text('Destiny AI', textAlign: TextAlign.center, style: TextStyle(fontSize: 36, fontWeight: FontWeight.w900)),
        const SizedBox(height: 8),
        const Text('Your intelligent AI assistant', textAlign: TextAlign.center, style: TextStyle(color: muted)),
        const SizedBox(height: 32),
        if (register) ...[TextField(controller: name, decoration: const InputDecoration(labelText: 'Name', prefixIcon: Icon(Icons.person_outline))), const SizedBox(height: 14)],
        TextField(controller: email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.email_outlined))),
        const SizedBox(height: 14),
        TextField(controller: password, obscureText: obscure, decoration: InputDecoration(labelText: 'Password', prefixIcon: const Icon(Icons.lock_outline), suffixIcon: IconButton(onPressed: () => setState(() => obscure = !obscure), icon: Icon(obscure ? Icons.visibility : Icons.visibility_off)))),
        const SizedBox(height: 20),
        FilledButton(onPressed: busy ? null : submit, child: Padding(padding: const EdgeInsets.all(13), child: Text(busy ? 'Please wait...' : (register ? 'Create account' : 'Sign in')))),
        TextButton(onPressed: busy ? null : () => setState(() => register = !register), child: Text(register ? 'Already have an account? Sign in' : 'New to Destiny AI? Create an account')),
      ]),
    ))));
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override State<HomeScreen> createState() => _HomeState();
}
class _HomeState extends State<HomeScreen> {
  int index = 0;
  final pages = const [ChatPage(), MediaStudioPage(), IntegrationsPage(), ProfilePage(), SettingsPage()];
  @override
  Widget build(BuildContext context) => Scaffold(
    body: IndexedStack(index: index, children: pages),
    bottomNavigationBar: NavigationBar(selectedIndex: index, onDestinationSelected: (v) => setState(() => index = v), destinations: const [
      NavigationDestination(icon: Icon(Icons.chat_bubble_outline), selectedIcon: Icon(Icons.chat_bubble), label: 'Chat'),
      NavigationDestination(icon: Icon(Icons.auto_awesome_outlined), selectedIcon: Icon(Icons.auto_awesome), label: 'Create'),
      NavigationDestination(icon: Icon(Icons.link_rounded), selectedIcon: Icon(Icons.link_rounded), label: 'Connect'),
      NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profile'),
      NavigationDestination(icon: Icon(Icons.settings_outlined), selectedIcon: Icon(Icons.settings), label: 'Settings'),
    ]));
}

class ProfilePage extends StatefulWidget { const ProfilePage({super.key}); @override State<ProfilePage> createState() => _ProfileState(); }
class _ProfileState extends State<ProfilePage> {
  final name = TextEditingController(), bio = TextEditingController();
  bool editing = false;
  @override void initState() { super.initState(); _load(); }
  @override void dispose() { name.dispose(); bio.dispose(); super.dispose(); }
  Future<void> _load() async { try { final u = await DestinyApi.instance.me(); name.text = '${u['name'] ?? ''}'; if (name.text.isEmpty) name.text = '${u['email'] ?? 'Destiny User'}'.split('@').first; } catch (_) {} if (mounted) setState(() {}); }
  @override Widget build(BuildContext context) { final display = name.text.isEmpty ? 'Destiny User' : name.text; return Scaffold(appBar: AppBar(title: const Text('Profile'), actions: [IconButton(onPressed: () => setState(() => editing = !editing), icon: Icon(editing ? Icons.close : Icons.edit))]), body: ListView(padding: const EdgeInsets.all(20), children: [Center(child: CircleAvatar(radius: 42, backgroundColor: gold.withValues(alpha: .14), child: Text(display[0].toUpperCase(), style: const TextStyle(color: gold, fontSize: 30, fontWeight: FontWeight.w900)))), const SizedBox(height: 14), Center(child: Text(display, style: const TextStyle(fontSize: 23, fontWeight: FontWeight.w900))), const SizedBox(height: 6), Center(child: Text('Your Destiny AI account', style: const TextStyle(color: muted))), const SizedBox(height: 26), if (editing) ...[TextField(controller: name, decoration: const InputDecoration(labelText: 'Display name')), const SizedBox(height: 14), TextField(controller: bio, maxLines: 4, decoration: const InputDecoration(labelText: 'Bio')), const SizedBox(height: 18), FilledButton(onPressed: () => setState(() => editing = false), child: const Text('Save profile'))] else ...[Card(color: card, child: Padding(padding: const EdgeInsets.all(18), child: Text(bio.text.isEmpty ? 'Exploring the future with Destiny AI.' : bio.text, style: const TextStyle(color: muted, height: 1.45)))), const SizedBox(height: 14), _InfoCard(icon: Icons.workspace_premium_outlined, title: 'Destiny AI', subtitle: 'Manage your plan', action: 'Upgrade', onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PaymentScreen()))), const _InfoCard(icon: Icons.auto_awesome, title: 'AI Studio', subtitle: 'Create images, videos and music with AI.', action: 'Open')]]); }
}
class _InfoCard extends StatelessWidget { final IconData icon; final String title, subtitle, action; final VoidCallback? onPressed; const _InfoCard({required this.icon, required this.title, required this.subtitle, required this.action, this.onPressed}); @override Widget build(BuildContext context) => Card(color: card, margin: const EdgeInsets.only(bottom: 12), child: ListTile(leading: CircleAvatar(backgroundColor: gold.withValues(alpha: .12), child: Icon(icon, color: gold)), title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)), subtitle: Text(subtitle, style: const TextStyle(color: muted)), trailing: TextButton(onPressed: onPressed, child: Text(action)))); }

class SettingsPage extends StatefulWidget { const SettingsPage({super.key}); @override State<SettingsPage> createState() => _SettingsState(); }
class _SettingsState extends State<SettingsPage> {
  bool notifications = true, saveHistory = true, compact = false;
  @override Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Settings')), body: ListView(padding: const EdgeInsets.all(16), children: [SwitchListTile(value: notifications, onChanged: (v) => setState(() => notifications = v), title: const Text('Notifications')), SwitchListTile(value: saveHistory, onChanged: (v) => setState(() => saveHistory = v), title: const Text('Save local chat history')), SwitchListTile(value: compact, onChanged: (v) => setState(() => compact = v), title: const Text('Compact mode')), const SizedBox(height: 20), ListTile(leading: const Icon(Icons.logout), title: const Text('Sign out'), onTap: () async { await DestinyApi.instance.logout(); if (context.mounted) Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const _LoggedOutScreen()), (_) => false); })]));
}
class _LoggedOutScreen extends StatelessWidget { const _LoggedOutScreen(); @override Widget build(BuildContext context) => LoginScreen(onSignedIn: () => Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const HomeScreen()), (_) => false)); }
