"""
WSGI Middleware for ERPNext on Railway/PaaS
============================================
ERPNext resolves the site to serve based on:
1. X-Frappe-Site-Name header (highest priority)
2. Host header → looks for a site directory matching the hostname

On Railway, the Host header is something like:
  erpnext-backend-production-cde7.up.railway.app

But the site is named "erppro" — so ERPNext returns 404 "does not exist".

This middleware injects the X-Frappe-Site-Name header into every request,
telling ERPNext which site to serve, regardless of the Host header.

This is the SAME approach used by the official Frappe Docker setup's
nginx frontend, which sets:
  proxy_set_header X-Frappe-Site-Name $FRAPPE_SITE_NAME_HEADER;
"""

import os

SITE_NAME = os.environ.get("SITE_NAME", "erppro")

# Import the original Frappe WSGI application
from frappe.app import application as _original_app


class FrappeSiteNameMiddleware:
    """WSGI middleware that injects X-Frappe-Site-Name header."""

    def __init__(self, app, site_name):
        self.app = app
        self.site_name = site_name

    def __call__(self, environ, start_response):
        # Inject the X-Frappe-Site-Name header
        # WSGI headers are stored as HTTP_* environment variables
        # X-Frappe-Site-Name becomes HTTP_X_FRAPPE_SITE_NAME
        environ["HTTP_X_FRAPPE_SITE_NAME"] = self.site_name
        return self.app(environ, start_response)


# Wrap the original application
application = FrappeSiteNameMiddleware(_original_app, SITE_NAME)
