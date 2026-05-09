import { NextResponse } from 'next/server';
import { getList, isBackendAvailable } from '@/lib/server/backend';
import { loadSmtpConfig } from '@/lib/server/smtp-config-store';
import {
  loadIntegrationsLocalResolved,
  type IntegrationsLocalSettings,
} from '@/lib/server/integrations-settings-store';
import {
  loadDeveloperPortalStoreResolved,
} from '@/lib/server/developer-portal-store';

type IntegrationStatusResult = {
  key: string;
  status: 'connected' | 'disconnected' | 'error';
  configured: boolean;
  lastSync: string | null;
  details: string;
  erpNextDocCount: number;
};

export async function GET() {
  const results: IntegrationStatusResult[] = [];
  const backendAvailable = await isBackendAvailable().catch(() => false);

  // ── SMS Gateway ──
  try {
    let smsCount = 0;
    let smsConfigured = false;
    let smsDetails = 'لم يتم إعداد الرسائل النصية';
    if (backendAvailable) {
      const smsSettings = await getList('SMS Settings', { fields: ['name', 'sms_gateway_url'], limit: 5 }).catch(() => []);
      smsCount = Array.isArray(smsSettings) ? smsSettings.length : 0;
      smsConfigured = smsCount > 0;
      if (smsConfigured) {
        smsDetails = `يوجد ${smsCount} إعداد SMS في النظام`;
      }
    }
    // Also check local store
    const localData = await loadIntegrationsLocalResolved();
    const localSms = localData.smsProvider?.trim();
    if (!smsConfigured && localSms) {
      smsConfigured = true;
      smsDetails = `مزود محلي: ${localSms}`;
    }
    results.push({
      key: 'sms',
      status: smsConfigured ? 'connected' : 'disconnected',
      configured: smsConfigured,
      lastSync: smsConfigured ? new Date().toISOString() : null,
      details: smsDetails,
      erpNextDocCount: smsCount,
    });
  } catch {
    results.push({ key: 'sms', status: 'error', configured: false, lastSync: null, details: 'تعذر التحقق من حالة الرسائل النصية', erpNextDocCount: 0 });
  }

  // ── Email / SMTP ──
  try {
    let emailCount = 0;
    let emailConfigured = false;
    let emailDetails = 'لم يتم إعداد البريد الصادر';
    let emailLastSync: string | null = null;

    // Check local SMTP config
    const smtpCfg = loadSmtpConfig();
    if (smtpCfg?.host) {
      emailConfigured = true;
      emailDetails = `SMTP: ${smtpCfg.host}:${smtpCfg.port}`;
      emailLastSync = smtpCfg.updatedAt ?? null;
    }

    // Check ERPNext Email Account
    if (backendAvailable) {
      const emailAccounts = await getList('Email Account', { fields: ['name', 'email_id', 'enable_outgoing'], limit: 10 }).catch(() => []);
      emailCount = Array.isArray(emailAccounts) ? emailAccounts.length : 0;
      const outgoing = (emailAccounts as Record<string, unknown>[]).filter(
        (e) => e.enable_outgoing === 1 || e.enable_outgoing === true
      );
      if (outgoing.length > 0) {
        emailConfigured = true;
        emailDetails = `يوجد ${outgoing.length} حساب بريد صادر في ERPNext`;
      }
    }
    results.push({
      key: 'email',
      status: emailConfigured ? 'connected' : 'disconnected',
      configured: emailConfigured,
      lastSync: emailLastSync,
      details: emailDetails,
      erpNextDocCount: emailCount,
    });
  } catch {
    results.push({ key: 'email', status: 'error', configured: false, lastSync: null, details: 'تعذر التحقق من حالة البريد', erpNextDocCount: 0 });
  }

  // ── Payment Gateways ──
  try {
    let paymentCount = 0;
    let paymentConfigured = false;
    let paymentDetails = 'لم يتم إعداد بوابات الدفع';
    if (backendAvailable) {
      // Check multiple payment-related doctypes
      const [paypalSettings, stripeSettings, razorpaySettings, paySettings] = await Promise.all([
        getList('PayPal Settings', { fields: ['name'], limit: 5 }).catch(() => []),
        getList('Stripe Settings', { fields: ['name'], limit: 5 }).catch(() => []),
        getList('Razorpay Settings', { fields: ['name'], limit: 5 }).catch(() => []),
        getList('Payment Gateway', { fields: ['name'], limit: 10 }).catch(() => []),
      ]);
      const paypal = Array.isArray(paypalSettings) ? paypalSettings.length : 0;
      const stripe = Array.isArray(stripeSettings) ? stripeSettings.length : 0;
      const razorpay = Array.isArray(razorpaySettings) ? razorpaySettings.length : 0;
      const gateways = Array.isArray(paySettings) ? paySettings.length : 0;
      paymentCount = paypal + stripe + razorpay;
      const configured: string[] = [];
      if (paypal > 0) configured.push('PayPal');
      if (stripe > 0) configured.push('Stripe');
      if (razorpay > 0) configured.push('Razorpay');
      if (gateways > 0) paymentCount += gateways;
      paymentConfigured = configured.length > 0 || gateways > 0;
      if (paymentConfigured) {
        paymentDetails = configured.length > 0
          ? `بوابات مفعّلة: ${configured.join('، ')}`
          : `يوجد ${gateways} بوابة دفع في النظام`;
      }
    }
    results.push({
      key: 'payment',
      status: paymentConfigured ? 'connected' : 'disconnected',
      configured: paymentConfigured,
      lastSync: paymentConfigured ? new Date().toISOString() : null,
      details: paymentDetails,
      erpNextDocCount: paymentCount,
    });
  } catch {
    results.push({ key: 'payment', status: 'error', configured: false, lastSync: null, details: 'تعذر التحقق من حالة بوابات الدفع', erpNextDocCount: 0 });
  }

  // ── E-commerce ──
  try {
    let ecommerceCount = 0;
    let ecommerceConfigured = false;
    let ecommerceDetails = 'لم يتم إعداد التجارة الإلكترونية';
    let ecommerceLastSync: string | null = null;

    // Check local store
    const localData = await loadIntegrationsLocalResolved();
    const hasLocalEcommerce = !!(localData.shopify?.trim() || localData.salla?.trim() || localData.zid?.trim() || localData.woo?.trim());
    if (hasLocalEcommerce) {
      ecommerceConfigured = true;
      const stores: string[] = [];
      if (localData.shopify?.trim()) stores.push('Shopify');
      if (localData.salla?.trim()) stores.push('Salla');
      if (localData.zid?.trim()) stores.push('Zid');
      if (localData.woo?.trim()) stores.push('WooCommerce');
      ecommerceDetails = `متاجر محلية: ${stores.join('، ')}`;
    }

    // Check ERPNext ecommerce integrations
    if (backendAvailable) {
      const shopifyLog = await getList('Shopify Log', { fields: ['name'], limit: 1 }).catch(() => []);
      const ecommerceItems = await getList('E Commerce Item', { fields: ['name'], limit: 1 }).catch(() => []);
      ecommerceCount = (Array.isArray(shopifyLog) ? shopifyLog.length : 0) + (Array.isArray(ecommerceItems) ? ecommerceItems.length : 0);
      if (ecommerceCount > 0) {
        ecommerceConfigured = true;
        ecommerceDetails = 'تزامن ERPNext مع التجارة الإلكترونية';
        ecommerceLastSync = new Date().toISOString();
      }
    }
    results.push({
      key: 'ecommerce',
      status: ecommerceConfigured ? 'connected' : 'disconnected',
      configured: ecommerceConfigured,
      lastSync: ecommerceLastSync,
      details: ecommerceDetails,
      erpNextDocCount: ecommerceCount,
    });
  } catch {
    results.push({ key: 'ecommerce', status: 'error', configured: false, lastSync: null, details: 'تعذر التحقق من حالة التجارة الإلكترونية', erpNextDocCount: 0 });
  }

  // ── Webhooks ──
  try {
    let webhookCount = 0;
    let webhookConfigured = false;
    let webhookDetails = 'لم يتم إعداد خطافات الويب';
    if (backendAvailable) {
      const webhooks = await getList('Webhook', { fields: ['name', 'webhook_doctype', 'enabled'], limit: 20 }).catch(() => []);
      webhookCount = Array.isArray(webhooks) ? webhooks.length : 0;
      if (webhookCount > 0) {
        webhookConfigured = true;
        webhookDetails = `يوجد ${webhookCount} خطاف ويب في ERPNext`;
      }
    }
    // Also check local developer portal
    const devPortal = await loadDeveloperPortalStoreResolved();
    const localWebhooks = devPortal.webhooks?.length ?? 0;
    if (localWebhooks > 0) {
      webhookConfigured = true;
      webhookCount += localWebhooks;
      webhookDetails = webhookCount > localWebhooks
        ? `${webhookCount} خطاف ويب (ERPNext + محلي)`
        : `يوجد ${localWebhooks} خطاف ويب محلي`;
    }
    results.push({
      key: 'webhooks',
      status: webhookConfigured ? 'connected' : 'disconnected',
      configured: webhookConfigured,
      lastSync: webhookConfigured ? new Date().toISOString() : null,
      details: webhookDetails,
      erpNextDocCount: webhookCount - localWebhooks,
    });
  } catch {
    results.push({ key: 'webhooks', status: 'error', configured: false, lastSync: null, details: 'تعذر التحقق من حالة خطافات الويب', erpNextDocCount: 0 });
  }

  // Compute KPIs
  const configured = results.filter((r) => r.configured).length;
  const connected = results.filter((r) => r.status === 'connected').length;
  const disconnected = results.filter((r) => r.status === 'disconnected').length;
  const errors = results.filter((r) => r.status === 'error').length;

  return NextResponse.json({
    success: true,
    data: {
      integrations: results,
      kpis: { configured, connected, disconnected, errors, total: results.length },
      backendAvailable,
    },
  });
}
