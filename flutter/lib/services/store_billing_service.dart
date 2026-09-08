import 'dart:async';

import 'package:in_app_purchase/in_app_purchase.dart';

/// Google Play / App Store billing adapter.
///
/// Product IDs must be created in the store consoles before production use.
class StoreBillingService {
  StoreBillingService._();

  static final StoreBillingService instance = StoreBillingService._();

  static const proProductId = 'destiny_ai_pro_monthly';
  static const premiumProductId = 'destiny_ai_premium_monthly';
  static const aiCreditsProductId = 'destiny_ai_credits_100';

  final InAppPurchase _store = InAppPurchase.instance;
  StreamSubscription<List<PurchaseDetails>>? _subscription;

  List<ProductDetails> products = const [];
  List<PurchaseDetails> purchases = const [];

  Future<bool> initialize({
    required void Function(PurchaseDetails purchase) onPurchase,
    void Function(Object error)? onError,
  }) async {
    if (!await _store.isAvailable()) return false;

    await _subscription?.cancel();
    _subscription = _store.purchaseStream.listen(
      (items) {
        purchases = List.unmodifiable(items);
        for (final purchase in items) {
          if (purchase.status == PurchaseStatus.purchased ||
              purchase.status == PurchaseStatus.restored) {
            onPurchase(purchase);
          } else if (purchase.status == PurchaseStatus.error) {
            onError?.call(purchase.error ?? 'Purchase failed');
          }

          if (purchase.pendingCompletePurchase) {
            _store.completePurchase(purchase);
          }
        }
      },
      onError: onError,
    );

    await refreshProducts();
    return true;
  }

  Future<ProductDetailsResponse> refreshProducts() async {
    final response = await _store.queryProductDetails({
      proProductId,
      premiumProductId,
      aiCreditsProductId,
    });
    products = List.unmodifiable(response.productDetails);
    return response;
  }

  Future<bool> buy(ProductDetails product) {
    return _store.buyNonConsumable(
      purchaseParam: PurchaseParam(productDetails: product),
    );
  }

  Future<void> restorePurchases() => _store.restorePurchases();

  Future<void> dispose() async {
    await _subscription?.cancel();
    _subscription = null;
  }
}
