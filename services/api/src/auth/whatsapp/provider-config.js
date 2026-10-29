export function getWhatsAppProviderConfig(env = process.env) {
  const provider = env.SEGALOKA_WA_PROVIDER || 'disabled';

  if (!['disabled', 'meta', 'twilio'].includes(provider)) {
    throw new Error('WA_PROVIDER_INVALID');
  }

  if (provider === 'disabled') {
    return { enabled: false, provider };
  }

  if (provider === 'meta') {
    const required = [
      'META_WA_GRAPH_VERSION',
      'META_WA_PHONE_NUMBER_ID',
      'META_WA_ACCESS_TOKEN',
      'META_WA_TEMPLATE_NAME',
      'META_WA_TEMPLATE_LANGUAGE'
    ];

    if (required.some(key => !env[key])) {
      throw new Error('META_WA_CONFIG_INCOMPLETE');
    }

    if (!/^v[0-9]+\.[0-9]+$/.test(env.META_WA_GRAPH_VERSION)) {
      throw new Error('META_WA_GRAPH_VERSION_INVALID');
    }

    if (!/^[0-9]+$/.test(env.META_WA_PHONE_NUMBER_ID)) {
      throw new Error('META_WA_PHONE_NUMBER_ID_INVALID');
    }

    return {
      enabled: true,
      provider,
      graphVersion: env.META_WA_GRAPH_VERSION,
      phoneNumberId: env.META_WA_PHONE_NUMBER_ID,
      accessToken: env.META_WA_ACCESS_TOKEN,
      templateName: env.META_WA_TEMPLATE_NAME,
      templateLanguage: env.META_WA_TEMPLATE_LANGUAGE
    };
  }

  // Adapter Twilio belum diaktifkan.
  // Jangan aktifkan pengiriman sebelum adapter tersedia.
  return {
    enabled: false,
    provider: 'twilio',
    reason: 'TWILIO_ADAPTER_NOT_CONFIGURED'
  };
}