import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const defaultSupabaseUrl = 'https://vihbsfrwnslnmheowkhy.supabase.co';

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
      scaffoldBackgroundColor: const Color(0xFF050816),
      colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFFD8B15A), brightness: Brightness.dark),
      inputDecorationTheme: InputDecorationTheme(
        filled: true, fillColor: const Color(0xFF10172B),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
      ),
    ),
    home: configError ? const ConfigScreen() : const AuthGate(),
  );
}

class ConfigScreen extends StatelessWidget {
  const ConfigScreen({super.key});
  @override
  Widget build(BuildContext context) => const Scaffold(body: Center(child: Padding(
    padding: EdgeInsets.all(28), child: Text('Destiny AI is not configured. Add SUPABASE_PUBLISHABLE_KEY to the build environment.', textAlign: TextAlign.center),
  )));
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});
  @override
  Widget build(BuildContext context) => StreamBuilder<AuthState>(
    stream: Supabase.instance.client.auth.onAuthStateChange,
    builder: (_, snap) => snap.data?.session != null ? const HomeScreen() : const LoginScreen(),
  );
}

class LoginScreen extends StatefulWidget { const LoginScreen({super.key}); @override State<LoginScreen> createState()=>_LoginState(); }
class _LoginState extends State<LoginScreen> {
  final email=TextEditingController(), password=TextEditingController(); bool busy=false, register=false;
  Future<void> submit() async {
    if(email.text.trim().isEmpty || password.text.isEmpty) return;
    setState(()=>busy=true);
    try {
      if(register) {
        final r=await Supabase.instance.client.auth.signUp(email: email.text.trim(), password: password.text);
        if(mounted && r.session==null) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Check your email to confirm your account.')));
      } else await Supabase.instance.client.auth.signInWithPassword(email: email.text.trim(), password: password.text);
    } on AuthException catch(e) { if(mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message))); }
    finally { if(mounted)setState(()=>busy=false); }
  }
  @override Widget build(BuildContext context)=>Scaffold(body: SafeArea(child: Center(child: SingleChildScrollView(padding:const EdgeInsets.all(24),child:ConstrainedBox(constraints:const BoxConstraints(maxWidth:520),child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
    Icon(Icons.auto_awesome,size:64,color:Color(0xFFD8B15A)), SizedBox(height:14), Text('Destiny AI',textAlign:TextAlign.center,style:TextStyle(fontSize:34,fontWeight:FontWeight.w800)), SizedBox(height:8), Text('Your intelligent AI assistant',textAlign:TextAlign.center,style:TextStyle(color:Color(0xFF9BA5C0))), SizedBox(height:36),
    TextField(controller:email,keyboardType:TextInputType.emailAddress,decoration:InputDecoration(labelText:'Email',prefixIcon:Icon(Icons.email_outlined))), SizedBox(height:14), TextField(controller:password,obscureText:true,decoration:InputDecoration(labelText:'Password',prefixIcon:Icon(Icons.lock_outline))), SizedBox(height:20), FilledButton(onPressed:busy?null:submit,child:Padding(padding:EdgeInsets.all(13),child:Text(busy?'Please wait...':(register?'Create account':'Sign in')))), SizedBox(height:10), TextButton(onPressed:busy?null:()=>setState(()=>register=!register),child:Text(register?'Already have an account? Sign in':'New to Destiny AI? Create an account')),
  ]))))));
}

class HomeScreen extends StatefulWidget { const HomeScreen({super.key}); @override State<HomeScreen> createState()=>_HomeState(); }
class _HomeState extends State<HomeScreen> {
  int index=0;
  final pages=const [ChatPage(), ProfilePage(), SettingsPage()];
  @override Widget build(BuildContext context)=>Scaffold(body:pages[index],bottomNavigationBar:NavigationBar(selectedIndex:index,onDestinationSelected:(i)=>setState(()=>index=i),destinations:const [NavigationDestination(icon:Icon(Icons.chat_bubble_outline),selectedIcon:Icon(Icons.chat_bubble),label:'Chat'),NavigationDestination(icon:Icon(Icons.person_outline),selectedIcon:Icon(Icons.person),label:'Profile'),NavigationDestination(icon:Icon(Icons.settings_outlined),selectedIcon:Icon(Icons.settings),label:'Settings')]));
}

