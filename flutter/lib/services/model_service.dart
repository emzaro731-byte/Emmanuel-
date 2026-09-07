class ModelOption {
  final String id;
  final String name;
  final String description;
  final bool premium;

  const ModelOption({
    required this.id,
    required this.name,
    required this.description,
    this.premium = false,
  });
}

/// Central model catalog used by the Flutter UI.
/// Provider keys stay in Supabase Edge Functions.
class ModelService {
  static const models = <ModelOption>[
    ModelOption(
      id: 'openai/gpt-oss-120b',
      name: 'Destiny Smart',
      description: 'Fast general-purpose reasoning and chat',
    ),
    ModelOption(
      id: 'openai/gpt-oss-20b',
      name: 'Destiny Fast',
      description: 'Lower-latency everyday assistant',
    ),
    ModelOption(
      id: 'premium',
      name: 'Destiny Premium',
      description: 'Premium model route',
      premium: true,
    ),
  ];

  static ModelOption byId(String id) {
    return models.firstWhere(
      (model) => model.id == id,
      orElse: () => models.first,
    );
  }
}
