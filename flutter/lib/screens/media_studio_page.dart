import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/media_service.dart';

const studioGold = Color(0xFFD8B15A);
const studioPurple = Color(0xFF9B7BFF);
const studioPink = Color(0xFFFF8FCA);
const studioBlue = Color(0xFF6CA8FF);
const studioBg = Color(0xFF050713);
const studioText = Color(0xFFF7F4FF);
const studioMuted = Color(0xFFA8ABC0);

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
  IconData get activeIcon => const [
    Icons.image_rounded,
    Icons.movie_creation_rounded,
    Icons.music_note_rounded,
  ][tab];

  Future<void> generate() async {
    final value = prompt.text.trim();
    if (value.isEmpty || busy) return;
    setState(() {
      busy = true;
      mediaUrl = null;
      mediaType = null;
      status = 'Connecting to Destiny AI...';
    });
    try {
      Map<String, dynamic> data;
      if (tab == 0) {
        if (mounted) setState(() => status = 'Creating your masterpiece...');
        data = await MediaService.generateImage(prompt: value);
        mediaUrl = MediaService.extractImageUrl(data);
        mediaType = 'image';
      } else if (tab == 1) {
        if (mounted)
          setState(() => status = 'Rendering your cinematic video...');
        data = await MediaService.generateVideo(
          prompt: value,
          sound: videoSound,
        );
        mediaUrl = MediaService.extractVideoUrl(data);
        mediaType = 'video';
      } else {
        if (mounted)
          setState(() => status = 'Composing your original track...');
        data = await MediaService.generateMusic(
          prompt: value,
          lyrics: lyrics.text,
          instrumental: instrumental,
        );
        mediaUrl = MediaService.extractAudioUrl(data);
        mediaType = 'music';
      }
      if (!mounted) return;
      if (mediaUrl == null)
        throw Exception('The provider returned no $title URL.');
      setState(() => status = '$title is ready ✨');
    } catch (e) {
      if (mounted) {
        setState(() => status = null);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> openMedia() async {
    final url = mediaUrl;
    if (url == null) return;
    final ok = await launchUrl(
      Uri.parse(url),
      mode: LaunchMode.externalApplication,
    );
    if (!ok && mounted)
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to open the generated media.')),
      );
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
    return Scaffold(
      backgroundColor: studioBg,
      body: Stack(
        children: [
          const _AmbientBackground(),
          SafeArea(
            child: CustomScrollView(
              physics: const BouncingScrollPhysics(),
              slivers: [
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(18, 14, 18, 34),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      Row(
                        children: [
                          _GlassIcon(
                            icon: Icons.auto_awesome_rounded,
                            size: 46,
                            iconColor: studioPink,
                          ),
                          const SizedBox(width: 12),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'DESTINY AI',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 2.2,
                                    color: studioPink,
                                  ),
                                ),
                                SizedBox(height: 2),
                                Text(
                                  'AI Studio',
                                  style: TextStyle(
                                    fontSize: 28,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: -.8,
                                    color: studioText,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          _GlassIcon(
                            icon: Icons.auto_awesome,
                            size: 42,
                            iconColor: studioGold,
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      _HeroGlass(
                        icon: activeIcon,
                        title: 'Create something magical',
                        subtitle:
                            'Bring your imagination to life with premium AI creation tools.',
                      ),
                      const SizedBox(height: 18),
                      _GlassContainer(
                        padding: const EdgeInsets.all(6),
                        child: Row(
                          children: [
                            _ModeButton(
                              icon: Icons.image_rounded,
                              label: 'Image',
                              selected: tab == 0,
                              onTap: () => changeTab(0),
                            ),
                            _ModeButton(
                              icon: Icons.movie_rounded,
                              label: 'Video',
                              selected: tab == 1,
                              onTap: () => changeTab(1),
                            ),
                            _ModeButton(
                              icon: Icons.music_note_rounded,
                              label: 'Music',
                              selected: tab == 2,
                              onTap: () => changeTab(2),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 18),
                      _GlassContainer(
                        padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(activeIcon, size: 18, color: studioPurple),
                                const SizedBox(width: 8),
                                Text(
                                  'DESCRIBE YOUR $title',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 1.1,
                                    color: studioMuted,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            TextField(
                              controller: prompt,
                              minLines: 4,
                              maxLines: 8,
                              style: const TextStyle(
                                color: studioText,
                                fontSize: 16,
                                height: 1.4,
                              ),
                              decoration: InputDecoration(
                                hintText: tab == 0
                                    ? 'A cinematic portrait in a futuristic Lagos at sunset...'
                                    : tab == 1
                                    ? 'A luxury cinematic drone shot over a futuristic Lagos skyline...'
                                    : 'Afrobeat, soulful, uplifting, premium African pop...',
                                hintStyle: const TextStyle(
                                  color: studioMuted,
                                  height: 1.4,
                                ),
                                filled: true,
                                fillColor: Colors.white.withValues(alpha: .045),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(22),
                                  borderSide: BorderSide(
                                    color: Colors.white.withValues(alpha: .08),
                                  ),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(22),
                                  borderSide: BorderSide(
                                    color: Colors.white.withValues(alpha: .08),
                                  ),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(22),
                                  borderSide: BorderSide(
                                    color: studioPurple.withValues(alpha: .65),
                                    width: 1.2,
                                  ),
                                ),
                                contentPadding: const EdgeInsets.all(16),
                              ),
                            ),
                            if (tab == 1) ...[
                              const SizedBox(height: 12),
                              _GlassToggle(
                                icon: Icons.graphic_eq_rounded,
                                title: 'Native cinematic sound',
                                subtitle:
                                    'Let the video model create matching audio.',
                                value: videoSound,
                                onChanged: busy
                                    ? null
                                    : (v) => setState(() => videoSound = v),
                              ),
                            ],
                            if (tab == 2) ...[
                              const SizedBox(height: 12),
                              _GlassToggle(
                                icon: Icons.mic_off_rounded,
                                title: 'Instrumental only',
                                subtitle: 'Create music without vocals.',
                                value: instrumental,
                                onChanged: busy
                                    ? null
                                    : (v) => setState(() => instrumental = v),
                              ),
                              if (!instrumental) ...[
                                const SizedBox(height: 12),
                                TextField(
                                  controller: lyrics,
                                  minLines: 3,
                                  maxLines: 8,
                                  style: const TextStyle(color: studioText),
                                  decoration: InputDecoration(
                                    labelText: 'Lyrics · optional',
                                    labelStyle: const TextStyle(
                                      color: studioMuted,
                                    ),
                                    hintText:
                                        '[Verse]\nWrite your lyrics here...\n[Chorus]\nYour hook goes here...',
                                    hintStyle: const TextStyle(
                                      color: studioMuted,
                                    ),
                                    filled: true,
                                    fillColor: Colors.white.withValues(
                                      alpha: .045,
                                    ),
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(20),
                                      borderSide: BorderSide(
                                        color: Colors.white.withValues(
                                          alpha: .08,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ],
                            const SizedBox(height: 16),
                            SizedBox(
                              width: double.infinity,
                              height: 58,
                              child: FilledButton.icon(
                                onPressed: busy ? null : generate,
                                style: FilledButton.styleFrom(
                                  backgroundColor: studioPurple,
                                  foregroundColor: Colors.white,
                                  disabledBackgroundColor: studioPurple
                                      .withValues(alpha: .35),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  elevation: 0,
                                ),
                                icon: busy
                                    ? const SizedBox(
                                        width: 19,
                                        height: 19,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white,
                                        ),
                                      )
                                    : const Icon(Icons.auto_awesome_rounded),
                                label: Text(
                                  busy
                                      ? 'Creating your $title...'
                                      : 'Generate $title',
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (status != null) ...[
                        const SizedBox(height: 14),
                        _GlassContainer(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 13,
                          ),
                          child: Row(
                            children: [
                              if (busy)
                                const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: studioPink,
                                  ),
                                )
                              else
                                const Icon(
                                  Icons.check_circle_rounded,
                                  size: 18,
                                  color: studioPink,
                                ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  status!,
                                  style: const TextStyle(
                                    color: studioText,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                      if (mediaUrl != null) ...[
                        const SizedBox(height: 18),
                        _ResultGlass(
                          title: title,
                          mediaType: mediaType,
                          onOpen: openMedia,
                        ),
                      ],
                      const SizedBox(height: 18),
                      _GlassContainer(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _GlassIcon(
                              icon: Icons.shield_rounded,
                              size: 42,
                              iconColor: studioGold,
                            ),
                            const SizedBox(width: 12),
                            const Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Private by design',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w800,
                                      color: studioText,
                                    ),
                                  ),
                                  SizedBox(height: 4),
                                  Text(
                                    'Provider credentials stay server-side and are never shipped inside the APK.',
                                    style: TextStyle(
                                      color: studioMuted,
                                      height: 1.35,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ]),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AmbientBackground extends StatelessWidget {
  const _AmbientBackground();
  @override
  Widget build(BuildContext context) => IgnorePointer(
    child: Stack(
      children: [
        Positioned(
          top: -100,
          left: -90,
          child: _Glow(color: studioPurple, size: 260),
        ),
        Positioned(
          top: 220,
          right: -110,
          child: _Glow(color: studioPink, size: 240),
        ),
        Positioned(
          bottom: -120,
          left: 70,
          child: _Glow(color: studioBlue, size: 260),
        ),
      ],
    ),
  );
}

class _Glow extends StatelessWidget {
  final Color color;
  final double size;
  const _Glow({required this.color, required this.size});
  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      color: color.withValues(alpha: .10),
    ),
    child: BackdropFilter(
      filter: ImageFilter.blur(sigmaX: 70, sigmaY: 70),
      child: const SizedBox.expand(),
    ),
  );
}

class _GlassContainer extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  const _GlassContainer({required this.child, required this.padding});
  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(28),
    child: BackdropFilter(
      filter: ImageFilter.blur(sigmaX: 22, sigmaY: 22),
      child: Container(
        padding: padding,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: .055),
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: Colors.white.withValues(alpha: .11)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: .25),
              blurRadius: 30,
              offset: const Offset(0, 12),
            ),
          ],
        ),
        child: child,
      ),
    ),
  );
}

class _GlassIcon extends StatelessWidget {
  final IconData icon;
  final double size;
  final Color iconColor;
  const _GlassIcon({
    required this.icon,
    required this.size,
    required this.iconColor,
  });
  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(size * .28),
    child: BackdropFilter(
      filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: .065),
          borderRadius: BorderRadius.circular(size * .28),
          border: Border.all(color: Colors.white.withValues(alpha: .12)),
        ),
        child: Icon(icon, color: iconColor, size: size * .46),
      ),
    ),
  );
}

class _HeroGlass extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  const _HeroGlass({
    required this.icon,
    required this.title,
    required this.subtitle,
  });
  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(32),
    child: BackdropFilter(
      filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
      child: Container(
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              studioPurple.withValues(alpha: .18),
              studioPink.withValues(alpha: .10),
              Colors.white.withValues(alpha: .04),
            ],
          ),
          borderRadius: BorderRadius.circular(32),
          border: Border.all(color: Colors.white.withValues(alpha: .13)),
        ),
        child: Row(
          children: [
            Container(
              width: 58,
              height: 58,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [
                    studioPink.withValues(alpha: .9),
                    studioPurple.withValues(alpha: .9),
                  ],
                ),
              ),
              child: Icon(icon, color: Colors.white, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      color: studioText,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    subtitle,
                    style: const TextStyle(color: studioMuted, height: 1.35),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class _ModeButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _ModeButton({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });
  @override
  Widget build(BuildContext context) => Expanded(
    child: GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: selected
              ? LinearGradient(
                  colors: [
                    studioPurple.withValues(alpha: .85),
                    studioPink.withValues(alpha: .65),
                  ],
                )
              : null,
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: studioPurple.withValues(alpha: .25),
                    blurRadius: 18,
                  ),
                ]
              : null,
        ),
        child: Column(
          children: [
            Icon(icon, size: 20, color: selected ? Colors.white : studioMuted),
            const SizedBox(height: 5),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: selected ? Colors.white : studioMuted,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class _GlassToggle extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool>? onChanged;
  const _GlassToggle({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.fromLTRB(13, 10, 8, 10),
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: .045),
      border: Border.all(color: Colors.white.withValues(alpha: .07)),
      borderRadius: BorderRadius.circular(20),
    ),
    child: Row(
      children: [
        Icon(icon, color: studioPink, size: 21),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  color: studioText,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: const TextStyle(fontSize: 12, color: studioMuted),
              ),
            ],
          ),
        ),
        Switch.adaptive(value: value, onChanged: onChanged),
      ],
    ),
  );
}

class _ResultGlass extends StatelessWidget {
  final String title;
  final String? mediaType;
  final VoidCallback onOpen;
  const _ResultGlass({
    required this.title,
    required this.mediaType,
    required this.onOpen,
  });
  @override
  Widget build(BuildContext context) => _GlassContainer(
    padding: const EdgeInsets.all(20),
    child: Column(
      children: [
        Icon(
          mediaType == 'video'
              ? Icons.movie_creation_rounded
              : mediaType == 'music'
              ? Icons.music_note_rounded
              : Icons.image_rounded,
          color: studioPink,
          size: 46,
        ),
        const SizedBox(height: 10),
        Text(
          '$title created successfully',
          style: const TextStyle(
            color: studioText,
            fontWeight: FontWeight.w800,
            fontSize: 17,
          ),
        ),
        const SizedBox(height: 5),
        const Text(
          'Your generated media is ready to view.',
          style: TextStyle(color: studioMuted),
        ),
        const SizedBox(height: 14),
        SizedBox(
          width: double.infinity,
          height: 50,
          child: FilledButton.icon(
            onPressed: onOpen,
            icon: const Icon(Icons.open_in_new_rounded),
            label: const Text('Open generated media'),
          ),
        ),
      ],
    ),
  );
}
