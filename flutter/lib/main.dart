import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'screens/media_studio_page.dart';

const defaultSupabaseUrl = 'https://vihbsfrwnslnmheowkhy.supabase.co';
const defaultSupabaseKey = 'sb_publishable_j8gV4-PeFte1RMgl759uQQ_KrM_3vzK';
const gold = Color(0xFFD8B15A);
const navy = Color(0xFF050816);
const panel = Color(0xFF0C1224);
const card = Color(0xFF111A30);
const muted = Color(0xFF9BA5C0);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  const url = String.fromEnvironment('SUPABASE_URL', defaultValue: defaultSupabaseUrl);
  const key = String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY', defaultValue: defaultSupabaseKey);
  try {
    await Supabase.initialize(url: url, publishableKey: key);
    runApp(const DestinyApp());
  } catch (e, st) {
    debugPrintStack(stackTrace: st);
    runApp(DestinyApp(configError: 'Backend initialization failed.\n$e'));
  }
}

class DestinyApp extends StatelessWidget {
  final String? configError;
  const DestinyApp({super.key, this.configError});

  @override
  Widget build(BuildContext context) {
    final scheme = ColorScheme.fromSeed(seedColor: gold, brightness: Brightness.dark);
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Destiny AI',
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        colorScheme: scheme,
        scaffoldBackgroundColor: navy,
        appBarTheme: const AppBarTheme(backgroundColor: navy, elevation: 0, centerTitle: false),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: card,
          hintStyle: const TextStyle(color: muted),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: BorderSide.none),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: BorderSide.none),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: const BorderSide(color: gold, width: 1)),
        ),
      ),
      home: configError == null ? const AuthGate() : ErrorScreen(message: configError!),
    );
  }
}

class ErrorScreen extends StatelessWidget {
  final String message;
  const ErrorScreen({super.key, required this.message});
  @override
  Widget build(BuildContext context) => Scaffold(body: Center(child: Padding(padding: const EdgeInsets.all(28), child: Column(mainAxisSize: MainAxisSize.min, children: [
    const Icon(Icons.auto_awesome, size: 70, color: gold),
    const SizedBox(height: 18),
    const Text('Destiny AI', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w900)),
    const SizedBox(height: 12),
    Text(message, textAlign: TextAlign.center, style: const TextStyle(color: muted, height: 1.5)),
  ])));
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});
  @override
  Widget build(BuildContext context) => StreamBuilder<AuthState>(
    stream: Supabase.instance.client.auth.onAuthStateChange,
    builder: (_, snap) => (snap.data?.session != null || Supabase.instance.client.auth.currentSession != null) ? const HomeShell() : const LoginScreen(),
  );
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final email = TextEditingController();
  final password = TextEditingController();
  bool register = false, busy = false, obscure = true;

  Future<void> submit() async {
    final e = email.text.trim();
    if (!e.contains('@') || password.text.length < 6) {
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
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Authentication error: $e')));
    } finally { if (mounted) setState(() => busy = false); }
  }

  @override
  Widget build(BuildContext context) => Scaffold(body: SafeArea(child: Center(child: SingleChildScrollView(padding: const EdgeInsets.all(24), child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 520), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
    Container(width: 82, height: 82, decoration: BoxDecoration(shape: BoxShape.circle, gradient: const LinearGradient(colors: [gold, Color(0xFF8E6B2B)]), boxShadow: [BoxShadow(color: gold.withValues(alpha: .2), blurRadius: 30)]), child: const Icon(Icons.auto_awesome, size: 42, color: navy)),
    const SizedBox(height: 22),
    Text(register ? 'Create your Destiny' : 'Welcome to Destiny', style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w900)),
    const SizedBox(height: 8),
    const Text('A private, intelligent workspace for chat, code, study and creation.', style: TextStyle(color: muted, height: 1.45)),
    const SizedBox(height: 28),
    TextField(controller: email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email address', prefixIcon: Icon(Icons.alternate_email))),
    const SizedBox(height: 14),
    TextField(controller: password, obscureText: obscure, decoration: InputDecoration(labelText: 'Password', prefixIcon: const Icon(Icons.lock_outline), suffixIcon: IconButton(onPressed: () => setState(() => obscure = !obscure), icon: Icon(obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined)))),
    const SizedBox(height: 20),
    FilledButton(onPressed: busy ? null : submit, style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16), backgroundColor: gold, foregroundColor: navy), child: Text(busy ? 'Please wait…' : (register ? 'Create account' : 'Sign in'), style: const TextStyle(fontWeight: FontWeight.w800))),
    TextButton(onPressed: busy ? null : () => setState(() => register = !register), child: Text(register ? 'Already have an account? Sign in' : 'New to Destiny AI? Create an account')),
  ])))));
}

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});
  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int index = 0;
  late final pages = const [ChatPage(), CreatePage(), ProfilePage(), SettingsPage()];
  @override
  Widget build(BuildContext context) => Scaffold(
    body: IndexedStack(index: index, children: pages),
    bottomNavigationBar: NavigationBar(
      backgroundColor: panel,
      indicatorColor: gold.withValues(alpha: .18),
      selectedIndex: index,
      onDestinationSelected: (i) => setState(() => index = i),
      destinations: const [
        NavigationDestination(icon: Icon(Icons.chat_bubble_outline), selectedIcon: Icon(Icons.chat_bubble, color: gold), label: 'Chat'),
        NavigationDestination(icon: Icon(Icons.auto_awesome_outlined), selectedIcon: Icon(Icons.auto_awesome, color: gold), label: 'Create'),
        NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person, color: gold), label: 'Profile'),
        NavigationDestination(icon: Icon(Icons.tune_outlined), selectedIcon: Icon(Icons.tune, color: gold), label: 'Settings'),
      ],
    ),
  );
}

