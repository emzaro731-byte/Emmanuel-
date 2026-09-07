import 'package:flutter/material.dart';
import '../services/payment_service.dart';
import '../services/premium_service.dart';

class PaymentScreen extends StatefulWidget {
  const PaymentScreen({super.key});

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen>
    with WidgetsBindingObserver {
  bool _loading = false;
  bool _checking = false;
  bool _premium = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _refreshPremium();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _refreshPremium();
    }
  }

  Future<void> _refreshPremium() async {
    if (_checking) return;
    setState(() => _checking = true);
    try {
      final active = await PremiumService.instance.isPremium();
      if (mounted) setState(() => _premium = active);
      if (active && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text(
                  'Premium is active. All Premium features are unlocked.')),
        );
      }
    } catch (_) {
      // Keep the existing UI if the entitlement check temporarily fails.
    } finally {
      if (mounted) setState(() => _checking = false);
    }
  }

  Future<void> _pay(int amount, String plan) async {
    setState(() => _loading = true);
    try {
      await PaymentService.instance.startPayment(amount: amount, plan: plan);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              plan == 'premium'
                  ? 'Opening Premium checkout. After payment, return here and Premium will refresh automatically.'
                  : 'Complete payment securely in the checkout window.',
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString())),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Widget _plan(String name, int price, String description) {
    final isPremium = name.toLowerCase() == 'premium';

    return Card(
      child: ListTile(
        title: Text(
          name,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Text(description),
        trailing: FilledButton(
          onPressed: (_loading || _premium)
              ? null
              : () => _pay(price, name.toLowerCase()),
          child: Text(_premium && isPremium
              ? 'Active'
              : (isPremium ? 'Premium' : '₦$price')),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Upgrade Destiny AI'),
        actions: [
          IconButton(
            tooltip: 'Refresh Premium status',
            onPressed: _refreshPremium,
            icon: _checking
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.refresh),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            if (_premium)
              Card(
                child: ListTile(
                  leading: const Icon(Icons.workspace_premium),
                  title: const Text('Premium active'),
                  subtitle: const Text(
                      'Your Selar Premium payment has been confirmed.'),
                ),
              ),
            const SizedBox(height: 10),
            const Text(
              'Choose your plan',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 20),
            _plan('Basic', 500, 'Access premium features'),
            _plan('Pro', 1000, 'More AI usage and features'),
            _plan('Premium', 2000, 'Full premium experience'),
            if (_loading)
              const Padding(
                padding: EdgeInsets.all(20),
                child: CircularProgressIndicator(),
              ),
          ],
        ),
      ),
    );
  }
}
