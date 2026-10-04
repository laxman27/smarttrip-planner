import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const apiBaseUrl = String.fromEnvironment(
  'SMARTTRIP_API_URL',
  defaultValue: 'http://10.0.2.2:8000',
);

const secureStorage = FlutterSecureStorage();

const secureStorage = FlutterSecureStorage();

void main() {
  runApp(const SmartTripApp());
}

class SmartTripApp extends StatelessWidget {
  const SmartTripApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SmartTrip Planner',
      theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.indigo),
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});
  @override State<AuthGate> createState() => _AuthGateState();
}
class _AuthGateState extends State<AuthGate> {
  String? token; bool loading = true;
  @override void initState() { super.initState(); _load(); }
  Future<void> _load() async {
    final value = await secureStorage.read(key: 'access_token');
    if (mounted) setState(() { token = value; loading = false; });
  }
  @override Widget build(BuildContext context) {
    if (loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    return token == null ? const LoginPage() : PlannerPage(token: token!);
  }
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});
  @override State<LoginPage> createState() => _LoginPageState();
}
class _LoginPageState extends State<LoginPage> {
  final email=TextEditingController(), password=TextEditingController(), name=TextEditingController();
  bool register=false, loading=false; String? error;
  Future<void> submit() async {
    setState(() { loading=true; error=null; });
    try {
      final endpoint=register ? '/api/v1/auth/register' : '/api/v1/auth/login';
      final body=register ? {'email':email.text.trim(),'password':password.text,'display_name':name.text.trim()} : {'email':email.text.trim(),'password':password.text};
      final r=await http.post(Uri.parse(apiBaseUrl+endpoint),headers:{'Content-Type':'application/json'},body:jsonEncode(body));
      final data=jsonDecode(r.body);
      if(r.statusCode>=400) throw Exception(data['detail']?.toString() ?? 'Authentication failed.');
      await secureStorage.write(key:'access_token',value:data['access_token'].toString());
      if(mounted) Navigator.of(context).pushReplacement(MaterialPageRoute(builder:(_)=>PlannerPage(token:data['access_token'].toString())));
    }catch(e){if(mounted)setState(()=>error=e.toString().replaceFirst('Exception: ',''));}
    finally{if(mounted)setState(()=>loading=false);}
  }
  @override void dispose(){email.dispose();password.dispose();name.dispose();super.dispose();}
  @override Widget build(BuildContext context)=>Scaffold(body:Center(child:ConstrainedBox(
    constraints:const BoxConstraints(maxWidth:480), child:ListView(padding:const EdgeInsets.all(24),shrinkWrap:true,children:[
      const Text('SMARTTRIP',style:TextStyle(fontWeight:FontWeight.w800,letterSpacing:2)),
      const SizedBox(height:10),Text(register?'Create your account':'Welcome back',style:const TextStyle(fontSize:30,fontWeight:FontWeight.bold)),
      const SizedBox(height:24),
      if(register) TextField(controller:name,decoration:const InputDecoration(labelText:'Display name',border:OutlineInputBorder())),
      if(register) const SizedBox(height:12),
      TextField(controller:email,keyboardType:TextInputType.emailAddress,decoration:const InputDecoration(labelText:'Email',border:OutlineInputBorder())),
      const SizedBox(height:12),
      TextField(controller:password,obscureText:true,decoration:const InputDecoration(labelText:'Password (10+ characters)',border:OutlineInputBorder())),
      if(error!=null) Padding(padding:const EdgeInsets.only(top:12),child:Text(error!,style:TextStyle(color:Theme.of(context).colorScheme.error))),
      const SizedBox(height:18),
      FilledButton(onPressed:loading?null:submit,child:Text(loading?'Please wait…':register?'Create account':'Sign in')),
      TextButton(onPressed:loading?null:()=>setState(()=>register=!register),child:Text(register?'Already have an account? Sign in':'Create a new account')),
    ]))));
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});
  @override State<AuthGate> createState() => _AuthGateState();
}
class _AuthGateState extends State<AuthGate> {
  String? token; bool loading = true;
  @override void initState() { super.initState(); _load(); }
  Future<void> _load() async { final value=await secureStorage.read(key:'access_token'); if(mounted)setState((){token=value;loading=false;}); }
  @override Widget build(BuildContext context){if(loading)return const Scaffold(body:Center(child:CircularProgressIndicator()));return token==null?const LoginPage():PlannerPage(token:token!);}
}
class LoginPage extends StatefulWidget {
  const LoginPage({super.key});
  @override State<LoginPage> createState()=>_LoginPageState();
}
class _LoginPageState extends State<LoginPage>{
  final email=TextEditingController(),password=TextEditingController(),name=TextEditingController();
  bool register=false,loading=false;String? error;
  Future<void> submit() async {
    setState((){loading=true;error=null;});
    try{
      final endpoint=register?'/api/v1/auth/register':'/api/v1/auth/login';
      final body=register?{'email':email.text.trim(),'password':password.text,'display_name':name.text.trim() }:{'email':email.text.trim(),'password':password.text};
      final r=await http.post(Uri.parse(apiBaseUrl+endpoint),headers:{'Content-Type':'application/json'},body:jsonEncode(body));
      final data=jsonDecode(r.body);
      if(r.statusCode>=400)throw Exception(data['detail']?.toString()??'Authentication failed.');
      final token=data['access_token'].toString();await secureStorage.write(key:'access_token',value:token);
      if(mounted)Navigator.of(context).pushReplacement(MaterialPageRoute(builder:(_)=>PlannerPage(token:token)));
    }catch(e){if(mounted)setState(()=>error=e.toString().replaceFirst('Exception: ',''));}
    finally{if(mounted)setState(()=>loading=false);}
  }
  @override void dispose(){email.dispose();password.dispose();name.dispose();super.dispose();}
  @override Widget build(BuildContext context)=>Scaffold(body:Center(child:ConstrainedBox(constraints:const BoxConstraints(maxWidth:480),child:ListView(padding:const EdgeInsets.all(24),shrinkWrap:true,children:[
    const Text('SMARTTRIP',style:TextStyle(fontWeight:FontWeight.w800,letterSpacing:2)),const SizedBox(height:10),
    Text(register?'Create your account':'Welcome back',style:const TextStyle(fontSize:30,fontWeight:FontWeight.bold)),const SizedBox(height:24),
    if(register)TextField(controller:name,decoration:const InputDecoration(labelText:'Display name',border:OutlineInputBorder())),if(register)const SizedBox(height:12),
    TextField(controller:email,keyboardType:TextInputType.emailAddress,decoration:const InputDecoration(labelText:'Email',border:OutlineInputBorder())),const SizedBox(height:12),
    TextField(controller:password,obscureText:true,decoration:const InputDecoration(labelText:'Password (10+ characters)',border:OutlineInputBorder())),
    if(error!=null)Padding(padding:const EdgeInsets.only(top:12),child:Text(error!,style:TextStyle(color:Theme.of(context).colorScheme.error))),const SizedBox(height:18),
    FilledButton(onPressed:loading?null:submit,child:Text(loading?'Please wait…':register?'Create account':'Sign in')),
    TextButton(onPressed:loading?null:()=>setState(()=>register=!register),child:Text(register?'Already have an account? Sign in':'Create a new account'))
  ]))));
}
class PlannerPage extends StatefulWidget {
  final String token;
  const PlannerPage({super.key,required this.token});
  final String token;
  const PlannerPage({super.key,required this.token});
  const PlannerPage({super.key});

