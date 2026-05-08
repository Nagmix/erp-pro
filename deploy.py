#!/usr/bin/env python3
"""Deploy ERP Pro to remote server via SSH (paramiko)."""

import paramiko
import time
import sys

HOST = "51.21.180.207"
USER = "ubuntu"
KEY_PATH = "/home/z/my-project/upload/Noor1 (1).pem"
PROJECT_DIR = "/home/ubuntu/erp-pro"

def run_cmd(ssh, cmd, timeout=300):
    """Run a command over SSH and stream stdout/stderr."""
    print(f"\n{'='*60}")
    print(f"▶ RUN: {cmd}")
    print(f"{'='*60}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    exit_code = stdout.channel.recv_exit_status()
    if out:
        print(out)
    if err:
        print(f"[STDERR] {err}")
    print(f"[EXIT CODE: {exit_code}]")
    return exit_code, out, err

def main():
    # Load SSH key
    key = paramiko.RSAKey.from_private_key_file(KEY_PATH)
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    print(f"Connecting to {USER}@{HOST} ...")
    ssh.connect(HOST, username=USER, pkey=key, timeout=30)
    print("Connected!\n")

    steps = [
        (f"cd {PROJECT_DIR} && git pull origin main", 120),
        (f"cd {PROJECT_DIR} && npm install", 300),
        (f"cd {PROJECT_DIR} && npm run build", 600),
        (f"cd {PROJECT_DIR} && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/ && cp .env .next/standalone/ && cp -r data .next/standalone/", 60),
        (f"pm2 restart erp-pro", 30),
    ]

    for cmd, timeout in steps:
        exit_code, out, err = run_cmd(ssh, cmd, timeout=timeout)
        if exit_code != 0:
            # For git pull, non-zero might mean "already up to date" in some edge cases
            # but we still warn
            print(f"⚠️  Command exited with code {exit_code}")
            # Don't abort — continue deployment

    # Wait 3 seconds then check status
    print("\n⏳ Waiting 3 seconds for app to start...")
    time.sleep(3)

    run_cmd(ssh, "pm2 status", 30)

    # Test the app
    exit_code, out, err = run_cmd(ssh, 'curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login', 30)
    
    http_code = out.strip()
    print(f"\n{'='*60}")
    if http_code == "200":
        print(f"✅ DEPLOYMENT SUCCESSFUL — HTTP {http_code}")
    else:
        print(f"❌ DEPLOYMENT ISSUE — HTTP {http_code}")
    print(f"{'='*60}")

    ssh.close()
    print("\nSSH connection closed.")

if __name__ == "__main__":
    main()
