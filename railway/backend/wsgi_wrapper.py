"""
WSGI Wrapper for ERPNext on Railway/PaaS
==========================================
CRITICAL FIX: Frappe needs to know WHERE the sites directory is.
Without this fix, frappe.init() uses sites_path="." which resolves
to the bench directory, causing it to look for the site at:
  /home/frappe/frappe-bench/erppro/     (WRONG!)
instead of:
  /home/frappe/frappe-bench/sites/erppro/  (CORRECT!)

This wrapper does THREE things:
1. Changes working directory to sites/ (so relative paths work)
2. Sets frappe.app._site = "erppro" (tells Frappe which site to serve)
3. Sets frappe.app._sites_path to ABSOLUTE path (tells Frappe WHERE to find sites)
"""

import os
import sys

SITE_NAME = os.environ.get("SITE_NAME", "erppro")
BENCH_DIR = "/home/frappe/frappe-bench"
SITES_DIR = os.environ.get("SITES_PATH", os.path.join(BENCH_DIR, "sites"))

# ★★★ FIX #1: Change working directory to sites/ ★★★
# This ensures that any code using relative paths from CWD will find the sites
# Must be done BEFORE importing frappe
os.chdir(SITES_DIR)
print(f"[WSGI_WRAPPER] Changed CWD to: {os.getcwd()}", flush=True)

# ★★★ FIX #2: Set Frappe's global site variables BEFORE importing the app ★★★
# These globals are used by frappe.app.init_request():
#   site = _site or request.headers.get("X-Frappe-Site-Name") or get_site_name(request.host)
#   frappe.init(site, sites_path=_sites_path, force=True)
# Without setting these, _sites_path=None and Frappe uses "." as sites_path!

import frappe.app
frappe.app._site = SITE_NAME
frappe.app._sites_path = SITES_DIR  # ABSOLUTE path - critical!

print(f"[WSGI_WRAPPER] Set frappe.app._site = '{SITE_NAME}'", flush=True)
print(f"[WSGI_WRAPPER] Set frappe.app._sites_path = '{SITES_DIR}'", flush=True)

# Verify the site directory exists
site_path = os.path.join(SITES_DIR, SITE_NAME)
if os.path.isdir(site_path):
    print(f"[WSGI_WRAPPER] Site directory exists: {site_path}", flush=True)
    logs_dir = os.path.join(site_path, "logs")
    if os.path.isdir(logs_dir):
        print(f"[WSGI_WRAPPER] Logs directory exists: {logs_dir}", flush=True)
    else:
        print(f"[WSGI_WRAPPER] WARNING: Logs directory missing: {logs_dir}", flush=True)
        os.makedirs(logs_dir, exist_ok=True)
else:
    print(f"[WSGI_WRAPPER] WARNING: Site directory NOT found: {site_path}", flush=True)

# Now import the application - it will use our _site and _sites_path values
from frappe.app import application

print(f"[WSGI_WRAPPER] Frappe WSGI application loaded successfully!", flush=True)
print(f"[WSGI_WRAPPER] Site: {SITE_NAME}, Sites path: {SITES_DIR}", flush=True)
print(f"[WSGI_WRAPPER] CWD: {os.getcwd()}", flush=True)
