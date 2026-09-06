import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'screens/media_studio_page.dart';

const defaultSupabaseUrl = 'https://vihbsfrwnslnmheowkhy.supabase.co';
const gold = Color(0xFFD8B15A);
const navy = Color(0xFF050816);
const card = Color(0xFF10172B);
const muted = Color(0xFF9BA5C0);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  const url = String.fromEnvironment('SUPABASE_URL', defaultValue: defaultSupabaseUrl);
  const key = String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY', defaultValue: 'sb_publishable_j8gV4-PeFte1RMgl759uQQ_KrM_3vzK');
  if (key.isEmpty) {
    runApp(const DestinyApp(configError: true, message: 'The Supabase publishable key was not supplied to this release build.'));
    return;
  }
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
        body: Center(child: Padding(padding: const EdgeInsets.all(28), child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.auto_awesome, size: 72, color: gold),
          const SizedBox(height: 18),
          const Text('Destiny AI', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w900)),
          const SizedBox(height: 12),
          Text(message ?? 'Destiny AI could not initialize.', textAlign: TextAlign.center, style: const TextStyle(color: muted, height: 1.45)),
        ])),
      );
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});
  @override
  Widget build(BuildContext context) => StreamBuilder<AuthState>(
        stream: Supabase.instance.client.auth.onAuthStateChange,
        builder: (_, snap) => snap.data?.session != null || Supabase.instance.client.auth.currentSession != null ? const HomeScreen() : const LoginScreen(),
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
  bool busy = false, register = false, obscure = true;

  Future<void> submit() async {
    final e = email.text.trim();
    if (e.isEmpty || password.text.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter a valid email and a password of at least 6 characters.')));
      return;
    }
    setState(() => busy = true);
    try {
      if (register) {
        final r = await Supabase.instance.client.auth.signUp(email: e, password: password.text);
        if (mounted && r.session == null) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Account created. Check your email to confirm it.')));
      } else {
        await Supabase.instance.client.auth.signInWithPassword(email: e, password: password.text);
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
        body: SafeArea(child: Center(child: SingleChildScrollView(padding: const EdgeInsets.all(24), child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 520), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Icon(Icons.auto_awesome, size: 72, color: gold),
          const SizedBox(height: 14),
          const Text('Destiny AI', textAlign: TextAlign.center, style: TextStyle(fontSize: 36, fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          const Text('Your intelligent AI assistant', textAlign: TextAlign.center, style: TextStyle(color: muted)),
          const SizedBox(height: 36),
          TextField(controller: email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.email_outlined))),
          const SizedBox(height: 14),
          TextField(controller: password, obscureText: obscure, decoration: InputDecoration(labelText: 'Password', prefixIcon: const Icon(Icons.lock_outline), suffixIcon: IconButton(onPressed: () => setState(() => obscure = !obscure), icon: Icon(obscure ? Icons.visibility : Icons.visibility_off)))),
          const SizedBox(height: 20),
          FilledButton(onPressed: busy ? null : submit, child: Padding(padding: const EdgeInsets.all(13), child: Text(busy ? 'Please wait...' : (register ? 'Create account' : 'Sign in')))),
          TextButton(onPressed: busy ? null : () => setState(() => register = !register), child: Text(register ? 'Already have an account? Sign in' : 'New to Destiny AI? Create an account')),
        ])))),
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
        body: pages[index],
        bottomNavigationBar: NavigationBar(
          selectedIndex: index,
          onDestinationSelected: (i) => setState(() => index = i),
          destinations: const [
            NavigationDestination(icon: Icon(Icons.chat_bubble_outline), selectedIcon: Icon(Icons.chat_bubble), label: 'Chat'),
            NavigationDestination(icon: Icon(Icons.auto_awesome_outlined), selectedIcon: Icon(Icons.auto_awesome), label: 'Create'),
            NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profile'),
            NavigationDestination(icon: Icon(Icons.settings_outlined), selectedIcon: Icon(Icons.settings), label: 'Settings'),
          ],
        ),
      );
}

class ChatPage extends StatefulWidget {
  const ChatPage({super.key});
  @override
  State<ChatPage> createState() => _ChatState();
}

class _ChatState extends State<ChatPage> {
  final input = TextEditingController();
  final scroll = ScrollController();
  final picker = ImagePicker();
  final messages = <Map<String, String>>[];
  bool busy = false;
  String mode = 'Chat';
  XFile? attachment;

