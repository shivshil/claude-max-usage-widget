// Claude Max Usage Widget for Übersicht
// https://github.com/felixhageloh/uebersicht
//
// Displays Claude Max subscription usage (5-hour, 7-day, Opus, Sonnet)
// with automatic OAuth token refresh so it never shows stale auth errors.
//
// Setup: Place both this file and claude-usage-fetch.py in your
//        Übersicht widgets folder, then update SCRIPT_PATH below.

const SCRIPT_PATH = "~/.claude/claude-usage-fetch.py";

export const command = `/usr/bin/python3 ${SCRIPT_PATH}`;

export const refreshFrequency = 5 * 60 * 1000; // 5 minutes

export const className = `
  bottom: 20px;
  left: 20px;
  width: 280px;
  background: rgba(15, 15, 15, 0.85);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 18px;
  font-family: -apple-system, BlinkMacSystemFont, Helvetica Neue, sans-serif;
  color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
`;

function getBarColor(pct) {
  if (pct >= 90) return "#EF4444";
  if (pct >= 70) return "#F59E0B";
  if (pct >= 40) return "#3B82F6";
  return "#10B981";
}

function timeUntil(isoStr) {
  if (!isoStr) return "";
  var diff = new Date(isoStr) - new Date();
  if (diff <= 0) return "resetting...";
  var hours = Math.floor(diff / 3600000);
  var mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return "resets in " + hours + "h " + mins + "m";
  return "resets in " + mins + "m";
}

function Bar({ label, pct, resetsAt }) {
  var remaining = Math.max(0, 100 - pct);
  var color = getBarColor(pct);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: 0.5 }}>
          {label}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: color }}>
          {remaining.toFixed(0)}% left
        </span>
      </div>
      <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: pct + "%", height: "100%", background: color, borderRadius: 3 }} />
      </div>
      {resetsAt ? <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>{timeUntil(resetsAt)}</div> : null}
    </div>
  );
}

export const render = ({ output }) => {
  var data;
  try {
    data = JSON.parse(output);
  } catch (e) {
    return <div style={{ fontSize: 12, color: "rgba(255,100,100,0.8)", textAlign: "center" }}>Loading...</div>;
  }

  if (data.error) {
    return <div style={{ fontSize: 12, color: "rgba(255,100,100,0.8)", textAlign: "center" }}>Auth error — open Claude Code to sign in</div>;
  }

  var isStale = data._stale;

  var extraLabel = "";
  var extraPct = 0;
  if (data.extra_usage && data.extra_usage.is_enabled) {
    extraPct = data.extra_usage.utilization;
    var spent = data.extra_usage.used_credits / 100;
    extraLabel = "$" + spent.toFixed(0) + " spent";
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.3, opacity: isStale ? 0.5 : 1 }}>Claude Max{isStale ? " (stale)" : ""}</span>
        <span style={{ fontSize: 10, fontWeight: 500, color: "#D97706", background: "rgba(217,119,6,0.12)", padding: "2px 8px", borderRadius: 6 }}>
          MAX 20x
        </span>
      </div>

      {data.five_hour ? <Bar label="5-Hour" pct={data.five_hour.utilization} resetsAt={data.five_hour.resets_at} /> : null}
      {data.seven_day ? <Bar label="7-Day" pct={data.seven_day.utilization} resetsAt={data.seven_day.resets_at} /> : null}
      {data.seven_day_sonnet ? <Bar label="Sonnet 7-Day" pct={data.seven_day_sonnet.utilization} resetsAt={data.seven_day_sonnet.resets_at} /> : null}
      {data.seven_day_opus ? <Bar label="Opus 7-Day" pct={data.seven_day_opus.utilization} resetsAt={data.seven_day_opus.resets_at} /> : null}

      {data.extra_usage && data.extra_usage.is_enabled ? (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Extra Credits
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>
              {extraLabel}
            </span>
          </div>
          <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: Math.min(extraPct, 100) + "%", height: "100%", background: "rgba(255,255,255,0.3)", borderRadius: 3 }} />
          </div>
        </div>
      ) : null}
    </div>
  );
};
