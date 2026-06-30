"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Profile, Objective, NonNegotiable, DailyLog, DailyLogItem } from "@/lib/types";
import ProgressBar from "@/components/ProgressBar";
import HistoryGrid from "@/components/HistoryGrid";

function DashboardInner() {
  const params = useSearchParams();
  const router = useRouter();
  const profileId = params.get("p") || (typeof window !== "undefined" ? localStorage.getItem("tt90_profile_id") : null);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nns, setNns] = useState<NonNegotiable[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [todayItems, setTodayItems] = useState<DailyLogItem[]>([]);
  const [history, setHistory] = useState<DailyLog[]>([]);
  const [editingGoals, setEditingGoals] = useState(false);
  const [goalDrafts, setGoalDrafts] = useState<string[]>(["", "", ""]);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    if (!profileId) {
      router.push("/");
      return;
    }
    localStorage.setItem("tt90_profile_id", profileId);
    loadAll(profileId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  async function loadAll(pid: string) {
    setLoading(true);
    const { data: prof } = await supabase.from("profiles").select("*").eq("id", pid).single();
    if (!prof) {
      setLoading(false);
      return;
    }
    setProfile(prof);

    const { data: nnData } = await supabase
      .from("non_negotiables")
      .select("*")
      .eq("profile_id", pid)
      .eq("enabled", true)
      .order("sort_order");
    setNns(nnData || []);

    const { data: objData } = await supabase.from("objectives").select("*").eq("profile_id", pid).order("slot");
    setObjectives(objData || []);
    setGoalDrafts((objData || []).map((o) => o.text) ?? ["", "", ""]);

    const { data: todayRows } = await supabase.rpc("get_or_create_today_log", { p_profile_id: pid });
    const today = todayRows && todayRows[0];

    if (today) {
      const { data: logRow } = await supabase.from("daily_logs").select("*").eq("id", today.log_id).single();
      setTodayLog(logRow);
      const { data: items } = await supabase
        .from("daily_log_items")
        .select("*")
        .eq("daily_log_id", today.log_id);
      setTodayItems(items || []);
    }

    const { data: hist } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("profile_id", pid)
      .order("day_number");
    setHistory(hist || []);

    setLoading(false);
  }

  async function toggleItem(item: DailyLogItem) {
    const newDone = !item.done;
    setTodayItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: newDone } : i)));
    const { error } = await supabase.rpc("toggle_log_item", {
      p_log_item_id: item.id,
      p_done: newDone,
      p_note: null,
    });
    if (error) return;
    if (profileId) await loadAll(profileId);
  }

  async function saveNote(item: DailyLogItem, note: string) {
    setTodayItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, note } : i)));
    await supabase.rpc("toggle_log_item", { p_log_item_id: item.id, p_done: item.done, p_note: note });
  }

  async function saveGoals() {
    for (let i = 0; i < 3; i++) {
      const obj = objectives[i];
      if (obj) {
        await supabase.from("objectives").update({ text: goalDrafts[i] }).eq("id", obj.id);
      }
    }
    setEditingGoals(false);
    if (profileId) await loadAll(profileId);
  }

  if (loading) {
    return (
      <main style={{ maxWidth: 560, margin: "0 auto", padding: 60, textAlign: "center", color: "var(--muted)" }}>
        Cargando tu reto...
      </main>
    );
  }

  if (!profile) {
    return (
      <main style={{ maxWidth: 560, margin: "0 auto", padding: 60, textAlign: "center" }}>
        <p className="eyebrow">No encontramos ese reto</p>
        <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => router.push("/")}>
          Volver al inicio
        </button>
      </main>
    );
  }

  const allDoneToday = todayItems.length > 0 && todayItems.every((i) => i.done);
  const recoveryLink = typeof window !== "undefined" ? `${window.location.origin}/d?p=${profile.id}` : "";

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "32px 18px 100px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <p className="eyebrow">TT90 · Hola {profile.name}</p>
          <h1 className="display" style={{ fontSize: "1.6rem", margin: "4px 0 0" }}>
            Día {todayLog?.day_number ?? 1} de 90
          </h1>
        </div>
        <button className="btn-ghost" style={{ padding: "8px 14px", fontSize: "0.8rem" }} onClick={() => setShowShare(true)}>
          Mi link
        </button>
      </header>

      <section className="card" style={{ padding: 20, marginBottom: 24 }}>
        <ProgressBar streak={profile.current_streak} />
        <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: 14 }}>
          Racha más larga: <b style={{ color: "var(--white)" }}>{profile.longest_streak} días</b>
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <p className="eyebrow" style={{ marginBottom: 12 }}>Hoy · marcá lo que cumpliste</p>
        <div className="card" style={{ padding: 6 }}>
          {todayItems.map((item) => {
            const nn = nns.find((n) => n.id === item.non_negotiable_id);
            if (!nn) return null;
            return (
              <div key={item.id} style={{ padding: "14px 14px", borderBottom: "1px solid var(--card-border)" }}>
                <div
                  onClick={() => toggleItem(item)}
                  style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 8,
                      border: item.done ? "none" : "2px solid var(--card-border)",
                      background: item.done ? "linear-gradient(135deg, var(--gold-1), var(--gold-3))" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {item.done && <span style={{ color: "#1a1306", fontWeight: 900 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: "1.2rem" }}>{nn.icon}</span>
                  <span style={{ fontWeight: 600 }}>{nn.name}</span>
                </div>
                <input
                  type="text"
                  placeholder="Nota opcional..."
                  defaultValue={item.note || ""}
                  onBlur={(e) => saveNote(item, e.target.value)}
                  style={{ marginTop: 10, fontSize: "0.85rem", padding: "9px 12px" }}
                />
              </div>
            );
          })}
        </div>
        <p style={{ textAlign: "center", marginTop: 14, color: allDoneToday ? "var(--green)" : "var(--muted)", fontSize: "0.88rem" }}>
          {allDoneToday ? "✓ Completaste todo hoy — suma a tu racha" : "Te falta marcar algo para que cuente el día"}
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <p className="eyebrow">Tus objetivos SMART</p>
          {!editingGoals && (
            <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: "0.78rem" }} onClick={() => setEditingGoals(true)}>
              Editar
            </button>
          )}
        </div>
        <div className="card" style={{ padding: 18 }}>
          {!editingGoals
            ? objectives.map((o, i) => (
                <p key={o.id} style={{ margin: "6px 0", color: o.text ? "var(--white)" : "var(--muted)" }}>
                  {i + 1}. {o.text || "Sin definir todavía"}
                </p>
              ))
            : (
              <>
                {[0, 1, 2].map((i) => (
                  <input
                    key={i}
                    type="text"
                    placeholder={`Objetivo ${i + 1}`}
                    value={goalDrafts[i] || ""}
                    onChange={(e) =>
                      setGoalDrafts((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
                    }
                    style={{ marginBottom: 10 }}
                  />
                ))}
                <button className="btn-primary" style={{ width: "100%", marginTop: 4 }} onClick={saveGoals}>
                  Guardar objetivos
                </button>
              </>
            )}
        </div>
      </section>

      <section>
        <p className="eyebrow" style={{ marginBottom: 12 }}>Tu historial</p>
        <div className="card" style={{ padding: 18 }}>
          <HistoryGrid logs={history} todayDayNumber={todayLog?.day_number ?? 1} />
          <p style={{ color: "var(--muted)", fontSize: "0.78rem", marginTop: 14 }}>
            🏅 = hito cada 10 días de racha · dorado = día completo · los días pasados no se pueden editar
          </p>
        </div>
      </section>

      {showShare && (
        <div
          onClick={() => setShowShare(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 50,
          }}
        >
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ padding: 24, maxWidth: 440 }}>
            <p className="eyebrow" style={{ marginBottom: 8 }}>Guardá este link</p>
            <h3 className="display" style={{ fontSize: "1.3rem", margin: "0 0 12px" }}>
              Así volvés a tu reto
            </h3>
            <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: 14 }}>
              Este link es tu única forma de entrar a tu progreso. Guardalo o agregalo a favoritos.
            </p>
            <input type="text" readOnly value={recoveryLink} onFocus={(e) => e.target.select()} />
            <button className="btn-primary" style={{ width: "100%", marginTop: 14 }} onClick={() => setShowShare(false)}>
              Listo
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardInner />
    </Suspense>
  );
}
