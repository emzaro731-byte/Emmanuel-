import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

class PaymentService {
  PaymentService._();
  static final PaymentService instance = PaymentService._();

  final SupabaseClient _supabase = Supabase.instance.client;

  static const String premiumCheckoutUrl = 'https://selar.com/66ft71u971';

  Future<void> openPremiumCheckout() async {
    final uri = Uri.parse(premiumCheckoutUrl);
    final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!opened) throw Exception('Could not open Premium checkout');
  }

  Future<Map<String, dynamic>> startBankTransferPayment({
    required String plan,
  }) async {
    final response = await _supabase.functions.invoke(
      'create-payment',
      body: {'plan': plan},
    );

    if (response.status != 200 && response.status != 201) {
      throw Exception('Unable to create payment');
    }

    final data = Map<String, dynamic>.from(response.data as Map);
    return data;
  }

  Future<void> startPayment({
    required int amount,
    required String plan,
  }) async {
    if (plan.toLowerCase() == 'premium') {
      await openPremiumCheckout();
      return;
    }

    final data = await startBankTransferPayment(plan: plan);
    final checkoutUrl = data['payment']?['checkout_url']?.toString() ??
        data['checkout_url']?.toString();

    if (checkoutUrl == null || checkoutUrl.isEmpty) {
      throw Exception('Payment checkout is not configured yet');
    }

    final uri = Uri.parse(checkoutUrl);
    final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!opened) throw Exception('Could not open payment checkout');
  }

  Future<Map<String, dynamic>> verifyTransaction({
    required String reference,
    required String plan,
  }) async {
    final response = await _supabase.functions.invoke(
      'verify-payment',
      body: {
        'reference': reference.trim(),
        'plan': plan.toLowerCase(),
      },
    );

    final data = response.data is Map
        ? Map<String, dynamic>.from(response.data as Map)
        : <String, dynamic>{};

    if (response.status < 200 || response.status >= 300) {
      throw Exception(data['message']?.toString() ??
          data['error']?.toString() ??
          'Transaction verification failed');
    }

    return data;
  }

  Future<String?> paymentStatus(String reference) async {
    final row = await _supabase
        .from('destiny_payments')
        .select('status')
        .eq('reference', reference)
        .maybeSingle();
    return row?['status']?.toString();
  }
}