  @override
  void initState() { super.initState(); _loadHistory(); }

  Future<void> _loadHistory() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user != null) {
        final rows = await Supabase.instance.client.from('destiny_chat_messages').select('role, content, created_at').eq('user_id', user.id).order('created_at', ascending: true).limit(80);
        if (rows is List && rows.isNotEmpty) {
          final cloud = rows.map<Map<String, String>>((row) => {'role': (row['role'] ?? 'assistant').toString(), 'text': (row['content'] ?? '').toString()}).where((m) => (m['text'] ?? '').isNotEmpty).toList();
          if (mounted) setState(() => messages.addAll(cloud));
          return;
        }
      }
      final p = await SharedPreferences.getInstance();
      final raw = p.getString('destiny_chat_history');
      if (raw != null) {
        final list = (jsonDecode(raw) as List).map((x) => Map<String, String>.from(x as Map)).toList();
        if (mounted) setState(() => messages.addAll(list));
      }
    } catch (e) { debugPrint('History load failed: $e'); }
  }

  Future<void> _saveLocalHistory() async {
    final p = await SharedPreferences.getInstance();
    await p.setString('destiny_chat_history', jsonEncode(messages.takeLast(80).toList()));
  }

  Future<void> _saveCloudMessage(String role, String content) async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null || content.trim().isEmpty) return;
      await Supabase.instance.client.from('destiny_chat_messages').insert({'user_id': user.id, 'role': role, 'content': content.trim()});
    } catch (e) { debugPrint('Cloud history save failed: $e'); }
  }

  Future<void> chooseImage() async {
    try {
      final x = await picker.pickImage(source: ImageSource.gallery, imageQuality: 80, maxWidth: 1800);
      if (x != null && mounted) setState(() => attachment = x);
    } catch (e) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not select image: $e'))); }
  }

  Future<void> send() async {
    final text = input.text.trim();
    if ((text.isEmpty && attachment == null) || busy) return;
    final prompt = attachment == null ? text : '$text\n[Image attached: ${attachment!.name}]'.trim();
    input.clear();
    setState(() { messages.add({'role': 'user', 'text': prompt}); busy = true; attachment = null; });
    await _saveCloudMessage('user', prompt);
    try {
      final session = Supabase.instance.client.auth.currentSession;
      if (session == null) throw Exception('Please sign in again.');
      final r = await Supabase.instance.client.functions.invoke('destiny-ai', body: {'mode': mode, 'messages': messages.map((m) => {'role': m['role'] == 'assistant' ? 'assistant' : 'user', 'content': m['text'] ?? ''}).toList()});
      final data = r.data is Map ? Map<String, dynamic>.from(r.data as Map) : <String, dynamic>{};
      if (r.status >= 400 || data['error'] != null) throw Exception(data['error'] ?? 'AI request failed (${r.status}).');
      final answer = (data['response'] ?? data['answer'] ?? data['message'] ?? 'No response returned.').toString();
      if (mounted) setState(() => messages.add({'role': 'assistant', 'text': answer}));
      await _saveCloudMessage('assistant', answer);
      await _saveLocalHistory();
    } catch (e) {
      final errorText = 'Error: $e';
      if (mounted) setState(() => messages.add({'role': 'assistant', 'text': errorText}));
      await _saveCloudMessage('assistant', errorText);
      await _saveLocalHistory();
    } finally {
      if (mounted) setState(() => busy = false);
      WidgetsBinding.instance.addPostFrameCallback((_) { if (scroll.hasClients) scroll.animateTo(scroll.position.maxScrollExtent, duration: const Duration(milliseconds: 250), curve: Curves.easeOut); });
    }
  }

  Future<void> clearChat() async {
    setState(() => messages.clear());
    final p = await SharedPreferences.getInstance();
    await p.remove('destiny_chat_history');
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user != null) await Supabase.instance.client.from('destiny_chat_messages').delete().eq('user_id', user.id);
    } catch (e) { debugPrint('Cloud history clear failed: $e'); }
  }

  @override
  Widget build(BuildContext context) => SafeArea(child: Column(children: [
    Padding(padding: const EdgeInsets.fromLTRB(18, 16, 18, 8), child: Row(children: [
      const Expanded(child: Text('Destiny AI', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900))),
      PopupMenuButton<String>(onSelected: (v) { if (v == 'clear') clearChat(); }, itemBuilder: (_) => const [PopupMenuItem(value: 'clear', child: Text('Clear chat history'))], icon: const Icon(Icons.more_vert)),
      DropdownButton<String>(value: mode, items: ['Chat', 'Code', 'Study', 'Write', 'Creative'].map((x) => DropdownMenuItem(value: x, child: Text(x))).toList(), onChanged: (x) { if (x != null) setState(() => mode = x); }),
    ])),
    Expanded(child: messages.isEmpty ? const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [Icon(Icons.auto_awesome, size: 56, color: gold), SizedBox(height: 12), Text('How can I help you today?', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)), SizedBox(height: 6), Text('Your chat history will sync to your account.', style: TextStyle(color: muted))])) : ListView.builder(controller: scroll, padding: const EdgeInsets.all(16), itemCount: messages.length, itemBuilder: (_, i) { final m = messages[i]; final user = m['role'] == 'user'; return Align(alignment: user ? Alignment.centerRight : Alignment.centerLeft, child: Container(margin: const EdgeInsets.only(bottom: 12), padding: const EdgeInsets.all(15), constraints: const BoxConstraints(maxWidth: 650), decoration: BoxDecoration(color: user ? const Color(0xFF6D4AFF) : card, borderRadius: BorderRadius.circular(18)), child: Text(m['text'] ?? ''))); })),
    if (attachment != null) Padding(padding: const EdgeInsets.symmetric(horizontal: 14), child: Row(children: [const Icon(Icons.image_outlined, color: gold), const SizedBox(width: 8), Expanded(child: Text(attachment!.name, overflow: TextOverflow.ellipsis)), IconButton(onPressed: () => setState(() => attachment = null), icon: const Icon(Icons.close))])),
    Padding(padding: const EdgeInsets.all(12), child: Row(children: [IconButton(onPressed: busy ? null : chooseImage, icon: const Icon(Icons.add_photo_alternate_outlined)), Expanded(child: TextField(controller: input, minLines: 1, maxLines: 5, onSubmitted: (_) => send(), decoration: const InputDecoration(hintText: 'Message Destiny AI'))), const SizedBox(width: 8), IconButton.filled(onPressed: busy ? null : send, icon: busy ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.send))])),
  ]));
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

  Future<void> _loadProfile() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    try {
      final row = await Supabase.instance.client.from('destiny_profiles').select('display_name, bio').eq('id', user.id).maybeSingle();
      if (row != null && mounted) { name.text = (row['display_name'] ?? '').toString(); bio.text = (row['bio'] ?? '').toString(); }
    } catch (e) { debugPrint('Profile load failed: $e'); }
    if (mounted && name.text.isEmpty) name.text = user.email?.split('@').first ?? 'Destiny User';
  }

  Future<void> saveProfile() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null || saving) return;
    setState(() => saving = true);
    try {
      await Supabase.instance.client.from('destiny_profiles').upsert({'id': user.id, 'display_name': name.text.trim(), 'bio': bio.text.trim(), 'updated_at': DateTime.now().toIso8601String()});
      if (mounted) { setState(() => editing = false); ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile updated successfully.'))); }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not save profile: $e')));
    } finally { if (mounted) setState(() => saving = false); }
  }

  @override
  void dispose() { name.dispose(); bio.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final user = Supabase.instance.client.auth.currentUser;
    final email = user?.email ?? 'User';
    final initial = (name.text.isNotEmpty ? name.text : email).substring(0, 1).toUpperCase();
    return SafeArea(child: ListView(padding: const EdgeInsets.fromLTRB(18, 20, 18, 30), children: [
      Row(children: [const Expanded(child: Text('Profile', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w900))), IconButton(onPressed: () => setState(() => editing = !editing), icon: Icon(editing ? Icons.close : Icons.edit_outlined))]),
      const SizedBox(height: 22),
      Center(child: Container(width: 96, height: 96, decoration: BoxDecoration(shape: BoxShape.circle, gradient: LinearGradient(colors: [gold, gold.withValues(alpha: .45)])), child: Center(child: Text(initial, style: const TextStyle(fontSize: 38, fontWeight: FontWeight.w900, color: navy))))),
      const SizedBox(height: 14),
      Text(name.text.isEmpty ? 'Destiny User' : name.text, textAlign: TextAlign.center, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
      const SizedBox(height: 5),
      Text(email, textAlign: TextAlign.center, style: const TextStyle(color: muted)),
      const SizedBox(height: 22),
      if (editing) ...[
        TextField(controller: name, textCapitalization: TextCapitalization.words, decoration: const InputDecoration(labelText: 'Display name', prefixIcon: Icon(Icons.person_outline))),
        const SizedBox(height: 14),
        TextField(controller: bio, minLines: 2, maxLines: 4, decoration: const InputDecoration(labelText: 'Bio', hintText: 'Tell people a little about you...', prefixIcon: Icon(Icons.notes_outlined))),
        const SizedBox(height: 14),
        FilledButton.icon(onPressed: saving ? null : saveProfile, icon: saving ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.save_outlined), label: Text(saving ? 'Saving...' : 'Save profile')),
        const SizedBox(height: 20),
      ],
      _ProfileCard(icon: Icons.workspace_premium_outlined, title: 'Free plan', subtitle: 'Upgrade to unlock higher AI limits and premium creation features.', action: 'Upgrade', onTap: () => _showUpgrade(context)),
      _ProfileCard(icon: Icons.auto_awesome_outlined, title: 'AI Studio', subtitle: 'Create images, videos and music with Destiny AI.', action: 'Open', onTap: () => _showInfo(context, 'AI Studio is available from the Create tab.')),
      _ProfileCard(icon: Icons.history_outlined, title: 'Cloud history', subtitle: 'Your recent conversations are linked to your account.', action: 'Secure', onTap: () => _showInfo(context, 'Your chat history is stored under your signed-in account with Supabase access policies.')),
      _ProfileCard(icon: Icons.verified_user_outlined, title: 'Account security', subtitle: 'Manage your signed-in account and keep provider keys protected.', action: 'Protected', onTap: () => _showInfo(context, 'Provider credentials stay server-side and are not shipped in the APK.')),
    ]));
  }

  void _showUpgrade(BuildContext context) => showModalBottomSheet(context: context, backgroundColor: card, showDragHandle: true, builder: (_) => Padding(padding: const EdgeInsets.fromLTRB(22, 8, 22, 28), child: Column(mainAxisSize: MainAxisSize.min, children: [const Icon(Icons.workspace_premium, color: gold, size: 48), const SizedBox(height: 10), const Text('Destiny AI Pro', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900)), const SizedBox(height: 8), const Text('Premium AI limits, faster creation and more media capabilities.', textAlign: TextAlign.center, style: TextStyle(color: muted)), const SizedBox(height: 18), FilledButton.icon(onPressed: () { Navigator.pop(context); _showInfo(context, 'Payments can be connected to your preferred secure payment provider.'); }, icon: const Icon(Icons.arrow_upward), label: const Text('Continue to upgrade'))])));
  void _showInfo(BuildContext context, String text) => showDialog(context: context, builder: (_) => AlertDialog(title: const Text('Destiny AI'), content: Text(text), actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK'))]));
}

class _ProfileCard extends StatelessWidget {
  final IconData icon; final String title; final String subtitle; final String action; final VoidCallback onTap;
  const _ProfileCard({required this.icon, required this.title, required this.subtitle, required this.action, required this.onTap});
  @override
  Widget build(BuildContext context) => Card(color: card, margin: const EdgeInsets.only(bottom: 12), child: ListTile(contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8), leading: CircleAvatar(backgroundColor: gold.withValues(alpha: .12), child: Icon(icon, color: gold)), title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)), subtitle: Padding(padding: const EdgeInsets.only(top: 4), child: Text(subtitle, style: const TextStyle(color: muted))), trailing: TextButton(onPressed: onTap, child: Text(action)));
}

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});
  @override
  State<SettingsPage> createState() => _SettingsState();
}