class ChatPage extends StatefulWidget {
  const ChatPage({super.key});
  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  final input = TextEditingController();
  final scroll = ScrollController();
  final picker = ImagePicker();
  final messages = <Map<String, String>>[];
  String mode = 'Chat';
  XFile? attachment;
  bool busy = false;

  @override
  void initState() { super.initState(); _loadHistory(); }

  Future<void> _loadHistory() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user != null) {
        final rows = await Supabase.instance.client.from('destiny_chat_messages').select('role, content, created_at').eq('user_id', user.id).order('created_at', ascending: true).limit(80);
        if (rows.isNotEmpty) {
          final loaded = rows.map<Map<String, String>>((r) => {'role': '${r['role'] ?? 'assistant'}', 'text': '${r['content'] ?? ''}'}).where((m) => m['text']!.isNotEmpty).toList();
          if (mounted) setState(() => messages.addAll(loaded));
          return;
        }
      }
      final p = await SharedPreferences.getInstance();
      final raw = p.getString('destiny_chat_history');
      if (raw != null) {
        final list = jsonDecode(raw) as List;
        if (mounted) setState(() => messages.addAll(list.map((e) => Map<String, String>.from(e as Map))));
      }
    } catch (e) { debugPrint('History load failed: $e'); }
  }

  Future<void> _saveLocal() async {
    final p = await SharedPreferences.getInstance();
    final recent = messages.length > 80 ? messages.sublist(messages.length - 80) : messages;
    await p.setString('destiny_chat_history', jsonEncode(recent));
  }

  Future<void> _cloud(String role, String text) async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user != null && text.trim().isNotEmpty) await Supabase.instance.client.from('destiny_chat_messages').insert({'user_id': user.id, 'role': role, 'content': text.trim()});
    } catch (e) { debugPrint('Cloud save failed: $e'); }
  }

  Future<void> chooseImage() async {
    try {
      final x = await picker.pickImage(source: ImageSource.gallery, imageQuality: 82, maxWidth: 1800);
      if (x != null && mounted) setState(() => attachment = x);
    } catch (e) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Image selection failed: $e'))); }
  }

  Future<void> send() async {
    final text = input.text.trim();
    if ((text.isEmpty && attachment == null) || busy) return;
    final prompt = attachment == null ? text : '${text.isEmpty ? 'Please analyze this image.' : text}\n[Image attached: ${attachment!.name}]';
    input.clear();
    setState(() { messages.add({'role': 'user', 'text': prompt}); busy = true; attachment = null; });
    await _cloud('user', prompt);
    try {
      if (Supabase.instance.client.auth.currentSession == null) throw Exception('Your session expired. Please sign in again.');
      final r = await Supabase.instance.client.functions.invoke('destiny-ai', body: {'mode': mode, 'messages': messages.map((m) => {'role': m['role'] == 'assistant' ? 'assistant' : 'user', 'content': m['text'] ?? ''}).toList()});
      final data = r.data is Map ? Map<String, dynamic>.from(r.data as Map) : <String, dynamic>{};
      if (r.status >= 400 || data['error'] != null) throw Exception(data['error'] ?? 'AI request failed (${r.status}).');
      final answer = '${data['response'] ?? data['answer'] ?? data['message'] ?? 'No response returned.'}';
      if (mounted) setState(() => messages.add({'role': 'assistant', 'text': answer}));
      await _cloud('assistant', answer);
      await _saveLocal();
    } catch (e) {
      final error = 'I could not complete that request. $e';
      if (mounted) setState(() => messages.add({'role': 'assistant', 'text': error}));
      await _saveLocal();
    } finally {
      if (mounted) setState(() => busy = false);
      WidgetsBinding.instance.addPostFrameCallback((_) { if (scroll.hasClients) scroll.animateTo(scroll.position.maxScrollExtent, duration: const Duration(milliseconds: 300), curve: Curves.easeOut); });
    }
  }

  Future<void> clearChat() async {
    setState(() => messages.clear());
    final p = await SharedPreferences.getInstance();
    await p.remove('destiny_chat_history');
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user != null) await Supabase.instance.client.from('destiny_chat_messages').delete().eq('user_id', user.id);
    } catch (e) { debugPrint('Cloud clear failed: $e'); }
  }

  @override
  Widget build(BuildContext context) => SafeArea(child: Column(children: [
    Padding(padding: const EdgeInsets.fromLTRB(18, 14, 12, 10), child: Row(children: [
      Container(width: 42, height: 42, decoration: BoxDecoration(shape: BoxShape.circle, color: gold.withValues(alpha: .14)), child: const Icon(Icons.auto_awesome, color: gold)),
      const SizedBox(width: 12),
      const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Destiny AI', style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900)), Text('Your intelligent workspace', style: TextStyle(fontSize: 12, color: muted))])),
      PopupMenuButton<String>(onSelected: (v) { if (v == 'clear') clearChat(); }, itemBuilder: (_) => const [PopupMenuItem(value: 'clear', child: Text('Clear conversation'))]),
    ])),
    SizedBox(height: 44, child: ListView.separated(scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: 16), itemCount: 5, separatorBuilder: (_, __) => const SizedBox(width: 8), itemBuilder: (_, i) { final modes = ['Chat', 'Code', 'Study', 'Write', 'Creative']; final selected = mode == modes[i]; return ChoiceChip(label: Text(modes[i]), selected: selected, onSelected: (_) => setState(() => mode = modes[i]), selectedColor: gold.withValues(alpha: .18)); })),
    const SizedBox(height: 4),
    Expanded(child: messages.isEmpty ? const _Welcome() : ListView.builder(controller: scroll, padding: const EdgeInsets.fromLTRB(14, 18, 14, 18), itemCount: messages.length, itemBuilder: (_, i) => _Bubble(message: messages[i]))),
    if (attachment != null) Padding(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4), child: Container(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8), decoration: BoxDecoration(color: card, borderRadius: BorderRadius.circular(14)), child: Row(children: [const Icon(Icons.image_outlined, color: gold, size: 20), const SizedBox(width: 8), Expanded(child: Text(attachment!.name, overflow: TextOverflow.ellipsis)), IconButton(onPressed: () => setState(() => attachment = null), icon: const Icon(Icons.close, size: 18))]))),
    Padding(padding: const EdgeInsets.fromLTRB(12, 8, 12, 12), child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [IconButton(onPressed: busy ? null : chooseImage, icon: const Icon(Icons.add_photo_alternate_outlined)), Expanded(child: TextField(controller: input, minLines: 1, maxLines: 6, onSubmitted: (_) => send(), decoration: const InputDecoration(hintText: 'Ask Destiny anything…', contentPadding: EdgeInsets.symmetric(horizontal: 18, vertical: 14)))), const SizedBox(width: 8), SizedBox(width: 50, height: 50, child: IconButton.filled(onPressed: busy ? null : send, style: IconButton.styleFrom(backgroundColor: gold, foregroundColor: navy), icon: busy ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: navy)) : const Icon(Icons.arrow_upward_rounded)))])),
  ]));
}

