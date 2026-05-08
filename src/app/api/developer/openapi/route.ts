import { NextResponse } from 'next/server';

const OPENAPI_DOC = {
  openapi: '3.0.3',
  info: {
    title: 'ERP Pro Developer API',
    version: '1.0.0',
    description: 'REST API catalog for ERP Pro integration.',
  },
  servers: [{ url: '/api' }],
  paths: {
    '/data/{doctype}': {
      get: { summary: 'List documents' },
      post: { summary: 'Create document' },
    },
    '/data/{doctype}/{name}': {
      get: { summary: 'Get document by name' },
      put: { summary: 'Update document' },
      delete: { summary: 'Delete document' },
    },
    '/reports/{reportName}': {
      get: { summary: 'Run report' },
    },
    '/developer/api-keys': {
      get: { summary: 'List API keys' },
      post: { summary: 'Create API key' },
      delete: { summary: 'Revoke API key by id query param' },
    },
    '/developer/webhooks': {
      get: { summary: 'List webhooks' },
      post: { summary: 'Create webhook' },
      put: { summary: 'Dispatch event to matching webhooks with retry' },
    },
    '/developer/rate-limit': {
      get: { summary: 'Read current rate limit policy' },
    },
  },
  components: {
    schemas: {
      ApiKey: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          key: { type: 'string' },
          scopes: {
            type: 'array',
            items: { type: 'string', enum: ['read', 'write', 'reports', 'webhooks', 'admin'] },
          },
        },
      },
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
      },
    },
  },
};

export async function GET() {
  return NextResponse.json({ success: true, data: OPENAPI_DOC });
}
