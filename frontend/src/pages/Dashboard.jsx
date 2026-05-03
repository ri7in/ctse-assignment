import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { trackerApi, projectApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useEvents } from "../context/EventContext";
import { C, FONT, SHADOW, PROJECT_COLORS } from "../ds";

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid " + C.border, boxShadow: SHADOW.sm, padding: "24px", flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 13, color: C.sub, fontWeight: 500, marginBottom: 10 }}>{label}</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: C.text, letterSpacing: "-.03em", lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>{sub}</div>}
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{icon}</div>
      </div>
    </div>
  );
}

function WeekChart({ dailyStats }) {
  if (!dailyStats?.length) return null;
  const max = Math.max(...dailyStats.map(d => d.totalMinutes), 60);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80 }}>
      {dailyStats.map((day) => {
        const pct = max > 0 ? (day.totalMinutes / max) : 0;
        const h = Math.max(4, Math.round(pct * 72));
        const d = new Date(day.date);
        const label = days[d.getDay()] ?? day.date.slice(5);
        return (
          <div key={day.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ fontSize: 10, color: C.muted }}>{day.totalMinutes > 0 ? day.totalMinutes + "m" : ""}</div>
            <div style={{ width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", height: 52 }}>
              <div style={{ width: "72%", maxWidth: 28, height: h, background: pct > 0.6 ? C.accent : pct > 0.25 ? "#FF8FA3" : C.border, borderRadius: "4px 4px 2px 2px" }} />
            </div>
            <div style={{ fontSize: 11, color: C.sub }}>{label}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { unreadCount } = useEvents();
  const [dashboard, setDashboard] = useState(null);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    trackerApi.getDashboard().then(({ data }) => setDashboard(data)).catch(() => { });
    projectApi.list().then(({ data }) => setProjects(data)).catch(() => { });
  }, []);

  const totalTasks = projects.reduce((s, p) => s + (p.totalTasks || 0), 0);
  const completedTasks = projects.reduce((s, p) => s + (p.completedTasks || 0), 0);
  const totalTime = dashboard?.dailyStats?.reduce((s, d) => s + d.totalMinutes, 0) ?? 0;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px", fontFamily: FONT }}>
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 34, fontWeight: 700, color: C.text, letterSpacing: "-.03em", margin: 0 }}>
          Welcome back, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p style={{ fontSize: 16, color: C.sub, margin: "8px 0 0" }}>Here is what is happening with your projects today.</p>
      </div>

      {unreadCount > 0 && (
        <Link to="/inbox" style={{ textDecoration: "none" }}>
          <div style={{ background: "linear-gradient(135deg, " + C.accent + ", #FF6B8A)", borderRadius: 14, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
            <span style={{ fontSize: 18 }}>🔔</span>
            <span style={{ color: "#fff", fontSize: 14, fontWeight: 500 }}>You have {unreadCount} unread notification{unreadCount > 1 ? "s" : ""} — View inbox</span>
            <span style={{ marginLeft: "auto", color: "rgba(255,255,255,.7)", fontSize: 14 }}>→</span>
          </div>
        </Link>
      )}

      <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
        <StatCard label="Projects" value={projects.length} sub="Active workspaces" color={C.info} icon="📁" />
        <StatCard label="Total Tasks" value={totalTasks} sub="Across all projects" color={C.accent} icon="✅" />
        <StatCard label="Completed" value={completedTasks} sub={(totalTasks > 0 ? Math.round(completedTasks / totalTasks * 100) : 0) + "% rate"} color={C.success} icon="🎯" />
        <StatCard label="Time This Week" value={Math.floor(totalTime / 60) + "h " + (totalTime % 60) + "m"} sub="Logged hours" color={C.warning} icon="⏱" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "-.02em", margin: 0 }}>My Projects</h2>
            <Link to="/projects" style={{ fontSize: 13, color: C.accent, fontWeight: 600, textDecoration: "none" }}>View all →</Link>
          </div>
          {projects.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid " + C.border, padding: "48px 32px", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 8 }}>No projects yet</div>
              <div style={{ fontSize: 14, color: C.sub, marginBottom: 20 }}>Create your first project to get started</div>
              <Link to="/projects" style={{ background: C.accent, color: "#fff", borderRadius: 9999, padding: "10px 20px", fontSize: 14, fontWeight: 600, textDecoration: "none", display: "inline-block" }}>Create project</Link>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 16 }}>
              {projects.map((p, i) => {
                const pct = p.totalTasks > 0 ? Math.round(p.completedTasks / p.totalTasks * 100) : 0;
                const color = PROJECT_COLORS[i % PROJECT_COLORS.length];
                return (
                  <Link key={p._id} to={"/tasks?projectId=" + p._id} style={{ textDecoration: "none" }}>
                    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid " + C.border, boxShadow: SHADOW.sm, overflow: "hidden", cursor: "pointer" }}>
                      <div style={{ height: 6, background: color }} />
                      <div style={{ padding: "20px 20px 18px" }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: C.sub, marginBottom: 16, lineHeight: 1.5 }}>{p.description || "No description"}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <span style={{ fontSize: 11, color: C.sub }}>{p.completedTasks}/{p.totalTasks} tasks</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color }}>{pct}%</span>
                        </div>
                        <div style={{ background: C.bg, borderRadius: 4, height: 5, overflow: "hidden" }}>
                          <div style={{ background: color, height: "100%", width: pct + "%", borderRadius: 4 }} />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid " + C.border, boxShadow: SHADOW.sm, padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>Weekly Activity</div>
          <div style={{ fontSize: 13, color: C.sub, marginBottom: 24 }}>Time logged per day</div>
          {dashboard?.dailyStats ? <WeekChart dailyStats={dashboard.dailyStats} /> : <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: C.muted }}>Loading…</div>}
          {totalTime > 0 && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid " + C.border }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>{Math.floor(totalTime / 60)}h {totalTime % 60}m</div>
              <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>total this week</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