class _Welcome extends StatelessWidget {
  const _Welcome();
  @override
  Widget build(BuildContext context) => Center(child: SingleChildScrollView(padding: const EdgeInsets.all(28), child: Column(children: [
    Container(width: 86, height: 86, decoration: BoxDecoration(shape: BoxShape.circle, gradient: const LinearGradient(colors: [gold, Color(0xFF806020)]), boxShadow: [BoxShadow(color: gold.withValues(alpha: .18), blurRadius: 34)]), child: const Icon(Icons.auto_awesome, color: navy, size: 44)),
    const SizedBox(height: 22),
    const Text('How can I help you today?', textAlign: TextAlign.center, style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900)),
    const SizedBox(height: 9),
    const Text('Ask questions, write code, study, create ideas or explore something new.', textAlign: TextAlign.center, style: TextStyle(color: muted, height: 1.5)),
  ]));
}

class _Bubble extends StatelessWidget {
  final Map<String, String> message;
  const _Bubble({required this.message});
  @override
  Widget build(BuildContext context) {
    final user = message['role'] == 'user';
    return Align(alignment: user ? Alignment.centerRight : Alignment.centerLeft, child: Container(margin: const EdgeInsets.only(bottom: 14), constraints: const BoxConstraints(maxWidth: 700), padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13), decoration: BoxDecoration(color: user ? const Color(0xFF24365F) : card, borderRadius: BorderRadius.only(topLeft: const Radius.circular(20), topRight: const Radius.circular(20), bottomLeft: Radius.circular(user ? 20 : 5), bottomRight: Radius.circular(user ? 5 : 20), border: Border.all(color: user ? const Color(0xFF334C7D) : Colors.white10))), child: Text(message['text'] ?? '', style: const TextStyle(fontSize: 15, height: 1.5)));
  }
}

