import 'package:flutter/material.dart';
import '../services/media_service.dart';

const studioGold = Color(0xFFD8B15A);
const studioCard = Color(0xFF10172B);

class MediaStudioPage extends StatefulWidget {
  const MediaStudioPage({super.key});

  @override
  State<MediaStudioPage> createState() => _MediaStudioPageState();
}

class _MediaStudioPageState extends State<MediaStudioPage> {
  final prompt = TextEditingController();
  bool busy = false;
  String? imageUrl;

  Future<void> generate() async {
    final value = prompt.text.trim();
    if (value.isEmpty || busy) return;
    setState(() => busy = true);
    try {
      final data = await MediaService.generateImage(prompt: value);
      final url = MediaService.extractImageUrl(data);
      if (!mounted) return;
      if (url == null) {
        throw Exception('The image provider returned no image URL.');
      }
      setState(() => imageUrl = url);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  void dispose() {
    prompt.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('AI Studio'), backgroundColor: Colors.transparent),
        body: ListView(
          padding: const EdgeInsets.all(18),
          children: [
            const Text('Create with AI', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            const Text('Generate images from natural-language prompts.', style: TextStyle(color: Color(0xFF9BA5C0))),
            const SizedBox(height: 20),
            TextField(
              controller: prompt,
              minLines: 3,
              maxLines: 6,
              decoration: const InputDecoration(
                labelText: 'Describe your image',
                hintText: 'A cinematic futuristic city at sunset...',
                prefixIcon: Icon(Icons.auto_awesome, color: studioGold),
              ),
            ),
            const SizedBox(height: 14),
            FilledButton.icon(
              onPressed: busy ? null : generate,
              icon: busy ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.image_outlined),
              label: Text(busy ? 'Generating...' : 'Generate image'),
            ),
            if (imageUrl != null) ...[
              const SizedBox(height: 22),
              ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: Image.network(imageUrl!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const SizedBox(height: 220, child: Center(child: Text('Unable to display generated image.')))),
              ),
            ],
            const SizedBox(height: 22),
            const Card(
              color: studioCard,
              child: ListTile(
                leading: Icon(Icons.lock_outline, color: studioGold),
                title: Text('Secure provider connection'),
                subtitle: Text('The provider API key stays in Supabase server-side secrets and is never shipped in the APK.'),
              ),
            ),
          ],
        ),
      );
}