  @override
  State<PlannerPage> createState() => _PlannerPageState();
}

class _PlannerPageState extends State<PlannerPage> {
  final origin = TextEditingController();
  final destination = TextEditingController();
  bool loading = false;
  bool saving = false;
  String? message;
  List<dynamic> startSuggestions = [];
  List<dynamic> destinationSuggestions = [];
  List<dynamic> savedTrips = [];
  String? selectedOriginPlaceId;
  String? selectedDestinationPlaceId;

  Map<String,String> headers() => {'Content-Type':'application/json','Authorization':'Bearer '+widget.token};

  Future<void> searchPlaces(String query, bool startField) async {
    if (query.trim().length < 2) return;
    final response = await http.post(Uri.parse(apiBaseUrl+'/api/v1/places/autocomplete'),
      headers: {'Content-Type':'application/json'}, body: jsonEncode({'query':query.trim()}));
    if (response.statusCode >= 400 || !mounted) return;
    final list = (jsonDecode(response.body)['suggestions'] as List<dynamic>? ?? []);
    setState(() { if (startField) { startSuggestions=list; } else { destinationSuggestions=list; } });
  }

  Future<void> loadSavedTrips() async {
    final response=await http.get(Uri.parse(apiBaseUrl+'/api/v1/trips/saved'),headers:headers());
    if(response.statusCode<400 && mounted) setState(()=>savedTrips=jsonDecode(response.body)['trips']??[]);
  }

