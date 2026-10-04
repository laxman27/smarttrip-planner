import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

const apiBaseUrl = String.fromEnvironment(
  'SMARTTRIP_API_URL',
  defaultValue: 'http://10.0.2.2:8000',
);

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
      home: const PlannerPage(),
    );
  }
}

class PlannerPage extends StatefulWidget {
  const PlannerPage({super.key});

  @override
  State<PlannerPage> createState() => _PlannerPageState();
}

class _PlannerPageState extends State<PlannerPage> {
  final origin = TextEditingController();
  final destination = TextEditingController();
  bool loading = false;
  String? message;

  Future<void> planTrip() async {
    setState(() {
      loading = true;
      message = null;
    });

    try {
      final o = origin.text.split(',').map(double.parse).toList();
      final d = destination.text.split(',').map(double.parse).toList();

      final response = await http.post(
        Uri.parse('$apiBaseUrl/api/v1/routes/calculate'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'origin_lat': o[0],
          'origin_lng': o[1],
          'destination_lat': d[0],
          'destination_lng': d[1],
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
  void dispose() {
    origin.dispose();
    destination.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('SmartTrip Planner')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text(
            'Plan the road. Enjoy the journey.',
            style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 20),
          TextField(controller: origin, decoration: const InputDecoration(labelText: 'Start coordinates')),
          const SizedBox(height: 12),
          TextField(controller: destination, decoration: const InputDecoration(labelText: 'Destination coordinates')),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: loading ? null : planTrip,
            child: Text(loading ? 'Calculating…' : 'Plan trip'),
          ),
          if (message != null) ...[
            const SizedBox(height: 24),
            Text(message!),
          ],
        ],
      ),
    );
  }
}
