#!/usr/bin/env python3
"""Fetch Claude usage data with automatic OAuth token refresh.

Reads Claude Code OAuth credentials from the macOS Keychain,
auto-refreshes expired tokens, and caches the last good response
so the widget always has something to display.
"""

import json
import os
import subprocess
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen

SERVICE = "Claude Code-credentials"
CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e"
TOKEN_URL = "https://console.anthropic.com/v1/oauth/token"
USAGE_URL = "https://api.anthropic.com/api/oauth/usage"
CACHE = "/tmp/claude-usage-cache.json"


def read_creds():
    """Read credentials from macOS Keychain."""
    r = subprocess.run(
        ["/usr/bin/security", "find-generic-password", "-s", SERVICE, "-w"],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        return None, None
    creds = json.loads(r.stdout.strip())
    # Detect account name for write-back
    meta = subprocess.run(
        ["/usr/bin/security", "find-generic-password", "-s", SERVICE],
        capture_output=True, text=True,
    )
    account = None
    for line in meta.stdout.splitlines():
        if '"acct"' in line:
            account = line.split('"')[-2] if '"' in line.split("=")[-1] else None
            break
    return creds, account


def write_creds(creds, account):
    """Write updated credentials back to macOS Keychain."""
    args = ["/usr/bin/security", "add-generic-password", "-U",
            "-s", SERVICE, "-w", json.dumps(creds)]
    if account:
        args += ["-a", account]
    subprocess.run(args, capture_output=True)


def refresh(tok):
    """Exchange a refresh token for new access + refresh tokens."""
    data = urlencode({
        "grant_type": "refresh_token",
        "refresh_token": tok,
        "client_id": CLIENT_ID,
    }).encode()
    req = Request(TOKEN_URL, data=data,
                  headers={"Content-Type": "application/x-www-form-urlencoded"})
    return json.loads(urlopen(req, timeout=10).read())


def fetch_usage(token):
    """Call the Claude usage API."""
    req = Request(USAGE_URL, headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "anthropic-beta": "oauth-2025-04-20",
    })
    return json.loads(urlopen(req, timeout=10).read())


def read_cache():
    try:
        with open(CACHE) as f:
            return json.load(f)
    except Exception:
        return None


def write_cache(data):
    try:
        with open(CACHE, "w") as f:
            json.dump(data, f)
    except Exception:
        pass


def do_refresh(oauth, creds, account):
    """Attempt to refresh the OAuth token and persist new credentials."""
    refresh_tok = oauth.get("refreshToken", "")
    if not refresh_tok:
        return None
    new = refresh(refresh_tok)
    oauth["accessToken"] = new["access_token"]
    oauth["refreshToken"] = new.get("refresh_token", refresh_tok)
    if "expires_in" in new:
        oauth["expiresAt"] = int(time.time() * 1000) + new["expires_in"] * 1000
    creds["claudeAiOauth"] = oauth
    write_creds(creds, account)
    return oauth["accessToken"]


def main():
    try:
        creds, account = read_creds()
        if not creds:
            raise Exception("no creds")

        oauth = creds.get("claudeAiOauth", {})
        token = oauth.get("accessToken", "")
        expires_at = oauth.get("expiresAt", 0)
        now_ms = int(time.time() * 1000)

        # Proactively refresh if expiring within 5 minutes
        if expires_at and now_ms > expires_at - 300_000:
            try:
                token = do_refresh(oauth, creds, account) or token
            except Exception:
                pass

        data = fetch_usage(token)

        # If the API returned an error, try one refresh
        if "error" in data:
            try:
                new_token = do_refresh(oauth, creds, account)
                if new_token:
                    data = fetch_usage(new_token)
            except Exception:
                pass

        if "error" not in data:
            write_cache(data)
            print(json.dumps(data))
        else:
            raise Exception("API error")

    except Exception:
        cached = read_cache()
        if cached:
            cached["_stale"] = True
            print(json.dumps(cached))
        else:
            print(json.dumps({"error": True}))


if __name__ == "__main__":
    main()