  Future<void> logout() async {
    await secureStorage.delete(key:'access_token');
    if(mounted) Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder:(_)=>const LoginPage()),(_)=>false);
  }

  Future<void> saveTrip() async {
    if(message==null) return;
    setState(()=>saving=true);
    try {
      final response=await http.post(Uri.parse(apiBaseUrl+'/api/v1/trips/saved'),headers:headers(),body:jsonEncode({
        'name':origin.text+' → '+destination.text,'start_label':origin.text,'destination_label':destination.text,
        'departure_at':DateTime.now().toUtc().toIso8601String(),'vehicle_type':'car',
        'preferences':{'emission_type':'GASOLINE','fuel_efficiency':12,'fuel_price_per_unit':100,'max_drive_hours':4}
      }));
      if(response.statusCode>=400) throw Exception('Unable to save trip.');
      await loadSavedTrips();
    }catch(e){if(mounted)setState(()=>message=e.toString().replaceFirst('Exception: ',''));}
    finally{if(mounted)setState(()=>saving=false);}
  }

  @override void initState(){super.initState();loadSavedTrips();}

  Future<void> planTrip() async {
    setState(() {
      loading = true;
      message = null;
    });

    try {
      if(selectedOriginPlaceId==null || selectedDestinationPlaceId==null) throw Exception('Select both locations from the official place suggestions.');
      final o = origin.text.split(',').map(double.parse).toList();
      final d = destination.text.split(',').map(double.parse).toList();

      final response = await http.post(
        Uri.parse('$apiBaseUrl/api/v1/routes/calculate'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'origin_place_id': selectedOriginPlaceId,
          'destination_place_id': selectedDestinationPlaceId,
        }),
      );

      if (response.statusCode >= 400) {
        throw Exception('Route calculation failed');
      }

      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final routes = (data['routes'] as List<dynamic>? ?? []);
      final first = routes.isNotEmpty ? routes.first as Map<String, dynamic> : null;

      setState(() {
        message = first == null
            ? 'No route returned.'
            : 'Distance: ${((first['distanceMeters'] ?? 0) / 1000).toStringAsFixed(1)} km\n'
              'Traffic ETA: ${first['duration'] ?? 'Unavailable'}';
      });
    } catch (_) {
      setState(() => message = 'Enter coordinates as latitude,longitude and check the API connection.');
    } finally {
      setState(() => loading = false);
    }
  }

  @override
  void initState() { super.initState(); loadSavedTrips(); }

  @override
  void dispose() {
    origin.dispose();
    destination.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('SmartTrip Planner'),actions:[IconButton(onPressed:loadSavedTrips,icon:const Icon(Icons.bookmark)),IconButton(onPressed:logout,icon:const Icon(Icons.logout))]),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text(
            'Plan the road. Enjoy the journey.',
            style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 20),
          TextField(controller: origin, onChanged: (v){ selectedOriginPlaceId=null; searchPlaces(v,true); }, decoration: const InputDecoration(labelText: 'Start location')),
          const SizedBox(height: 12),
          TextField(controller: destination, onChanged: (v){ selectedDestinationPlaceId=null; searchPlaces(v,false); }, decoration: const InputDecoration(labelText: 'Destination')),
          ...startSuggestions.take(5).map((item){final p=item['placePrediction'];final label=p?['text']?['text']?.toString()??'';return ListTile(title:Text(label),onTap:(){origin.text=label;selectedOriginPlaceId=p?['placeId']?.toString();setState(()=>startSuggestions=[]);});}),
          ...destinationSuggestions.take(5).map((item){final p=item['placePrediction'];final label=p?['text']?['text']?.toString()??'';return ListTile(title:Text(label),onTap:(){destination.text=label;selectedDestinationPlaceId=p?['placeId']?.toString();setState(()=>destinationSuggestions=[]);});}),
          ...startSuggestions.take(5).map((item){final p=item['placePrediction'];final label=p?['text']?['text']?.toString()??'';return ListTile(title:Text(label),onTap:(){origin.text=label;selectedOriginPlaceId=p?['placeId']?.toString();setState(()=>startSuggestions=[]);});}),
          ...destinationSuggestions.take(5).map((item){final p=item['placePrediction'];final label=p?['text']?['text']?.toString()??'';return ListTile(title:Text(label),onTap:(){destination.text=label;selectedDestinationPlaceId=p?['placeId']?.toString();setState(()=>destinationSuggestions=[]);});}),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: loading ? null : planTrip,
            child: Text(loading ? 'Calculating…' : 'Plan trip'),
          ),
          if (message != null) ...[
            const SizedBox(height: 24), Text(message!),
            if (selectedOriginPlaceId != null && selectedDestinationPlaceId != null) FilledButton(onPressed:saving?null:saveTrip,child:Text(saving?'Saving…':'Save this trip')),
          ],
          if(savedTrips.isNotEmpty) ...[
            const SizedBox(height:24), const Text('Saved trips',style:TextStyle(fontSize:20,fontWeight:FontWeight.bold)),
            ...savedTrips.map((t)=>ListTile(title:Text(t['name']?.toString()??'Trip'),subtitle:Text(t['destination_label']?.toString()??''),leading:const Icon(Icons.route))),
          ],
        ],
      ),
    );
  }
}
