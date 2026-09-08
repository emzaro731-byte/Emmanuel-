import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

const _bg = Color(0xFF050713);
const _card = Color(0xFF10172B);
const _text = Color(0xFFF7F4FF);
const _muted = Color(0xFFA8ABC0);
const _gold = Color(0xFFD8B15A);
const _purple = Color(0xFF9B7BFF);

class IntegrationsPage extends StatefulWidget {
  const IntegrationsPage({super.key});
  @override
  State<IntegrationsPage> createState() => _IntegrationsPageState();
}

class _IntegrationsPageState extends State<IntegrationsPage> {
  bool busy = false;

  Future<void> _connectGitHub() async {
    if (busy) return;
    setState(() => busy = true);
    try {
      final result = await Supabase.instance.client.auth.signInWithOAuth(
        OAuthProvider.github,
        redirectTo: 'io.supabase.flutter://login-callback/',
        authScreenLaunchMode: LaunchMode.externalApplication,
      );
      if (!result && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text(
              'GitHub OAuth could not be started. Configure GitHub in Supabase Auth first.'),
        ));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('GitHub connection error: $e')));
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> _open(String url) async {
    final uri = Uri.parse(url);
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication) &&
        mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('This app or link could not be opened.')));
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: _bg,
        appBar: AppBar(
          title: const Text('Connections',
              style: TextStyle(fontWeight: FontWeight.w800)),
          backgroundColor: Colors.transparent,
        ),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
          children: [
            const Text('Connect Destiny AI to your tools',
                style: TextStyle(color: _muted, fontSize: 14)),
            const SizedBox(height: 18),
            _section('AI', [
              _connection(
                icon: Icons.auto_awesome,
                title: 'OpenAI / ChatGPT',
                subtitle:
                    'Use OpenAI models through the secure Destiny AI backend. Never put an API key inside the APK.',
                action: 'Open ChatGPT',
                onTap: () => _open('https://chatgpt.com/'),
                badge: 'API READY',
              ),
              _connection(
                icon: Icons.bolt,
                title: 'Groq',
                subtitle:
                    'Fast streaming AI remains available as the default provider.',
                action: 'Connected',
                onTap: null,
                badge: 'ACTIVE',
              ),
            ]),
            const SizedBox(height: 18),
            _section('Developer', [
              _connection(
                icon: Icons.code,
                title: 'GitHub',
                subtitle:
                    'Sign in with GitHub through Supabase OAuth, then use your GitHub account with Destiny AI.',
                action: busy ? 'Connecting…' : 'Connect GitHub',
                onTap: busy ? null : _connectGitHub,
                badge: 'OAUTH',
              ),
              _connection(
                icon: Icons.public,
                title: 'GitHub Repository',
                subtitle: 'Open the Destiny AI source repository.',
                action: 'Open',
                onTap: () =>
                    _open('https://github.com/emzaro731-byte/Emmanuel-'),
              ),
            ]),
            const SizedBox(height: 18),
            _section('Apps', [
              _app('ChatGPT', Icons.auto_awesome, 'https://chatgpt.com/'),
              _app('GitHub', Icons.code, 'https://github.com/'),
              _app('Google', Icons.search, 'https://www.google.com/'),
              _app('Gmail', Icons.email_outlined, 'https://mail.google.com/'),
              _app('Google Drive', Icons.cloud_outlined,
                  'https://drive.google.com/'),
              _app('WhatsApp', Icons.chat, 'https://wa.me/'),
              _app('Telegram', Icons.send, 'https://t.me/'),
              _app(
                  'YouTube', Icons.play_circle_outline, 'https://youtube.com/'),
              _app('Discord', Icons.forum_outlined, 'https://discord.com/app'),
              _app('X', Icons.alternate_email, 'https://x.com/'),
            ]),
            const SizedBox(height: 18),
            const Card(
              color: _card,
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.security_outlined, color: _gold),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Security: provider API keys stay in Supabase Function Secrets. The mobile app only receives your authenticated session and streamed AI responses.',
                        style: TextStyle(color: _muted, height: 1.4),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      );

  Widget _section(String title, List<Widget> children) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(
                  color: _text, fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          ...children,
        ],
      );

  Widget _connection(
          {required IconData icon,
          required String title,
          required String subtitle,
          required String action,
          required VoidCallback? onTap,
          String? badge}) =>
      Card(
        color: _card,
        margin: const EdgeInsets.only(bottom: 10),
        child: ListTile(
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          leading: CircleAvatar(
              backgroundColor: _purple.withValues(alpha: .16),
              child: Icon(icon, color: _purple)),
          title: Row(children: [
            Expanded(
                child: Text(title,
                    style: const TextStyle(
                        color: _text, fontWeight: FontWeight.w700))),
            if (badge != null) _badge(badge)
          ]),
          subtitle: Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(subtitle,
                  style: const TextStyle(color: _muted, height: 1.3))),
          trailing: TextButton(onPressed: onTap, child: Text(action)),
        ),
      );

  Widget _app(String title, IconData icon, String url) => Card(
        color: _card,
        margin: const EdgeInsets.only(bottom: 8),
        child: ListTile(
          leading: Icon(icon, color: _gold),
          title: Text(title,
              style:
                  const TextStyle(color: _text, fontWeight: FontWeight.w600)),
          trailing: const Icon(Icons.open_in_new, color: _muted, size: 19),
          onTap: () => _open(url),
        ),
      );

  Widget _badge(String text) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
        decoration: BoxDecoration(
            color: _gold.withValues(alpha: .12),
            borderRadius: BorderRadius.circular(8)),
        child: Text(text,
            style: const TextStyle(
                color: _gold, fontSize: 9, fontWeight: FontWeight.w800)),
      );
}
