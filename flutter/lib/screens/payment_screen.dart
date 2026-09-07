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
    if (state == AppLifecycleState.resumed) _refreshPremium();
  }

  Future<void> _refreshPremium() async {
    if (_checking) return;
    setState(() => _checking = true);
    try {
      final active = await PremiumService.instance.isPremium();
      if (mounted) setState(() => _premium = active);
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
            content: Text(plan == 'premium'
                ? 'Opening Premium checkout. Return here after payment.'
                : 'Complete payment securely in the checkout window.'),
          ),
        );
      }
    } catch (e) {
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _showBankTransfer(String plan, int amount) async {
    setState(() => _loading = true);
    try {
      final data =
          await PaymentService.instance.startBankTransferPayment(plan: plan);
      if (!mounted) return;

      final bank = data['bank_transfer'] is Map
          ? Map<String, dynamic>.from(data['bank_transfer'] as Map)
          : <String, dynamic>{};
      final payment = data['payment'] is Map
          ? Map<String, dynamic>.from(data['payment'] as Map)
          : <String, dynamic>{};
      final reference = payment['reference']?.toString() ?? '';

      await showDialog<void>(
        context: context,
        builder: (context) => _TransferDialog(
          plan: plan,
          amount: amount,
          bank: bank,
          reference: reference,
        ),
      );
    } catch (e) {
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Widget _plan(String name, int price, String description) {
    final isPremium = name.toLowerCase() == 'premium';
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Column(
          children: [
            ListTile(
              title: Text(name,
                  style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text(description),
              trailing: FilledButton(
                onPressed: (_loading || _premium)
                    ? null
                    : () => _pay(price, name.toLowerCase()),
                child: Text(_premium && isPremium ? 'Active' : '₦$price'),
              ),
            ),
            if (!_premium)
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  onPressed: _loading
                      ? null
                      : () => _showBankTransfer(name.toLowerCase(), price),
                  icon: const Icon(Icons.account_balance),
                  label: const Text('Pay by bank transfer'),
                ),
              ),
          ],
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
        child: ListView(
          children: [
            if (_premium)
              const Card(
                child: ListTile(
                  leading: Icon(Icons.workspace_premium),
                  title: Text('Premium active'),
                  subtitle: Text('Your Premium entitlement is active.'),
                ),
              ),
            const SizedBox(height: 10),
            const Text('Choose your plan',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),
            _plan('Basic', 500, 'Access premium features'),
            _plan('Pro', 1000, 'More AI usage and features'),
            _plan('Premium', 2000, 'Full premium experience'),
            if (_loading)
              const Padding(
                  padding: EdgeInsets.all(20),
                  child: Center(child: CircularProgressIndicator())),
          ],
        ),
      ),
    );
  }
}

class _TransferDialog extends StatefulWidget {
  const _TransferDialog(
      {required this.plan,
      required this.amount,
      required this.bank,
      required this.reference});
  final String plan;
  final int amount;
  final Map<String, dynamic> bank;
  final String reference;

  @override
  State<_TransferDialog> createState() => _TransferDialogState();
}

class _TransferDialogState extends State<_TransferDialog> {
  final _referenceController = TextEditingController();
  bool _verifying = false;

  @override
  void dispose() {
    _referenceController.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    final reference = _referenceController.text.trim();
    if (reference.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Enter the transaction reference/session ID.')));
      return;
    }
    setState(() => _verifying = true);
    try {
      final result = await PaymentService.instance
          .verifyTransaction(reference: reference, plan: widget.plan);
      if (!mounted) return;
      if (result['verified'] == true) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text(
                'Payment verified. Premium access will activate automatically.')));
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(result['message']?.toString() ??
                'Payment could not be verified yet.')));
      }
    } catch (e) {
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _verifying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final accountName =
        widget.bank['account_name']?.toString() ?? 'Configure on server';
    final accountNumber =
        widget.bank['account_number']?.toString() ?? 'Configure on server';
    final bankName = widget.bank['bank_name']?.toString() ?? 'Moniepoint MFB';

    return AlertDialog(
      title: const Text('Moniepoint bank transfer'),
      content: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Amount: ₦${widget.amount}'),
            const SizedBox(height: 12),
            Text('Bank: $bankName'),
            Text('Account name: $accountName'),
            Text('Account number: $accountNumber'),
            const SizedBox(height: 8),
            const Text(
                'Make the transfer, then enter the transaction reference/session ID below. The server will verify the transaction before access is granted.'),
            const SizedBox(height: 12),
            TextField(
              controller: _referenceController,
              decoration: const InputDecoration(
                labelText: 'Transaction reference / session ID',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
            onPressed: _verifying ? null : () => Navigator.of(context).pop(),
            child: const Text('Close')),
        FilledButton.icon(
          onPressed: _verifying ? null : _verify,
          icon: _verifying
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2))
              : const Icon(Icons.verified),
          label: const Text('Verify payment'),
        ),
      ],
    );
  }
}
