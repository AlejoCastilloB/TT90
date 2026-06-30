"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const DEFAULT_OBJECTIVES = [
  "Correr 21 kilómetros de forma seguida antes de 2027",
  "Transformar positivamente 1000 vidas con TT90 en menos de 6 meses",
  "Subir un video a YouTube cada semana",
];

const SMART_LETTERS = [
  { letter: "S", word: "Specific", es: "Específico" },
  { letter: "M", word: "Measurable", es: "Medible" },
  { letter: "A", word: "Achievable", es: "Alcanzable" },
  { letter: "R", word: "Relevant", es: "Relevante" },
  { letter: "T", word: "Time-bound", es: "Con fecha límite" },
];

const SAMPLE_HABITS = [
  { icon: "💪", name: "Entrenamiento", done: true },
  { icon: "🥗", name: "Alimentación saludable", done: true },
  { icon: "🚶", name: "Pasos diarios", done: true },
  { icon: "🧘", name: "Meditación / oración", done: false },
  { icon: "✨", name: "Afirmación positiva", done: true },
];

function BackgroundPreview({ blurred }: { blurred: boolean }) {
  return (
    <div
      aria-hidden
      style={{
        filter: blurred ? "blur(6px)" : "none",
        pointerEvents: "none",
        userSelect: "none",
        opacity: blurred ? 0.55 : 1,
        transition: "filter 0.3s ease, opacity 0.3s ease",
        maxWidth: 560,
        margin: "0 auto",
        padding: "32px 18px 100px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <p className="eyebrow">TT90 · Hola Alejo</p>
          <h1 className="display" style={{ fontSize: "1.6rem", margin: "4px 0 0" }}>
            Día 23 de 90
          </h1>
        </div>
      </div>

      <section className="card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span className="eyebrow" style={{ color: "var(--green)" }}>Constante</span>
          <span className="eyebrow">23 / 90 días</span>
        </div>
        <div style={{ height: 14, borderRadius: 999, background: "var(--black-soft)", border: "1px solid var(--card-border)", overflow: "hidden" }}>
          <div style={{ width: "26%", height: "100%", background: "linear-gradient(90deg, var(--blue), var(--green))" }} />
        </div>
      </section>

      <p className="eyebrow" style={{ marginBottom: 12 }}>Hábitos de hoy</p>
      <div className="card" style={{ padding: 6 }}>
        {SAMPLE_HABITS.map((h) => (
          <div key={h.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                background: h.done ? "linear-gradient(135deg, var(--gold-1), var(--gold-3))" : "transparent",
                border: h.done ? "none" : "2px solid var(--card-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {h.done && <span style={{ color: "#1a1306", fontWeight: 900 }}>✓</span>}
            </div>
            <span style={{ fontSize: "1.2rem" }}>{h.icon}</span>
            <span style={{ fontWeight: 600 }}>{h.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [view, setView] = useState<"intro" | "explore" | "form" | "recover">("intro");
  const [name, setName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [email, setEmail] = useState("");
  const [recoverId, setRecoverId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!name.trim()) {
      setError("Cuéntanos cómo te llamas para empezar.");
      return;
    }
    setLoading(true);
    setError("");
    const { data, error: rpcError } = await supabase.rpc("create_profile", {
      p_name: name.trim(),
      p_instagram: instagram.trim(),
      p_email: email.trim(),
      p_newsletter: email.trim().length > 0,
    });
    setLoading(false);
    if (rpcError || !data) {
      setError("Algo falló creando tu reto. Intenta de nuevo.");
      return;
    }
    const id = data as string;
    localStorage.setItem("tt90_profile_id", id);
    if (email.trim()) {
      fetch("/api/send-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), profileId: id, name: name.trim() }),
      }).catch(() => {});
    }
    router.push(`/d?p=${id}`);
  }

  function handleRecover() {
    const trimmed = recoverId.trim();
    if (!trimmed) return;
    localStorage.setItem("tt90_profile_id", trimmed);
    router.push(`/d?p=${trimmed}`);
  }

  const blurred = view === "intro";

  return (
    <div style={{ position: "relative", minHeight: "100dvh" }}>
      <BackgroundPreview blurred={blurred} />

      {view === "explore" && (
        <button
          className="btn-primary"
          style={{ position: "fixed", top: 18, right: 18, fontSize: "0.82rem", padding: "11px 18px", zIndex: 30 }}
          onClick={() => setView("form")}
        >
          Comenzar mi transformación de 90 días
        </button>
      )}

      {view === "explore" && (
        <p
          style={{
            position: "fixed",
            bottom: 18,
            left: "50%",
            transform: "translateX(-50%)",
            color: "var(--muted)",
            fontSize: "0.78rem",
            background: "var(--black-soft)",
            border: "1px solid var(--card-border)",
            borderRadius: 999,
            padding: "8px 16px",
            zIndex: 30,
          }}
        >
          Estás viendo un perfil de ejemplo, solo lectura
        </p>
      )}

      {(view === "intro" || view === "form" || view === "recover") && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 40,
            background: view === "intro" ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.7)",
          }}
        >
          <div
            className="card"
            style={{
              border: "1px solid var(--gold-2)",
              boxShadow: "0 0 0 1px rgba(212,168,74,0.15), 0 20px 60px rgba(0,0,0,0.6)",
              padding: 28,
              maxWidth: 460,
              width: "100%",
              maxHeight: "88dvh",
              overflowY: "auto",
            }}
          >
            {view === "intro" && (
              <div style={{ textAlign: "center" }}>
                <p className="eyebrow">TT90</p>
                <h1 className="display" style={{ fontSize: "2.1rem", lineHeight: 1.08, margin: "12px 0" }}>
                  Transformación <span className="gold-text">total</span> en 90 días
                </h1>
                <p style={{ color: "var(--muted)", fontSize: "0.96rem", margin: "0 0 26px" }}>
                  Un nuevo yo está en camino. Elige tus no negociables, cúmplelos todos los días
                  y observa tu racha crecer.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button className="btn-primary" onClick={() => setView("form")}>
                    Armar mi reto de 90 días →
                  </button>
                  <button className="btn-ghost" onClick={() => setView("recover")}>
                    Ya tengo mi link
                  </button>
                  <button
                    className="btn-ghost"
                    style={{ border: "none", color: "var(--gold-2)" }}
                    onClick={() => setView("explore")}
                  >
                    Solo quiero explorar →
                  </button>
                </div>
              </div>
            )}

            {view === "recover" && (
              <div>
                <button className="btn-ghost" style={{ marginBottom: 20 }} onClick={() => setView("intro")}>
                  ← Volver
                </button>
                <p className="eyebrow">Recuperar tu reto</p>
                <h2 className="display" style={{ fontSize: "1.6rem", margin: "8px 0 16px" }}>
                  Pega tu link o tu código
                </h2>
                <input
                  type="text"
                  placeholder="ej: 489645e9-91cf-4d11-bb37-..."
                  value={recoverId}
                  onChange={(e) => setRecoverId(e.target.value)}
                />
                <button className="btn-primary" style={{ marginTop: 16, width: "100%" }} onClick={handleRecover}>
                  Entrar a mi reto
                </button>
              </div>
            )}

            {view === "form" && (
              <div>
                <button className="btn-ghost" style={{ marginBottom: 20 }} onClick={() => setView("intro")}>
                  ← Volver
                </button>
                <p className="eyebrow">Nuevo reto</p>
                <h2 className="display" style={{ fontSize: "1.6rem", margin: "8px 0 6px" }}>
                  Arma tu reto de 90 días
                </h2>
                <p style={{ color: "var(--muted)", margin: "0 0 22px", fontSize: "0.9rem" }}>
                  Empiezas hoy mismo. Todo esto lo puedes editar después.
                </p>

                <label className="eyebrow">Tu nombre</label>
                <input
                  type="text"
                  placeholder="Ej: Martina"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ marginTop: 8, marginBottom: 18 }}
                />

                <label className="eyebrow">Tu Instagram (opcional)</label>
                <input
                  type="text"
                  placeholder="@tuusuario"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  style={{ marginTop: 8, marginBottom: 18 }}
                />

                <div className="card" style={{ padding: 16, marginBottom: 22 }}>
                  <p className="eyebrow" style={{ marginBottom: 8 }}>
                    Tus no negociables por defecto (los editas cuando quieras)
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 18, color: "var(--white)", lineHeight: 1.85, fontSize: "0.92rem" }}>
                    <li>💪 Entrenamiento</li>
                    <li>🥗 Alimentación saludable</li>
                    <li>🚶 Pasos diarios</li>
                    <li>🧘 Meditación / oración</li>
                    <li>✨ Afirmación positiva</li>
                  </ul>
                </div>

                <div className="card" style={{ padding: 16, marginBottom: 22 }}>
                  <p className="eyebrow" style={{ marginBottom: 10 }}>Objetivos SMART</p>
                  <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                    {SMART_LETTERS.map((s) => (
                      <div key={s.letter} style={{ textAlign: "center", flex: 1 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            margin: "0 auto 4px",
                            borderRadius: 8,
                            background: "linear-gradient(135deg, var(--gold-1), var(--gold-3))",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#1a1306",
                            fontWeight: 900,
                            fontSize: "0.95rem",
                          }}
                        >
                          {s.letter}
                        </div>
                        <p style={{ fontSize: "0.62rem", color: "var(--muted)", margin: 0, lineHeight: 1.2 }}>{s.es}</p>
                      </div>
                    ))}
                  </div>
                  <p style={{ color: "var(--muted)", fontSize: "0.82rem", margin: "0 0 10px" }}>
                    Estos son los objetivos de ejemplo de Alejo, el creador de TT90 — puedes verlos como
                    inspiración. Vas a poder escribir los tuyos apenas entres a tu panel.
                  </p>
                  {DEFAULT_OBJECTIVES.map((o) => (
                    <p key={o} style={{ margin: "4px 0", color: "var(--gold-1)", fontSize: "0.86rem" }}>
                      · {o}
                    </p>
                  ))}
                </div>

                <label className="eyebrow">Tu correo (opcional)</label>
                <p style={{ color: "var(--muted)", fontSize: "0.82rem", margin: "6px 0 8px" }}>
                  Lo pedimos solo para enviarte tu link único de recuperación, así puedes entrar a tu
                  reto desde cualquier dispositivo sin perder tu progreso. Si lo dejas, también te
                  sumamos a la newsletter de TT90.
                </p>
                <input
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ marginBottom: 20 }}
                />

                {error && <p style={{ color: "#d97676", marginBottom: 14, fontSize: "0.86rem" }}>{error}</p>}

                <button className="btn-primary" style={{ width: "100%" }} disabled={loading} onClick={handleCreate}>
                  {loading ? "Creando..." : "Arrancar los 90 días →"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
