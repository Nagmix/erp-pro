# ============================================================
# ERP Pro - Frappe/ERPNext v16 + HRMS (Bunnyshell custom image)
# ============================================================
# Built on top of the official frappe/erpnext:v16 image and adds:
#   - HRMS app (version-16 branch) installed into the bench
#   - HRMS assets pre-built into the baked assets dir
#     (entrypoint.sh symlinks sites/assets -> /home/frappe/frappe-bench/assets)
#   - bns-init.sh bootstrap script (wait DB, set-config, create site,
#     install apps, start gunicorn + socketio + workers + scheduler)
# ============================================================

FROM frappe/erpnext:v16

USER frappe
WORKDIR /home/frappe/frappe-bench

# Install HRMS into the bench (code lives in the image layer => persists)
RUN bench get-app hrms --branch version-16

# Pre-build HRMS desk assets into the baked assets path used by the
# production entrypoint (which replaces sites/assets with a symlink)
RUN bench build --app hrms || true; \
    if [ -d sites/assets/hrms ]; then cp -a sites/assets/hrms /home/frappe/frappe-bench/assets/; fi; \
    rm -rf sites/assets

# Bunnyshell bootstrap script
COPY --chown=frappe:frappe bns-init.sh /usr/local/bin/bns-init.sh
RUN chmod 755 /usr/local/bin/bns-init.sh

EXPOSE 8000 9000

CMD ["/usr/local/bin/bns-init.sh"]
