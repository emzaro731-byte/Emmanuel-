import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const defaultSupabaseUrl = 'https://vihbsfrwnslnmheowkhy.supabase.co';
const gold = Color(0xFFD8B15A);
const navy = Color(0xFF050816);
const card = Color(0xFF10172B);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  const url = String.fromEnvironment('SUPABASE_URL', defaultValue: defaultSupabaseUrl);
  const key = String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY');
  if (key.isEmpty) {
    runApp(const DestinyApp(configError: true));
    return;
  }
  await Supabase.initialize(url: url, publishableKey: key);
  runApp(const DestinyApp());
}

class DestinyApp extends StatelessWidget {
  final bool configError;
  const DestinyApp({super.key, this.configError = false});
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
        home: configError ? const ConfigScreen() : const AuthGate(),
      );
}

class ConfigScreen extends StatelessWidget {
  const ConfigScreen({super.key});
  @override
  Widget build(BuildContext context) => const Scaffold(
        body: Center(
          child: Padding(
            padding: EdgeInsets.all(28),
            child: Text('Destiny AI needs its Supabase publishable key. The GitHub Actions build supplies it securely.', textAlign: TextAlign.center),
          ),
        ),
      );
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});
  @override
  Widget build(BuildContext context) => StreamBuilder<AuthState>(
        stream: Supabase.instance.client.auth.onAuthStateChange,
        builder: (_, snap) => snap.data?.session != null || Supabase.instance.client.auth.currentSession != null
            ? const HomeScreen()
            : const LoginScreen(),
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
        if (mounted && r.session == null) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Account created. Check your email to confirm it.')));
        }
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
                    const Text('Your intelligent AI assistant', textAlign: TextAlign.center, style: TextStyle(color: Color(0xFF9BA5C0))),
                    const SizedBox(height: 36),
                    TextField(controller: email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.email_outlined))),
                    const SizedBox(height: 14),
                    TextField(controller: password, obscureText: obscure, decoration: InputDecoration(labelText: 'Password', prefixIcon: const Icon(Icons.lock_outline), suffixIcon: IconButton(onPressed: () => setState(() => obscure = !obscure), icon: Icon(obscure ? Icons.visibility : Icons.visibility_off)))),
                    const SizedBox(height: 20),
                    FilledButton(onPressed: busy ? null : submit, child: Padding(padding: const EdgeInsets.all(13), child: Text(busy ? 'Please wait...' : (register ? 'Create account' : 'Sign in')))),
                    const SizedBox(height: 10),
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
  final pages = const [ChatPage(), ProfilePage(), SettingsPage()];
  @override
  Widget build(BuildContext context) => Scaffold(
        body: pages[index],
        bottomNavigationBar: NavigationBar(
          selectedIndex: index,
          onDestinationSelected: (i) => setState(() => index = i),
          destinations: const [
            NavigationDestination(icon: Icon(Icons.chat_bubble_outline), selectedIcon: Icon(Icons.chat_bubble), label: 'Chat'),
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
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    final p = await SharedPreferences.getInstance();
    final raw = p.getString('destiny_chat_history');
    if (raw == null) return;
    try {
      final list = (jsonDecode(raw) as List).map((x) => Map<String, String>.from(x as Map)).toList();
      if (mounted) setState(() => messages.addAll(list));
    } catch (_) {}
  }

  Future<void> _saveHistory() async {
    final p = await SharedPreferences.getInstance();
    await p.setString('destiny_chat_history', jsonEncode(messages.takeLast(80).toList()));
  }

  Future<void> chooseImage() async {
    final x = await picker.pickImage(source: ImageSource.gallery, imageQuality: 80, maxWidth: 1800);
    if (x != null && mounted) setState(() => attachment = x);
  }

  Future<void> send() async {
    final text = input.text.trim();
    if ((text.isEmpty && attachment == null) || busy) return;
    final prompt = attachment == null ? text : '$text\n[Image attached: ${attachment!.name}]'.trim();
    input.clear();
    setState(() {
      messages.add({'role': 'user', 'text': prompt});
      busy = true;
      attachment = null;
    });
    try {
      final session = Supabase.instance.client.auth.currentSession;
      if (session == null) throw Exception('Please sign in again.');
      final r = await Supabase.instance.client.functions.invoke('destiny-ai', body: {
        'mode': mode,
        'messages': messages.map((m) => {'role': m['role'] == 'assistant' ? 'assistant' : 'user', 'content': m['text'] ?? ''}).toList(),
      });
      final data = r.data is Map ? Map<String, dynamic>.from(r.data as Map) : <String, dynamic>{};
      if (r.status >= 400 || data['error'] != null) throw Exception(data['error'] ?? 'AI request failed (${r.status}).');
      final answer = (data['response'] ?? data['answer'] ?? data['message'] ?? 'No response returned.').toString();
      setState(() => messages.add({'role': 'assistant', 'text': answer}));
      await _saveHistory();
    } catch (e) {
      setState(() => messages.add({'role': 'assistant', 'text': 'Error: $e'}));
    } finally {
      if (mounted) setState(() => busy = false);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (scroll.hasClients) scroll.animateTo(scroll.position.maxScrollExtent, duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
      });
    }
  }

  Future<void> clearChat() async {
    setState(() => messages.clear());
    final p = await SharedPreferences.getInstance();
    await p.remove('destiny_chat_history');
  }

  @override
  Widget build(BuildContext context) => SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 16, 18, 8),
              child: Row(children: [
                const Expanded(child: Text('Destiny AI', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900))),
                PopupMenuButton<String>(onSelected: (v) { if (v == 'clear') clearChat(); }, itemBuilder: (_) => const [PopupMenuItem(value: 'clear', child: Text('Clear chat'))], icon: const Icon(Icons.more_vert)),
                DropdownButton<String>(value: mode, items: ['Chat', 'Code', 'Study', 'Write', 'Creative'].map((x) => DropdownMenuItem(value: x, child: Text(x))).toList(), onChanged: (x) { if (x != null) setState(() => mode = x); }),
              ]),
            ),
            Expanded(
              child: messages.isEmpty
                  ? const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [Icon(Icons.auto_awesome, size: 56, color: gold), SizedBox(height: 12), Text('How can I help you today?', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)), SizedBox(height: 6), Text('Ask anything or choose a mode above.', style: TextStyle(color: Color(0xFF9BA5C0)))]))
                  : ListView.builder(controller: scroll, padding: const EdgeInsets.all(16), itemCount: messages.length, itemBuilder: (_, i) {
                      final m = messages[i];
                      final user = m['role'] == 'user';
                      return Align(alignment: user ? Alignment.centerRight : Alignment.centerLeft, child: Container(margin: const EdgeInsets.only(bottom: 12), padding: const EdgeInsets.all(15), constraints: const BoxConstraints(maxWidth: 650), decoration: BoxDecoration(color: user ? const Color(0xFF6D4AFF) : card, borderRadius: BorderRadius.circular(18)), child: Text(m['text'] ?? '')));
                    }),
            ),
            if (attachment != null) Padding(padding: const EdgeInsets.symmetric(horizontal: 14), child: Row(children: [const Icon(Icons.image_outlined, color: gold), const SizedBox(width: 8), Expanded(child: Text(attachment!.name, overflow: TextOverflow.ellipsis)), IconButton(onPressed: () => setState(() => attachment = null), icon: const Icon(Icons.close))])),
            Padding(padding: const EdgeInsets.all(12), child: Row(children: [IconButton(onPressed: busy ? null : chooseImage, icon: const Icon(Icons.add_photo_alternate_outlined)), Expanded(child: TextField(controller: input, minLines: 1, maxLines: 5, onSubmitted: (_) => send(), decoration: const InputDecoration(hintText: 'Message Destiny AI'))), const SizedBox(width: 8), IconButton.filled(onPressed: busy ? null : send, icon: busy ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.send))])),
          ],
        ),
      );
}

