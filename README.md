# Claude Max Usage Widget for Übersicht

A minimal [Übersicht](https://github.com/felixhageloh/uebersicht) widget that displays your Claude Max subscription usage — 5-hour, 7-day, Opus, and Sonnet rate limits — with automatic OAuth token refresh.

![Widget Screenshot](screenshot.png)

## Features

- Real-time usage bars for all Claude Max rate limit windows
- Countdown timers showing when each limit resets
- Extra credits spending tracker
- **Automatic OAuth token refresh** — no more "Auth error" when your token expires
- Caches last known data and shows a "(stale)" indicator as a fallback
- Refreshes every 5 minutes

## Requirements

- macOS
- [Übersicht](https://tracesof.net/uebersicht/)
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) (must be signed in at least once so credentials exist in Keychain)
- Python 3 (ships with macOS)

## Installation

1. **Copy the fetch script** somewhere permanent:

   ```bash
   cp claude-usage-fetch.py ~/.claude/claude-usage-fetch.py
   chmod +x ~/.claude/claude-usage-fetch.py
   ```

2. **Copy the widget** to your Übersicht widgets folder:

   ```bash
   cp claude-usage.jsx ~/Library/Application\ Support/Übersicht/widgets/
   ```

3. **Update `SCRIPT_PATH`** in `claude-usage.jsx` if you placed the Python script somewhere other than `~/.claude/`:

   ```js
   const SCRIPT_PATH = "~/.claude/claude-usage-fetch.py";
   ```

4. Übersicht will auto-detect the new widget.

## How It Works

1. Reads your Claude Code OAuth credentials from the macOS Keychain
2. Checks if the access token is expired (or expiring within 5 minutes)
3. If expired, uses the refresh token to obtain a new access token and persists it back to the Keychain
4. Calls the Claude usage API
5. Caches every successful response to `/tmp/claude-usage-cache.json`
6. On failure, falls back to cached data marked as stale

The widget never stores or logs credentials to disk — tokens are read from and written back to the macOS Keychain only.

## Customization

| Variable | Location | Default | Description |
|---|---|---|---|
| `SCRIPT_PATH` | `claude-usage.jsx` | `~/.claude/claude-usage-fetch.py` | Path to the Python script |
| `refreshFrequency` | `claude-usage.jsx` | `300000` (5 min) | How often to poll (ms) |
| `className` | `claude-usage.jsx` | bottom-left | CSS position and styling |

## Troubleshooting

**"Auth error — open Claude Code to sign in"**
- You haven't signed in to Claude Code yet, or the Keychain entry was deleted.
- Run `claude` in your terminal and sign in.

**"Loading..."**
- The Python script returned invalid output. Run it manually to debug:
  ```bash
  python3 ~/.claude/claude-usage-fetch.py
  ```

**"(stale)" showing**
- The token refresh and API call both failed, so cached data is displayed. This usually resolves on the next refresh cycle.

## License

MIT
