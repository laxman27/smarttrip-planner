# SmartTrip Planner Android

This Flutter application uses the SmartTrip FastAPI backend.

For local Android emulator development:

flutter run --dart-define=SMARTTRIP_API_URL=http://10.0.2.2:8000

For production, use the HTTPS API hostname and do not embed provider API secrets in the APK.
