import 'package:supabase_flutter/supabase_flutter.dart';

class PremiumService {
  PremiumService._();
  static final PremiumService instance = PremiumService._();

  final SupabaseClient _supabase = Supabase.instance.client;

  Future<bool> isPremium() async {
    final entitlement = await getEntitlement();
    if (entitlement == null) return false;

    final plan = entitlement['plan']?.toString().toLowerCase();
    if (plan != 'premium') return false;

    final expires = entitlement['expires_at']?.toString();
    if (expires == null || expires.isEmpty) return true;

    final date = DateTime.tryParse(expires);
    return date == null || date.isAfter(DateTime.now().toUtc());
  }

  Future<Map<String, dynamic>?> getEntitlement() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return null;

    final row = await _supabase
        .from('destiny_entitlements')
        .select('plan, credits, expires_at, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();

    return row == null ? null : Map<String, dynamic>.from(row);
  }

  Future<bool> refresh() => isPremium();
}
