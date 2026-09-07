import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

class PaymentService {
  PaymentService._();
  static final PaymentService instance = PaymentService._();

  final SupabaseClient _supabase = Supabase.instance.client;

  Future<void> startPayment({
    required int amount,
    required String plan,
  }) async {
    final response = await _supabase.functions.invoke(
      'create-payment',
      body: {'amount': amount, 'plan': plan},
    );

    if (response.status != 200 && response.status != 201) {
      throw Exception('Unable to create payment');
    }

    final data = response.data;
    final checkoutUrl = data is Map ? data['checkout_url']?.toString() : null;

    if (checkoutUrl == null || checkoutUrl.isEmpty) {
      throw Exception('Payment checkout is not configured yet');
    }

    final uri = Uri.parse(checkoutUrl);
    final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!opened) throw Exception('Could not open payment checkout');
  }

  Future<String?> paymentStatus(String reference) async {
    final row = await _supabase
        .from('payments')
        .select('status')
        .eq('reference', reference)
        .maybeSingle();
    return row?['status']?.toString();
  }
}