class _SettingsState extends State<SettingsPage> {
  bool notifications = true;
  bool saveHistory = true;
  bool compactMode = false;

  Future<void> _load() async {
    final p = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(() { notifications = p.getBool('notifications') ?? true; saveHistory = p.getBool('save_history') ?? true; compactMode = p.getBool('compact_mode') ?? false; });
  }
  Future<void> _set(String key, bool value) async { final p = await SharedPreferences.getInstance(); await p.setBool(key, value); }
  @override
  void initState() { super.initState(); _load(); }

  @override
  Widget build(BuildContext context) => SafeArea(child: ListView(padding: const EdgeInsets.fromLTRB(18, 20, 18, 30), children: [
    const Text('Settings', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w900)),
    const SizedBox(height: 6),
    const Text('Customize your Destiny AI experience.', style: TextStyle(color: muted)),
    const SizedBox(height: 22),
    const _SettingsHeader('Account'),
    _SettingsTile(icon: Icons.person_outline, title: 'Profile', subtitle: 'Edit your display name and bio', onTap: () => _info(context, 'Open the Profile tab to edit your account profile.')),
    _SettingsTile(icon: Icons.lock_outline, title: 'Privacy & security', subtitle: 'Secure authentication and provider credentials', onTap: () => _info(context, 'Destiny AI keeps provider credentials on the server and uses your signed-in Supabase session.')),
    _SettingsTile(icon: Icons.workspace_premium_outlined, title: 'Subscription', subtitle: 'Free plan • Upgrade options', onTap: () => _info(context, 'Premium billing can be connected to a secure payment provider.')),
    const _SettingsHeader('AI & Chat'),
    SwitchListTile(contentPadding: EdgeInsets.zero, secondary: const Icon(Icons.notifications_none), title: const Text('Notifications'), subtitle: const Text('Show app notifications'), value: notifications, onChanged: (v) { setState(() => notifications = v); _set('notifications', v); }),
    SwitchListTile(contentPadding: EdgeInsets.zero, secondary: const Icon(Icons.history), title: const Text('Save chat history'), subtitle: const Text('Keep local and cloud conversation history'), value: saveHistory, onChanged: (v) { setState(() => saveHistory = v); _set('save_history', v); }),
    SwitchListTile(contentPadding: EdgeInsets.zero, secondary: const Icon(Icons.view_compact_outlined), title: const Text('Compact interface'), subtitle: const Text('Use tighter spacing in supported screens'), value: compactMode, onChanged: (v) { setState(() => compactMode = v); _set('compact_mode', v); }),
    _SettingsTile(icon: Icons.tune, title: 'AI modes', subtitle: 'Chat, Code, Study, Write and Creative', onTap: () => _info(context, 'Choose your AI mode from the selector at the top of Chat.')),
    _SettingsTile(icon: Icons.auto_awesome, title: 'AI Studio', subtitle: 'Image, video and music creation', onTap: () => _info(context, 'Use the Create tab for AI media generation.')),
    const _SettingsHeader('Data'),
    _SettingsTile(icon: Icons.delete_outline, title: 'Clear local settings', subtitle: 'Reset saved preferences on this device', onTap: () async { final p = await SharedPreferences.getInstance(); await p.clear(); if (mounted) { setState(() { notifications = true; saveHistory = true; compactMode = false; }); ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Local preferences reset.'))); } }),
    _SettingsTile(icon: Icons.info_outline, title: 'About Destiny AI', subtitle: 'Premium AI assistant • Version 1.0.0', onTap: () => _info(context, 'Destiny AI combines chat, cloud history and AI media creation in one app.')),
    const SizedBox(height: 18),
    FilledButton.tonalIcon(onPressed: () => Supabase.instance.client.auth.signOut(), icon: const Icon(Icons.logout), label: const Text('Sign out')),
  ]));

  void _info(BuildContext context, String text) => showDialog(context: context, builder: (_) => AlertDialog(title: const Text('Destiny AI'), content: Text(text), actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK'))]));
}

class _SettingsHeader extends StatelessWidget {
  final String text;
  const _SettingsHeader(this.text);
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(top: 20, bottom: 8), child: Text(text.toUpperCase(), style: const TextStyle(color: gold, fontSize: 12, fontWeight: FontWeight.w800, letterSpacing: 1.2)));
}

class _SettingsTile extends StatelessWidget {
  final IconData icon; final String title; final String subtitle; final VoidCallback onTap;
  const _SettingsTile({required this.icon, required this.title, required this.subtitle, required this.onTap});
  @override
  Widget build(BuildContext context) => Card(color: card, margin: const EdgeInsets.only(bottom: 8), child: ListTile(onTap: onTap, leading: Icon(icon, color: gold), title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)), subtitle: Text(subtitle, style: const TextStyle(color: muted)), trailing: const Icon(Icons.chevron_right)));
}

extension<T> on Iterable<T> {
  Iterable<T> takeLast(int count) { final list = toList(); return list.length <= count ? list : list.sublist(list.length - count); }
}