class ChatPage extends StatefulWidget { const ChatPage({super.key}); @override State<ChatPage> createState()=>_ChatState(); }
class _ChatState extends State<ChatPage> {
  final input=TextEditingController(); final scroll=ScrollController(); final messages=<Map<String,String>>[]; bool busy=false; String mode='Chat';
  Future<void> send() async {
    final text=input.text.trim(); if(text.isEmpty||busy)return; input.clear(); setState((){messages.add({'role':'user','text':text});busy=true;});
    try {
      final session=Supabase.instance.client.auth.currentSession; if(session==null) throw Exception('Please sign in again.');
      final r=await Supabase.instance.client.functions.invoke('destiny-ai',body:{'message':text,'mode':mode,'messages':messages.map((m)=>{'role':m['role']=='assistant'?'assistant':'user','content':m['text']}).toList()});
      final data=r.data is Map ? Map<String,dynamic>.from(r.data) : <String,dynamic>{};
      final answer=(data['response']??data['answer']??data['message']??data['content']??data['text']??'No response returned.').toString();
      setState(()=>messages.add({'role':'assistant','text':answer}));
    } catch(e) { setState(()=>messages.add({'role':'assistant','text':'Error: $e'})); }
    finally { setState(()=>busy=false); WidgetsBinding.instance.addPostFrameCallback((_){if(scroll.hasClients)scroll.animateTo(scroll.position.maxScrollExtent,duration:const Duration(milliseconds:250),curve:Curves.easeOut);}); }
  }
  @override Widget build(BuildContext context)=>SafeArea(child:Column(children:[Padding(padding:const EdgeInsets.fromLTRB(18,16,18,8),child:Row(children:[const Expanded(child:Text('Destiny AI',style:TextStyle(fontSize:24,fontWeight:FontWeight.w800))),DropdownButton<String>(value:mode,items:['Chat','Code','Study','Write','Creative'].map((x)=>DropdownMenuItem(value:x,child:Text(x))).toList(),onChanged:(x){if(x!=null)setState(()=>mode=x);})])),Expanded(child:messages.isEmpty?const Center(child:Column(mainAxisSize:MainAxisSize.min,children:[Icon(Icons.auto_awesome,size:52,color:Color(0xFFD8B15A)),SizedBox(height:12),Text('How can I help you today?',style:TextStyle(fontSize:20,fontWeight:FontWeight.w600))])):ListView.builder(controller:scroll,padding:const EdgeInsets.all(16),itemCount:messages.length,itemBuilder:(_,i){final m=messages[i];final user=m['role']=='user';return Align(alignment:user?Alignment.centerRight:Alignment.centerLeft,child:Container(margin:const EdgeInsets.only(bottom:12),padding:const EdgeInsets.all(15),constraints:const BoxConstraints(maxWidth:620),decoration:BoxDecoration(color:user?const Color(0xFF6D4AFF):const Color(0xFF10172B),borderRadius:BorderRadius.circular(18)),child:Text(m['text']??'')));})),Padding(padding:const EdgeInsets.all(12),child:Row(children:[Expanded(child:TextField(controller:input,minLines:1,maxLines:5,onSubmitted:(_)=>send(),decoration:const InputDecoration(hintText:'Message Destiny AI'))),const SizedBox(width:8),IconButton.filled(onPressed:busy?null:send,icon:const Icon(Icons.send))]))]));
}

class ProfilePage extends StatelessWidget { const ProfilePage({super.key}); @override Widget build(BuildContext context){final u=Supabase.instance.client.auth.currentUser;return SafeArea(child:Center(child:Column(mainAxisAlignment:MainAxisAlignment.center,children:[const CircleAvatar(radius:38,child:Icon(Icons.person,size:42)),const SizedBox(height:18),Text(u?.email??'User',style:const TextStyle(fontSize:20,fontWeight:FontWeight.bold)),const SizedBox(height:8),const Text('Free plan',style:TextStyle(color:Color(0xFF9BA5C0)))])));} }
class SettingsPage extends StatelessWidget { const SettingsPage({super.key}); @override Widget build(BuildContext context)=>SafeArea(child:ListView(padding:const EdgeInsets.all(18),children:[const Text('Settings',style:TextStyle(fontSize:28,fontWeight:FontWeight.w800)),const SizedBox(height:18),Card(child:ListTile(leading:const Icon(Icons.security),title:const Text('Privacy & security'),subtitle:const Text('Your AI provider key stays on the server'))),Card(child:ListTile(leading:const Icon(Icons.info_outline),title:const Text('About Destiny AI'),subtitle:const Text('Premium AI assistant'))),const SizedBox(height:18),FilledButton.tonalIcon(onPressed:()=>Supabase.instance.client.auth.signOut(),icon:const Icon(Icons.logout),label:const Text('Sign out'))])); }
