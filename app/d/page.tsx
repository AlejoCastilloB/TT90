"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Profile, Objective, NonNegotiable, DailyLog, DailyLogItem } from "@/lib/types";
import ProgressBar from "@/components/ProgressBar";

function DashboardInner() {
  const params = useSearchParams();
  const router = useRouter();
  const profileId = params.get("p") || (typeof window !== "undefined" ? localStorage.getItem("tt90_profile_id") : null);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nns, setNns] = useState<NonNegotiable[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [history, setHistory] = useState<DailyLog[]>([]);
  const [editingGoals, setEditingGoals] = useState(false);
  const [goalDrafts, setGoalDrafts] = useState<string[]>(["", "", ""]);
  const [showShare, setShowShare] = useState(false);

  const [openDay, setOpenDay] = useState<number | null>(null);
  const [openDayLog, setOpenDayLog] = useState<DailyLog | null>(null);
  const [openDayItems, setOpenDayItems] = useState<DailyLogItem[]>([]);
  const [journalDraft, setJournalDraft] = useState("");
  const [editingHabits, setEditingHabits] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");

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
      .order("sort_order");
    setNns(nnData || []);

    const { data: objData } = await supabase.from("objectives").select("*").eq("profile_id", pid).order("slot");
    setObjectives(objData || []);
    setGoalDrafts((objData || []).map((o) => o.text) ?? ["", "", ""]);

    const { data: todayRows } = await supabase.rpc("get_or_create_today_log", { p_profile_id: pid });
    const today = todayRows && todayRows[0];

    let todayLogRow: DailyLog | null = null;
    if (today) {
      const { data: logRow } = await supabase.from("daily_logs").select("*").eq("id", today.log_id).single();
      todayLogRow = logRow;
      setTodayLog(logRow);
    }

    const { data: hist } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("profile_id", pid)
      .order("day_number");
    setHistory(hist || []);

    setLoading(false);
    return todayLogRow;
  }

  async function openDayModal(dayNumber: number) {
    if (!profile) return;
    const log = history.find((l) => l.day_number === dayNumber) || (todayLog?.day_number === dayNumber ? todayLog : null);
    if (!log) return;
    setOpenDay(dayNumber);
    setOpenDayLog(log);
    setJournalDraft(log.journal || "");
    setEditingHabits(false);
    const { data: items } = await supabase.from("daily_log_items").select("*").eq("daily_log_id", log.id);
    setOpenDayItems(items || []);
  }

  function closeDayModal() {
    setOpenDay(null);
    setOpenDayLog(null);
    setOpenDayItems([]);
    setEditingHabits(false);
  }

  const isEditable = openDayLog && todayLog && openDayLog.id === todayLog.id;

  async function toggleItem(item: DailyLogItem) {
    if (!isEditable) return;
    const newDone = !item.done;
    setOpenDayItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: newDone } : i)));
    await supabase.rpc("toggle_log_item", { p_log_item_id: item.id, p_done: newDone, p_note: null });
    if (profileId) {
      const updatedToday = await loadAll(profileId);
      if (updatedToday) setOpenDayLog(updatedToday);
    }
  }

  async function saveJournal() {
    if (!openDayLog || !isEditable) return;
    await supabase.from("daily_logs").update({ journal: journalDraft }).eq("id", openDayLog.id);
    if (profileId) await loadAll(profileId);
  }

  async function addHabit() {
    if (!profile || !newHabitName.trim()) return;
    const { data: created } = await supabase
      .from("non_negotiables")
      .insert({ profile_id: profile.id, name: newHabitName.trim(), icon: "•", sort_order: nns.length + 1 })
      .select()
      .single();
    setNewHabitName("");
    if (created && openDayLog && isEditable) {
      const { data: newItem } = await supabase
        .from("daily_log_items")
        .insert({ daily_log_id: openDayLog.id, non_negotiable_id: created.id })
        .select()
        .single();
      if (newItem) setOpenDayItems((prev) => [...prev, newItem]);
    }
    if (profileId) await loadAll(profileId);
  }

  async function renameHabit(id: string, name: string) {
    setNns((prev) => prev.map((n) => (n.id === id ? { ...n, name } : n)));
    await supabase.from("non_negotiables").update({ name }).eq("id", id);
  }

  async function toggleHabitEnabled(id: string, enabled: boolean) {
    setNns((prev) => prev.map((n) => (n.id === id ? { ...n, enabled } : n)));
    await supabase.from("non_negotiables").update({ enabled }).eq("id", id);
  }

  async function saveGoals() {
    for (let i = 0; i < 3; i++) {
      const obj = objectives[i];
      if (obj) await supabase.from("objectives").update({ text: goalDrafts[i] }).eq("id", obj.id);
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

  const byDay = new Map<number, DailyLog>();
  history.forEach((l) => byDay.set(l.day_number, l));
  const todayDayNumber = todayLog?.day_number ?? 1;
  const recoveryLink = typeof window !== "undefined" ? `${window.location.origin}/d?p=${profile.id}` : "";
  const activeHabits = nns.filter((n) => n.enabled);

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "32px 18px 100px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, gap: 10 }}>
        <div>
          <p className="eyebrow">TT90 · Hola {profile.name}</p>
          <h1 className="display" style={{ fontSize: "1.6rem", margin: "4px 0 0" }}>
            Día {todayDayNumber} de 90
          </h1>
        </div>
        <button className="btn-ghost" style={{ padding: "8px 14px", fontSize: "0.8rem", whiteSpace: "nowrap" }} onClick={() => setShowShare(true)}>
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
        <p className="eyebrow" style={{ marginBottom: 12 }}>Tu camino · toca el día de hoy para registrar</p>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 6 }}>
            {Array.from({ length: 90 }, (_, idx) => idx + 1).map((day) => {
              const log = byDay.get(day) || (day === todayDayNumber ? todayLog : null);
              const isToday = day === todayDayNumber;
              const isFuture = day > todayDayNumber;
              const isMilestone = day % 10 === 0;
              let bg = "var(--black-soft)";
              let textColor = "var(--muted)";
              if (log?.completed_all) {
                bg = "linear-gradient(135deg, var(--gold-1), var(--gold-3))";
                textColor = "#1a1306";
              } else if (log && !log.completed_all && log.closed) {
                bg = "rgba(217, 118, 118, 0.18)";
                textColor = "#d97676";
              }
              return (
                <button
                  key={day}
                  disabled={isFuture}
                  onClick={() => openDayModal(day)}
                  style={{
                    aspectRatio: "1",
                    borderRadius: 8,
                    background: bg,
                    border: isToday ? "2px solid var(--gold-1)" : "1px solid var(--card-border)",
                    color: textColor,
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    cursor: isFuture ? "default" : "pointer",
                    opacity: isFuture ? 0.35 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    padding: 0,
                  }}
                >
                  {isMilestone ? "🏅" : day}
                </button>
              );
            })}
          </div>
          <p style={{ color: "var(--muted)", fontSize: "0.76rem", marginTop: 14 }}>
            🏅 hito cada 10 días · dorado = día completo · los días anteriores quedan solo de lectura
          </p>
        </div>
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
                    onChange={(e) => setGoalDrafts((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
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

      {showShare && (
        <div
          onClick={() => setShowShare(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}
        >
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ padding: 24, maxWidth: 440 }}>
            <p className="eyebrow" style={{ marginBottom: 8 }}>Guarda este link</p>
            <h3 className="display" style={{ fontSize: "1.3rem", margin: "0 0 12px" }}>Así vuelves a tu reto</h3>
            <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: 14 }}>
              Este link es tu única forma de entrar a tu progreso. Guárdalo o agrégalo a tu pantalla de inicio
              para tenerlo a un toque de distancia.
            </p>
            <input type="text" readOnly value={recoveryLink} onFocus={(e) => e.target.select()} />
            <button className="btn-primary" style={{ width: "100%", marginTop: 14 }} onClick={() => setShowShare(false)}>
              Listo
            </button>
          </div>
        </div>
      )}

      {openDay !== null && openDayLog && (
        <div
          onClick={closeDayModal}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 60 }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ border: "1px solid var(--gold-2)", padding: 22, maxWidth: 460, width: "100%", maxHeight: "88dvh", overflowY: "auto" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
              <div>
                <p className="eyebrow">Día {openDay} de 90</p>
                <h2 className="display" style={{ fontSize: "1.4rem", margin: "4px 0 0" }}>
                  {isEditable ? "Hoy" : "Registro pasado"}
                </h2>
              </div>
              <button className="btn-ghost" style={{ padding: "6px 10px", fontSize: "0.85rem" }} onClick={closeDayModal}>
                ✕
              </button>
            </div>

            {!isEditable && (
              <p style={{ color: "var(--muted)", fontSize: "0.8rem", margin: "10px 0 4px" }}>
                Este día ya pasó, solo puedes verlo.
              </p>
            )}

            <div style={{ margin: "16px 0" }}>
              {openDayItems.map((item) => {
                const nn = nns.find((n) => n.id === item.non_negotiable_id);
                if (!nn) return null;
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 6px",
                      borderBottom: "1px solid var(--card-border)",
                      cursor: isEditable ? "pointer" : "default",
                      opacity: isEditable ? 1 : 0.85,
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 8,
                        background: item.done ? "linear-gradient(135deg, var(--gold-1), var(--gold-3))" : "transparent",
                        border: item.done ? "none" : "2px solid var(--card-border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {item.done && <span style={{ color: "#1a1306", fontWeight: 900 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: "1.15rem" }}>{nn.icon}</span>
                    <span style={{ fontWeight: 600 }}>{nn.name}</span>
                  </div>
                );
              })}
            </div>

            <label className="eyebrow">{isEditable ? "¿Qué pasó hoy?" : "Notas de ese día"}</label>
            <textarea
              placeholder="Lo bueno, lo difícil, lo que aprendiste..."
              value={journalDraft}
              onChange={(e) => setJournalDraft(e.target.value)}
              onBlur={isEditable ? saveJournal : undefined}
              readOnly={!isEditable}
              rows={5}
              style={{ marginTop: 8, resize: "vertical", fontFamily: "inherit" }}
            />

            {isEditable && (
              <>
                <button
                  className="btn-ghost"
                  style={{ marginTop: 16, width: "100%", fontSize: "0.84rem" }}
                  onClick={() => setEditingHabits((v) => !v)}
                >
                  {editingHabits ? "Ocultar edición de hábitos" : "Editar mis hábitos"}
                </button>

                {editingHabits && (
                  <div style={{ marginTop: 14 }}>
                    {nns.map((nn) => (
                      <div key={nn.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <input
                          type="checkbox"
                          checked={nn.enabled}
                          onChange={(e) => toggleHabitEnabled(nn.id, e.target.checked)}
                          style={{ width: 16, height: 16, flexShrink: 0 }}
                        />
                        <input
                          type="text"
                          defaultValue={nn.name}
                          onBlur={(e) => renameHabit(nn.id, e.target.value)}
                          style={{ fontSize: "0.85rem", padding: "8px 10px" }}
                        />
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <input
                        type="text"
                        placeholder="Nuevo hábito..."
                        value={newHabitName}
                        onChange={(e) => setNewHabitName(e.target.value)}
                        style={{ fontSize: "0.85rem" }}
                      />
                      <button className="btn-ghost" style={{ padding: "10px 16px", fontSize: "0.8rem" }} onClick={addHabit}>
                        Agregar
                      </button>
                    </div>
                  </div>
                )}

                <button className="btn-primary" style={{ width: "100%", marginTop: 18 }} onClick={closeDayModal}>
                  Guardar día
                </button>
              </>
            )}
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
