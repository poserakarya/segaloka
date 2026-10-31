// Wajib paling awal: memuat secret NAMA_FILE sebelum modul lain membaca env.
import './config/secret-files.js';
import { registerControlCenterSummaryRoute } from './control-center/summary-route.js';
import { registerControlCenterTravelRoutes } from './control-center/travel-routes.js';
import { registerControlCenterVendorRoutes } from './control-center/vendor-routes.js';
import { registerControlCenterBookingRoutes } from './control-center/booking-routes.js';
import { registerControlCenterAuditLogRoutes } from './control-center/audit-log-routes.js';
import { registerTravelDemoRoutes } from './control-center/travel-demo-routes.js';
import { registerMembershipPermissionRoutes } from './control-center/membership-permission-routes.js';
import { registerDashboardAccessRoute } from './security/dashboard-access-route.js';
import { registerMarketplaceHandoffRoutes } from './auth/marketplace-handoff-routes.js';
import { registerTravelerCertificateRoutes } from './travel/certificate-routes.js';
import Fastify from 'fastify';
import { registerTravelStatusRoutes } from './travel/status-routes.js';
import { registerBookingRoutes } from './travel/booking-routes.js';
import { registerDepartureRoutes } from './travel/departure-routes.js';
import { createIngressPreParsing } from './security/ingress-preparsing.js';
import { registerLoginRoute } from './auth/login-route.js';
import { registerLoginOtpVerifyRoute } from './auth/login-otp-verify-route.js';
import { registerLoginAuthenticatorVerifyRoute } from './auth/login-authenticator-verify-route.js';
import { registerGoogleConfigRoutes } from './auth/google-config-route.js';
import { registerGoogleOAuthStartRoute } from './auth/google-oauth-start-route.js';
import { registerLoginSelectChannelRoute } from './auth/login-select-channel-route.js';
import { registerGoogleOAuthCallbackRoute } from './auth/google-oauth-callback-route.js';
import { registerGoogleOAuthExchangeRoute } from './auth/google-oauth-exchange-route.js';
import { corsDelegator } from './security/cors-policy.js';
import { registerSessionRoutes } from './auth/session-route.js';
import { registerDashboardHandoffRoutes } from './auth/dashboard-handoff-route.js';
import { registerSecurityTwoFactorRoutes } from './auth/security-two-factor-routes.js';
import { registerMeRoute } from './auth/me-route.js';
import { registerDocumentRoutes } from './documents/document-routes.js';
import { registerRegistrationRoute } from './auth/registration-route.js';
import { registerEmailVerificationRoute } from './auth/email-verification-route.js';
import { registerResendVerificationRoute } from './auth/resend-verification-route.js';
import { registerPasswordResetRoutes } from './auth/password-reset-route.js';
import { registerPasswordResetOtpRoutes } from './auth/password-reset-otp-route.js';
import { registerResendWebhookRoute } from './auth/resend-webhook-route.js';
import { registerPortalBookingRoutes } from './portal-booking-routes.js';
import { registerSyncRoutes } from './sync-routes.js';
import { registerAffiliateReferralLinkRoutes } from './affiliate/referral-links-route.js';
import { registerAffiliateApplicationRoutes } from './affiliate/application-routes.js';
import { registerPartnerRegistrationRoutes } from './partner-registration-routes.js';
import { registerLocationMasterRoutes } from './location-master-routes.js';
import { registerPartnerRegistrationDraftRoutes } from './partner-registration-draft-routes-v3.js';
import { registerRegistrationDocumentMetadataRoutes } from './registration-document-metadata-routes.js';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const host = process.env.API_HOST ?? '127.0.0.1';
const port = Number(process.env.API_PORT ?? 4190);

const app = Fastify({
  logger: {
    level: 'info',
    redact: [
      'req.headers.authorization',
      'req.headers.cookie'
    ]
  }
});

await app.register(helmet);

await app.register(cors, { delegator: corsDelegator });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true',
  max: 5,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000
});

const ingressIdentitySecret = process.env.INGRESS_IDENTITY_SECRET;

if (
  typeof ingressIdentitySecret !== 'string' ||
  ingressIdentitySecret.length < 32
) {
  throw new Error('INVALID_INGRESS_IDENTITY_SECRET');
}

