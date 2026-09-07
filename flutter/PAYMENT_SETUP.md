# Destiny AI Flutter Payment Setup

## What this Flutter code does
The app calls the Supabase Edge Function named `create-payment`.
The Edge Function creates a payment record and must return:

```json
{ "checkout_url": "https://secure-checkout.example/..." }
```

Flutter opens that URL securely outside the app.

## Important
Do not put Moniepoint merchant secrets, PINs, OTPs, BVN, or private API credentials in Flutter.

Configure the real merchant checkout URL/API only in the Supabase Edge Function after obtaining approved merchant credentials.

## Add the screen
Import:

```dart
import 'screens/payment_screen.dart';
```

Then navigate with:

```dart
Navigator.of(context).push(
  MaterialPageRoute(builder: (_) => const PaymentScreen()),
);
```
