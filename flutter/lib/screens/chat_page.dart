import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:share_plus/share_plus.dart';
import 'package:speech_to_text/speech_to_text.dart';
import '../services/destiny_api.dart';
import 'media_studio_page.dart';
import 'payment_screen.dart';

const _bg = Color(0xFF050713), _text = Color(0xFFF7F4FF), _muted = Color(0xFFA8ABC0), _purple = Color(0xFF9B7BFF), _pink = Color(0xFFFF8FCA), _gold = Color(0xFFD8B15A);

class ChatPage extends StatefulWidget { const ChatPage({super.key}); @override State<ChatPage> createState() => _ChatPageState(); }
class _ChatPageState extends State<ChatPage> {
  final input = TextEditingController(), scroll = ScrollController(), speech = SpeechToText(), tts = FlutterTts();
  final messages = <Map<String,String>>[];
  XFile? attachment; bool busy = false, listening = false, speaking = false; String mode = 'Chat';
  @override void initState() { super.initState(); _load(); tts.setCompletionHandler(() { if (mounted) setState(() => speaking = false); }); }
  @override void dispose() { input.dispose(); scroll.dispose(); speech.stop(); tts.stop(); super.dispose(); }
  Future<void> _load() async { final p = await SharedPreferences.getInstance(); for (final x in p.getStringList('destiny_chat_history') ?? []) { final i=x.indexOf('|'); if(i>0) messages.add({'role':x.substring(0,i),'content':x.substring(i+1)}); } if(mounted)setState((){}); }
  Future<void> _save() async { final p=await SharedPreferences.getInstance(); await p.setStringList('destiny_chat_history', messages.take(80).map((m)=>'${m['role']}|${m['content']}').toList()); }
  Future<void> _send() async {
    if(busy) return; final text=input.text.trim(); if(text.isEmpty && attachment==null)return;
    final prompt=attachment==null?text:'$text\n[Image attached: ${attachment!.name}]'.trim(); input.clear(); attachment=null;
    setState(() { messages.add({'role':'user','content':prompt}); messages.add({'role':'assistant','content':''}); busy=true; }); _scrollBottom();
    try {
      final data=await DestinyApi.instance.chat(messages.sublist(0,messages.length-1));
      final choices=data['choices']; final answer=choices is List && choices.isNotEmpty ? '${(choices.first as Map)['message']?['content'] ?? ''}' : '';
      messages.last['content']=answer.isEmpty?'No response received.':answer;
      if(mounted)setState((){});
    } catch(e) { messages.last['content']='⚠️ ${e.toString().replaceFirst('Exception: ','')}'; if(mounted)setState((){}); }
    finally { busy=false; await _save(); if(mounted)setState((){}); _scrollBottom(); }
  }
  void _scrollBottom()=>WidgetsBinding.instance.addPostFrameCallback((_){if(scroll.hasClients)scroll.animateTo(scroll.position.maxScrollExtent,duration:const Duration(milliseconds:180),curve:Curves.easeOut);});
  Future<void> _pick() async { final x=await ImagePicker().pickImage(source:ImageSource.gallery); if(x!=null&&mounted)setState(()=>attachment=x); }
  Future<void> _voice() async { if(listening){await speech.stop();setState(()=>listening=false);return;} final ok=await speech.initialize(onStatus:(s){if(s=='done'&&mounted)setState(()=>listening=false);}); if(!ok)return; setState(()=>listening=true); await speech.listen(onResult:(r){input.text=r.recognizedWords;}); }
  Future<void> _speak(String text) async { if(speaking){await tts.stop();setState(()=>speaking=false);return;} await tts.setLanguage('en-US'); await tts.setSpeechRate(.48); setState(()=>speaking=true); await tts.speak(text); }
  Future<void> _clear() async { messages.clear(); await _save(); if(mounted)setState((){}); }
  @override Widget build(BuildContext context)=>Scaffold(backgroundColor:_bg,body:Stack(children:[Positioned.fill(child:CustomPaint(painter:_Glow())),SafeArea(child:Column(children:[_header(),Expanded(child:_body()),_composer()]))]));
  Widget _header()=>Padding(padding:const EdgeInsets.all(14),child:Row(children:[const Icon(Icons.auto_awesome,color:_gold),const SizedBox(width:10),const Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text('Destiny AI',style:TextStyle(color:_text,fontSize:19,fontWeight:FontWeight.w900)),Text('Self-hosted AI • Live API',style:TextStyle(color:_muted,fontSize:11))])),IconButton(onPressed:_modes,icon:const Icon(Icons.tune,color:_muted)),IconButton(onPressed:()=>showModalBottomSheet(context:context,builder:(_)=>Column(mainAxisSize:MainAxisSize.min,children:[ListTile(leading:const Icon(Icons.auto_awesome),title:const Text('AI Studio'),onTap:(){Navigator.pop(context);Navigator.push(context,MaterialPageRoute(builder:(_)=>const MediaStudioPage()));}),ListTile(leading:const Icon(Icons.workspace_premium),title:const Text('Upgrade'),onTap:(){Navigator.pop(context);Navigator.push(context,MaterialPageRoute(builder:(_)=>const PaymentScreen()));}),ListTile(leading:const Icon(Icons.delete_outline),title:const Text('Clear chat'),onTap:(){Navigator.pop(context);_clear();})])),icon:const Icon(Icons.more_horiz,color:_muted))]);
  void _modes(){const modes=['Chat','Code','Study','Write','Creative'];showModalBottomSheet(context:context,builder:(_)=>ListView(shrinkWrap:true,children:[for(final m in modes)ListTile(title:Text(m),trailing:m==mode?const Icon(Icons.check):null,onTap:(){setState(()=>mode=m);Navigator.pop(context);})]));}
  Widget _body()=>messages.isEmpty?ListView(padding:const EdgeInsets.all(24),children:[const SizedBox(height:45),const Icon(Icons.auto_awesome,size:80,color:_gold),const SizedBox(height:20),const Text('Hi, I’m Destiny ✨',textAlign:TextAlign.center,style:TextStyle(color:_text,fontSize:28,fontWeight:FontWeight.w900)),const SizedBox(height:10),const Text('Chat, code, study, write and create with your own AI API.',textAlign:TextAlign.center,style:TextStyle(color:_muted,height:1.5)),const SizedBox(height:28),for(final s in ['Explain something simply','Help me write a professional message','Build a modern app with me','Create an image or video concept'])Padding(padding:const EdgeInsets.only(bottom:10),child:Card(color:Colors.white10,child:ListTile(title:Text(s,style:const TextStyle(color:_text)),onTap:(){input.text=s;_send();})))]):ListView.builder(controller:scroll,padding:const EdgeInsets.all(14),itemCount:messages.length,itemBuilder:(_,i){final m=messages[i],user=m['role']=='user',text=m['content']??'';return Align(alignment:user?Alignment.centerRight:Alignment.centerLeft,child:Padding(padding:const EdgeInsets.only(bottom:10),child:Column(crossAxisAlignment:user?CrossAxisAlignment.end:CrossAxisAlignment.start,children:[Container(maxWidth:MediaQuery.sizeOf(context).width*.82,padding:const EdgeInsets.all(15),decoration:BoxDecoration(color:user?_purple.withOpacity(.2):Colors.white.withOpacity(.06),borderRadius:BorderRadius.circular(20),border:Border.all(color:Colors.white.withOpacity(.1))),child:Text(text.isEmpty&&busy?'Thinking…':text,style:const TextStyle(color:_text,fontSize:15,height:1.5))),if(!user&&text.isNotEmpty)Row(mainAxisSize:MainAxisSize.min,children:[IconButton(onPressed:()=>_speak(text),icon:const Icon(Icons.volume_up,color:_muted,size:18)),IconButton(onPressed:()=>SharePlus.instance.share(ShareParams(text:text)),icon:const Icon(Icons.share,color:_muted,size:18))])])));});
  Widget _composer()=>Padding(padding:const EdgeInsets.all(10),child:ClipRRect(borderRadius:BorderRadius.circular(26),child:BackdropFilter(filter:ImageFilter.blur(sigmaX:22,sigmaY:22),child:Container(decoration:BoxDecoration(color:Colors.white.withOpacity(.07),borderRadius:BorderRadius.circular(26),border:Border.all(color:Colors.white.withOpacity(.12))),child:Row(children:[IconButton(onPressed:_voice,icon:Icon(listening?Icons.mic:Icons.mic_none,color:listening?_pink:_muted)),IconButton(onPressed:_pick,icon:const Icon(Icons.add_photo_alternate_outlined,color:_muted)),Expanded(child:TextField(controller:input,minLines:1,maxLines:6,style:const TextStyle(color:_text),decoration:const InputDecoration(hintText:'Message Destiny…',hintStyle:TextStyle(color:_muted),border:InputBorder.none),onSubmitted:(_)=>_send())),IconButton(onPressed:busy?null:_send,icon:Icon(busy?Icons.hourglass_top:Icons.arrow_upward,color:_gold))]))));
}
class _Glow extends CustomPainter { @override void paint(Canvas c,Size s){final p=Paint()..shader=RadialGradient(colors:[_purple.withOpacity(.1),Colors.transparent]).createShader(Rect.fromCircle(center:Offset(s.width*.75,s.height*.15),radius:s.width*.75));c.drawRect(Offset.zero&s,p);} @override bool shouldRepaint(covariant CustomPainter oldDelegate)=>false; }