class CreatePage extends StatelessWidget {
  const CreatePage({super.key});
  @override
  Widget build(BuildContext context) => SafeArea(child: SingleChildScrollView(padding: const EdgeInsets.all(18), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    const Text('AI Studio', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900)),
    const SizedBox(height: 6),
    const Text('Turn ideas into images, video and creative projects.', style: TextStyle(color: muted)),
    const SizedBox(height: 22),
    _StudioCard(icon: Icons.image_outlined, title: 'Image Creator', subtitle: 'Generate visual concepts and artwork', onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MediaStudioPage()))),
    _StudioCard(icon: Icons.movie_creation_outlined, title: 'Video Studio', subtitle: 'Create and transform video ideas', onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MediaStudioPage()))),
    _StudioCard(icon: Icons.auto_fix_high, title: 'Creative Assistant', subtitle: 'Prompts, scripts, stories and concepts', onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MediaStudioPage()))),
  ]));
}

class _StudioCard extends StatelessWidget {
  final IconData icon; final String title, subtitle; final VoidCallback onTap;
  const _StudioCard({required this.icon, required this.title, required this.subtitle, required this.onTap});
  @override
  Widget build(BuildContext context) => Card(color: card, margin: const EdgeInsets.only(bottom: 12), child: ListTile(contentPadding: const EdgeInsets.all(16), leading: Container(width: 50, height: 50, decoration: BoxDecoration(color: gold.withValues(alpha: .12), borderRadius: BorderRadius.circular(15)), child: Icon(icon, color: gold)), title: Text(title, style: const TextStyle(fontWeight: FontWeight.w800)), subtitle: Padding(padding: const EdgeInsets.only(top: 5), child: Text(subtitle, style: const TextStyle(color: muted))), trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 16), onTap: onTap));
}

class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key});
  @override
  Widget build(BuildContext context) { final user = Supabase.instance.client.auth.currentUser; return SafeArea(child: SingleChildScrollView(padding: const EdgeInsets.all(20), child: Column(children: [const SizedBox(height: 22), Container(width: 92, height: 92, decoration: BoxDecoration(shape: BoxShape.circle, color: gold.withValues(alpha: .15), border: Border.all(color: gold.withValues(alpha: .45))), child: const Icon(Icons.person, size: 48, color: gold)), const SizedBox(height: 16), const Text('Destiny User', style: TextStyle(fontSize: 25, fontWeight: FontWeight.w900)), const SizedBox(height: 6), Text(user?.email ?? 'Signed in', style: const TextStyle(color: muted)), const SizedBox(height: 30), Card(color: card, child: Column(children: const [ListTile(leading: Icon(Icons.verified_outlined, color: gold), title: Text('Account status'), subtitle: Text('Authenticated with Supabase')), ListTile(leading: Icon(Icons.cloud_done_outlined, color: gold), title: Text('Cloud history'), subtitle: Text('Your conversations can sync to your account'))]))])); }
}

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});
  @override
  Widget build(BuildContext context) => SafeArea(child: ListView(padding: const EdgeInsets.all(18), children: [const Text('Settings', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900)), const SizedBox(height: 8), const Text('Customize your Destiny AI experience.', style: TextStyle(color: muted)), const SizedBox(height: 22), Card(color: card, child: Column(children: [const ListTile(leading: Icon(Icons.dark_mode_outlined, color: gold), title: Text('Appearance'), subtitle: Text('Dark premium theme')), const ListTile(leading: Icon(Icons.security_outlined, color: gold), title: Text('Privacy'), subtitle: Text('Authentication and cloud data are handled by Supabase')), const ListTile(leading: Icon(Icons.info_outline, color: gold), title: Text('Version'), subtitle: Text('Destiny AI 2.0'))])), const SizedBox(height: 20), OutlinedButton.icon(onPressed: () async { await Supabase.instance.client.auth.signOut(); }, icon: const Icon(Icons.logout), label: const Text('Sign out'))]));
}