class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key});
  @override
  Widget build(BuildContext context) {
    final u = Supabase.instance.client.auth.currentUser;
    return SafeArea(child: ListView(padding: const EdgeInsets.all(20), children: [const SizedBox(height: 30), const CircleAvatar(radius: 46, child: Icon(Icons.person, size: 50)), const SizedBox(height: 18), Text(u?.email ?? 'User', textAlign: TextAlign.center, style: const TextStyle(fontSize: 21, fontWeight: FontWeight.bold)), const SizedBox(height: 8), const Card(child: ListTile(leading: Icon(Icons.workspace_premium, color: gold), title: Text('Free plan'), subtitle: Text('Upgrade support can be connected securely through Supabase.')))]));
  }
}

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});
  @override
  Widget build(BuildContext context) => SafeArea(child: ListView(padding: const EdgeInsets.all(18), children: [const Text('Settings', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900)), const SizedBox(height: 18), const Card(child: ListTile(leading: Icon(Icons.security), title: Text('Privacy & security'), subtitle: Text('AI provider credentials remain server-side.'))), const Card(child: ListTile(leading: Icon(Icons.auto_awesome), title: Text('AI modes'), subtitle: Text('Chat, Code, Study, Write and Creative'))), const Card(child: ListTile(leading: Icon(Icons.info_outline), title: Text('About Destiny AI'), subtitle: Text('Premium AI assistant'))), const SizedBox(height: 18), FilledButton.tonalIcon(onPressed: () => Supabase.instance.client.auth.signOut(), icon: const Icon(Icons.logout), label: const Text('Sign out'))]));
}

extension<T> on Iterable<T> {
  Iterable<T> takeLast(int count) {
    final list = toList();
    return list.length <= count ? list : list.sublist(list.length - count);
  }
}
