import 'package:supabase_flutter/supabase_flutter.dart';

class DestinyEntitlement {
  final String plan;
  final int credits;
  final DateTime? expiresAt;

  const DestinyEntitlement({
    required this.plan,
    required this.credits,
    required this.expiresAt,
  });

  bool get isPremium => plan == 'premium';
  bool get isPro => plan == 'pro' || isPremium;
  bool get isActive => expiresAt == null || expiresAt!.isAfter(DateTime.now());

  factory DestinyEntitlement.fromMap(Map<String, dynamic> row) {
    final rawExpiry = row['expires_at']?.toString();
    return DestinyEntitlement(
      plan: row['plan']?.toString() ?? 'free',
      credits: (row['credits'] as num?)?.toInt() ?? 0,
      expiresAt: rawExpiry == null ? null : DateTime.tryParse(rawExpiry),
    );
  }
}

class EntitlementService {
  EntitlementService(this._client);

  final SupabaseClient _client;

  Future<DestinyEntitlement> getCurrent() async {
    final user = _client.auth.currentUser;
    if (user == null) {
      return const DestinyEntitlement(plan: 'free', credits: 0, expiresAt: null);
    }

    final row = await _client
        .from('destiny_entitlements')
        .select('plan, credits, expires_at')
        .eq('user_id', user.id)
        .maybeSingle();

    if (row == null) {
      return const DestinyEntitlement(plan: 'free', credits: 0, expiresAt: null);
    }
    return DestinyEntitlement.fromMap(row);
  }

  Future<DestinyEntitlement> refresh() => getCurrent();
}
