import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/media_service.dart';

const studioGold = Color(0xFFD8B15A);
const studioPink = Color(0xFFFF9ED2);
const studioPurple = Color(0xFFB89CFF);
const studioPeach = Color(0xFFFFC6A8);
const studioCard = Color(0xFF10172B);

class MediaStudioPage extends StatefulWidget {
  const MediaStudioPage({super.key});

  @override
  State<MediaStudioPage> createState() => _MediaStudioPageState();
}

class _MediaStudioPageState extends State<MediaStudioPage> {
  final prompt = TextEditingController();
  final lyrics = TextEditingController();
  int tab = 0;
  bool busy = false;
  bool videoSound = false;
  bool instrumental = false;
  String? mediaUrl;
  String? mediaType;
  String? status;

  String get title => const ['Image', 'Video', 'Music'][tab];

  Future<void> generate() async {
    final value = prompt.text.trim();
    if (value.isEmpty || busy) return;

    setState(() {
      busy = true;
      mediaUrl = null;
      mediaType = null;
      status = '✨ Connecting to Destiny AI...';
    });

    try {
      Map<String, dynamic> data;
      if (tab == 0) {
        status = '🎨 Creating your image...';
        data = await MediaService.generateImage(prompt: value);
        mediaUrl = MediaService.extractImageUrl(data);
        mediaType = 'image';
      } else if (tab == 1) {
        status = '🎬 Creating your video... This can take a few minutes.';
        data = await MediaService.generateVideo(prompt: value, sound: videoSound);
        mediaUrl = MediaService.extractVideoUrl(data);
        mediaType = 'video';
      } else {
        status = '🎵 Composing your music...';
        data = await MediaService.generateMusic(prompt: value, lyrics: lyrics.text, instrumental: instrumental);
        mediaUrl = MediaService.extractAudioUrl(data);
        mediaType = 'music';
      }

      if (!mounted) return;
      if (mediaUrl == null) throw Exception('The provider returned no $title URL.');
      setState(() => status = '💖 $title ready!');
    } catch (e) {
      if (mounted) {
        setState(() => status = null);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> openMedia() async {
    final url = mediaUrl;
    if (url == null) return;
    final ok = await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    if (!ok && mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unable to open the generated media.')));
  }

  void changeTab(int value) {
    if (busy) return;
    setState(() {
      tab = value;
      mediaUrl = null;
      mediaType = null;
      status = null;
      prompt.clear();
      lyrics.clear();
    });
  }

  @override
  void dispose() {
    prompt.dispose();
    lyrics.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final accent = [studioPink, studioPurple, studioPeach][tab];
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Studio', style: TextStyle(fontWeight: FontWeight.w900)),
        backgroundColor: Colors.transparent,
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(18, 4, 18, 30),
        children: [
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(28),
              gradient: LinearGradient(colors: [accent.withValues(alpha: .24), studioPurple.withValues(alpha: .12), studioCard]),
              border: Border.all(color: accent.withValues(alpha: .35)),
            ),
            child: Row(children: [
              Container(width: 58, height: 58, decoration: BoxDecoration(shape: BoxShape.circle, color: accent.withValues(alpha: .18)), child: Icon(Icons.auto_awesome, color: accent, size: 30)),
              const SizedBox(width: 15),
              const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Create something magical ✨', style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900)),
                SizedBox(height: 5),
                Text('Your ideas + Destiny AI = magic.', style: TextStyle(color: Color(0xFFB9C1D4))),
              ])),
            ]),
          ),
          const SizedBox(height: 18),
          const Text('AI Studio', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w900)),
          const SizedBox(height: 6),
          const Text('Turn your ideas into images, cinematic videos, and music.', style: TextStyle(color: Color(0xFF9BA5C0))),
          const SizedBox(height: 18),
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(color: studioCard, borderRadius: BorderRadius.circular(22)),
            child: SegmentedButton<int>(
              style: ButtonStyle(shape: WidgetStatePropertyAll(RoundedRectangleBorder(borderRadius: BorderRadius.circular(17)))),
              segments: const [
                ButtonSegment(value: 0, icon: Icon(Icons.image_outlined), label: Text('Image')),
                ButtonSegment(value: 1, icon: Icon(Icons.movie_outlined), label: Text('Video')),
                ButtonSegment(value: 2, icon: Icon(Icons.music_note_outlined), label: Text('Music')),
              ],
              selected: {tab},
              onSelectionChanged: (value) => changeTab(value.first),
            ),
          ),
          const SizedBox(height: 18),
          TextField(
            controller: prompt,
            minLines: 3,
            maxLines: 7,
            decoration: InputDecoration(
              labelText: tab == 0 ? 'Describe your image' : tab == 1 ? 'Describe your video' : 'Describe your music',
              hintText: tab == 0 ? 'A cute futuristic city at sunset... ✨' : tab == 1 ? 'A cinematic drone shot over a futuristic Lagos skyline... 🎬' : 'Afrobeat, energetic, uplifting, modern African pop... 🎵',
              prefixIcon: Icon(tab == 0 ? Icons.auto_awesome : tab == 1 ? Icons.movie_creation_outlined : Icons.music_note, color: accent),
            ),
          ),
          if (tab == 1) ...[
            const SizedBox(height: 12),
            Card(color: studioCard, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)), child: SwitchListTile(
              title: const Text('🎬 Native video sound'),
              subtitle: const Text('Let the video model create matching audio.'),
              value: videoSound,
              onChanged: busy ? null : (value) => setState(() => videoSound = value),
            )),
          ],
          if (tab == 2) ...[
            const SizedBox(height: 12),
            Card(color: studioCard, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)), child: SwitchListTile(
              title: const Text('🎹 Instrumental only'),
              subtitle: const Text('Generate music without vocals.'),
              value: instrumental,
              onChanged: busy ? null : (value) => setState(() => instrumental = value),
            )),
            if (!instrumental) ...[
              const SizedBox(height: 8),
              TextField(controller: lyrics, minLines: 3, maxLines: 8, decoration: const InputDecoration(labelText: 'Lyrics (optional)', hintText: '[Verse]\nWrite your lyrics here...\n[Chorus]\nYour hook goes here...')),
            ],
          ],
          const SizedBox(height: 14),
          SizedBox(height: 54, child: FilledButton.icon(
            style: FilledButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20))),
            onPressed: busy ? null : generate,
            icon: busy ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : Icon(tab == 0 ? Icons.image_outlined : tab == 1 ? Icons.movie_outlined : Icons.music_note_outlined),
            label: Text(busy ? 'Creating your magic...' : 'Generate $title ✨'),
          )),
          if (status != null) ...[
            const SizedBox(height: 14),
            Center(child: Text(status!, style: TextStyle(color: accent, fontWeight: FontWeight.w700))),
          ],
          if (mediaUrl != null) ...[
            const SizedBox(height: 20),
            Card(
              color: studioCard,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26), side: BorderSide(color: accent.withValues(alpha: .28))),
              child: Padding(padding: const EdgeInsets.all(20), child: Column(children: [
                Container(width: 72, height: 72, decoration: BoxDecoration(shape: BoxShape.circle, color: accent.withValues(alpha: .14)), child: Icon(mediaType == 'image' ? Icons.image : mediaType == 'video' ? Icons.movie : Icons.audiotrack, size: 38, color: accent)),
                const SizedBox(height: 12),
                Text('$title generated successfully 💖', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                const SizedBox(height: 6),
                const Text('Your creation is ready to preview or open.', textAlign: TextAlign.center, style: TextStyle(color: Color(0xFF9BA5C0))),
                const SizedBox(height: 14),
                FilledButton.icon(onPressed: openMedia, icon: Icon(mediaType == 'music' ? Icons.play_arrow : Icons.open_in_new), label: Text(mediaType == 'music' ? 'Play music 🎵' : 'Open $title')),
              ])),
            ),
          ],
          const SizedBox(height: 22),
          Card(
            color: studioCard,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
            child: const ListTile(leading: Icon(Icons.lock_outline, color: studioGold), title: Text('Secure provider connection'), subtitle: Text('The fal API key stays in Supabase server-side secrets and is never shipped in the APK.')),
          ),
        ],
      ),
    );
  }
}
