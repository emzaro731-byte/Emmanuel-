import 'package:url_launcher/url_launcher.dart';
import 'destiny_api.dart';

class PaymentService {
  PaymentService._();
  static final instance = PaymentService._();
  static const premiumCheckoutUrl = 'https://selar.com/66ft71u971';
  Future<void> openPremiumCheckout() async { final ok=await launchUrl(Uri.parse(premiumCheckoutUrl),mode:LaunchMode.externalApplication); if(!ok)throw Exception('Could not open Premium checkout'); }
  Future<Map<String,dynamic>> startBankTransferPayment({required String plan}) async { throw Exception('Payment checkout must be configured on the Destiny API server.'); }
  Future<void> startPayment({required int amount, required String plan}) async { await openPremiumCheckout(); }
  Future<Map<String,dynamic>> verifyTransaction({required String reference, required String plan}) async { throw Exception('Payment verification must be handled by the Destiny API server.'); }
  Future<String?> paymentStatus(String reference) async => null;
}
