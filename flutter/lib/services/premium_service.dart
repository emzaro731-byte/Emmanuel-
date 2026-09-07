import 'package:supabase_flutter/supabase_flutter.dart';

class PremiumService {
  PremiumService._();
  static final PremiumService instance = PremiumService._();

  final SupabaseClient _supabase = Supabase.instance.client;

  Future<bool> isPremium() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return false;

    final row = await _supabase
        .from('destiny_profiles')
        .select('plan, premium_active, premium_expires_at')
        .eq('user_id', user.id)
        .maybeSingle();

    if (row == null) return false;
    if (row['premium_active'] == true) {
      final expires = row['premium_expires_at']?.toString();
      if (expires == null || expires.isEmpty) return true;
      final date = DateTime.tryParse(expires);
      return date == null || date.isAfter(DateTime.now().toUtc());
    }
    return row['plan']?.toString() == 'premium';
  }

  Future<Map<String, dynamic>?> getEntitlement() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return null;
    return await _supabase
        .from('destiny_profiles')
        .select('plan, premium_active, premium_source, premium_started_at, premium_expires_at')
        .eq('user_id', user.id)
        .maybeSingle();
  }
}