{

  const verifyIngress = createIngressPreParsing(
    pool,
    ingressIdentitySecret
  );

  app.addHook('preParsing', async (request, reply, payload) => {
    const method = request.raw.method;
    const rawTarget = request.raw.url;

    const path = rawTarget.split('?')[0];

    const publicCertificateRoute =
      method === 'GET' && (
        /^\/certificates\/verify\/[^/]+$/.test(path) ||
        /^\/certificates\/[^/]+\/pdf$/.test(path)
      );

    const publicGoogleOAuthRoute =
      method === 'GET' && (
        path === '/auth/google/start' ||
        path === '/auth/google/callback'
      );

    const publicResendWebhookRoute =
      method === 'POST' && path === '/webhooks/resend';

    if (
      method === 'OPTIONS' ||
      (method === 'GET' && (
        path === '/health' ||
        path === '/ready'
      )) ||
      publicCertificateRoute ||
      publicGoogleOAuthRoute ||
      publicResendWebhookRoute
    ) {
      return payload;
    }

    return verifyIngress(request, reply, payload);
  });
}

app.get('/health', async () => ({
  status: 'ok',
  service: 'segaloka-api'
}));

app.get('/ready', async (request, reply) => {
  try {
    const result = await pool.query(`
      SELECT
        current_database() AS database_name,
        (
          SELECT COUNT(*)::int
          FROM information_schema.tables
          WHERE table_schema = 'public'
        ) AS table_count,
        (
          SELECT COUNT(*)::int
          FROM public.roles
        ) AS role_count
    `);

    const database = result.rows[0];

    if (database.table_count < 8 || database.role_count < 7) {
      return reply.code(503).send({
        status: 'not_ready',
        service: 'segaloka-api'
      });
    }

    return {
      status: 'ready',
      service: 'segaloka-api',
      database: {
        connected: true,
        tables: database.table_count,
        roles: database.role_count
      }
    };
  } catch (error) {
    request.log.error({ err: error }, 'Database readiness failed');

    return reply.code(503).send({
      status: 'not_ready',
      service: 'segaloka-api',
      database: {
        connected: false
      }
    });
  }
});

await registerLoginRoute(app, pool);
await registerLoginOtpVerifyRoute(app, pool);
await registerLoginAuthenticatorVerifyRoute(app, pool);
await registerGoogleConfigRoutes(app, pool);
await registerGoogleOAuthStartRoute(app, pool);
await registerLoginSelectChannelRoute(app, pool);
await registerGoogleOAuthCallbackRoute(app, pool);
await registerGoogleOAuthExchangeRoute(app, pool);
await registerSessionRoutes(app, pool);
await registerDashboardHandoffRoutes(app, pool);
await registerSecurityTwoFactorRoutes(app, pool);
await registerMeRoute(app, pool);
await registerDashboardAccessRoute(app, pool);
await registerMarketplaceHandoffRoutes(app, pool);
await registerControlCenterSummaryRoute(app, pool);
await registerControlCenterTravelRoutes(app, pool);
await registerControlCenterVendorRoutes(app, pool);
await registerControlCenterBookingRoutes(app, pool);
await registerControlCenterAuditLogRoutes(app, pool);
await registerTravelDemoRoutes(app, pool);
await registerMembershipPermissionRoutes(app, pool);
await registerDocumentRoutes(app, pool);
await registerDepartureRoutes(app, pool);
await registerBookingRoutes(app, pool);
await registerTravelStatusRoutes(app, pool);
await registerTravelerCertificateRoutes(app, pool);
await registerPortalBookingRoutes(app, pool);
await registerAffiliateReferralLinkRoutes(app, pool);
await registerAffiliateApplicationRoutes(app, pool);
await registerPartnerRegistrationRoutes(app, pool);
await registerLocationMasterRoutes(app, pool);
await registerPartnerRegistrationDraftRoutes(app, pool);
await registerRegistrationDocumentMetadataRoutes(app, pool);
await registerSyncRoutes(app, pool);
await registerRegistrationRoute(app, pool);
await registerEmailVerificationRoute(app, pool);
await registerResendVerificationRoute(app, pool);
await registerPasswordResetRoutes(app, pool);
registerPasswordResetOtpRoutes(app, pool);
await registerResendWebhookRoute(app, pool);

app.addHook('onClose', async () => {
  await pool.end();
});

const shutdown = async () => {
  try {
    await app.close();
    process.exit(0);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
