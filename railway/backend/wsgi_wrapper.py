"""
WSGI Wrapper for ERPNext on Railway/PaaS
==========================================
In the official Frappe Docker setup, an nginx frontend container handles:
1. Setting X-Frappe-Site-Name header to tell Frappe which site to serve
2. Routing requests to the correct backend

On Railway, we don't have nginx. So this wrapper does TWO things:
1. Sets frappe.app._site = "erppro" (tells Frappe which site to serve)
2. Sets frappe.app._sites_path = "sites" (tells Frappe WHERE to find sites)

Without _sites_path, frappe.init() uses "." as the sites path, which means
it looks for the site at ./erppro instead of ./sites/erppro — causing 404!

This is the exact same mechanism that the dev server (bench start) uses:
  frappe.app._site = site_name
  frappe.app._sites_path = sites_path
"""

import os
import sys

SITE_NAME = os.environ.get("SITE_NAME", "erppro")

# Set the sites path relative to the bench directory
# gunicorn's working directory is /home/frappe/frappe-bench (set in supervisord.conf)
# So "sites" resolves to /home/frappe/frappe-bench/sites
SITES_PATH = os.environ.get("SITES_PATH", "sites")

# ★★★ KEY FIX: Set Frappe's global site variables BEFORE importing the app ★★★
# These globals are used by frappe.app.init_request():
#   site = _site or request.headers.get("X-Frappe-Site-Name") or get_site_name(request.host)
#   frappe.init(site, sites_path=_sites_path, force=True)
# Without setting these, _sites_path=None and Frappe can't find the sites directory!

import frappe.app
frappe.app._site = SITE_NAME
frappe.app._sites_path = SITES_PATH

print(f"[WSGI_WRAPPER] Set frappe.app._site = '{SITE_NAME}'")
print(f"[WSGI_WRAPPER] Set frappe.app._sites_path = '{SITES_PATH}'")

# Now import the application — it will use our _site and _sites_path values
from frappe.app import application

print(f"[WSGI_WRAPPER] Frappe WSGI application loaded successfully!")
print(f"[WSGI_WRAPPER] Site: {SITE_NAME}, Sites path: {SITES_PATH}")
