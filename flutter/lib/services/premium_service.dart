import 'destiny_api.dart';
class PremiumService {
  PremiumService._(); static final instance=PremiumService._();
  Future<bool> isPremium() async { try { final data=await DestinyApi.instance.me(); return data['plan']?.toString().toLowerCase()=='premium'; } catch (_) { return false; } }
  Future<Map<String,dynamic>?> getEntitlement() async { try { return await DestinyApi.instance.me(); } catch (_) { return null; } }
}
