"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const DEFAULT_OBJECTIVES = [
  "Correr 21 kilómetros de forma seguida antes de 2027",
  "Transformar positivamente 1000 vidas con TT90 en menos de 6 meses",
  "Subir un video a YouTube cada semana",
];

export default function HomePage() {
  const router = useRouter();
  const [step, setStep] = useState<"intro" | "form" | "recover">("intro");
  const [name, setName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [email, setEmail] = useState("");
  const [wantsEmail, setWantsEmail] = useState(false);
  const [recoverId, setRecoverId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!name.trim()) {
      setError("Decinos cómo te llamás para arrancar.");
      return;
    }
    setLoading(true);
    setError("");
    const { data, error: rpcError } = await supabase.rpc("create_profile", {
      p_name: name.trim(),
      p_instagram: instagram.trim(),
      p_email: email.trim(),
      p_newsletter: wantsEmail && email.trim().length > 0,
    });
    setLoading(false);
    if (rpcError || !data) {
      setError("Algo falló creando tu reto. Probá de nuevo.");
      return;
    }
    const id = data as string;
    localStorage.setItem("tt90_profile_id", id);
    if (wantsEmail && email.trim()) {
      // Llamamos a nuestro endpoint que envía el link vía Resend
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

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "48px 20px 80px" }}>
      {step === "intro" && (
        <section style={{ textAlign: "center", paddingTop: 40 }}>
          <p className="eyebrow">TT90</p>
          <h1 className="display" style={{ fontSize: "3rem", lineHeight: 1.05, margin: "14px 0" }}>
            Transformación <span className="gold-text">total</span> en 90 días
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "1.05rem", margin: "0 0 36px" }}>
            Un nuevo yo está en camino. Elegí tus no negociables, cumplilos todos los días,
            y mirá tu racha crecer.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn-primary" onClick={() => setStep("form")}>
              Armar mi reto de 90 días →
            </button>
            <button className="btn-ghost" onClick={() => setStep("recover")}>
              Ya tengo mi link
            </button>
          </div>

          <div className="card" style={{ marginTop: 56, padding: 24, textAlign: "left" }}>
            <p className="eyebrow" style={{ marginBottom: 10 }}>Cómo funciona</p>
            <ol style={{ margin: 0, paddingLeft: 18, color: "var(--muted)", lineHeight: 1.8 }}>
              <li>Elegís tus no negociables diarios (entrenamiento, alimentación, pasos, meditación, afirmación — todo editable).</li>
              <li>Cada día marcás lo que cumpliste. Si completás todo, suma a tu racha.</li>
              <li>Si un día falla, la racha se reinicia — pero tu historial nunca se borra.</li>
              <li>Cada 10 días de racha activa desbloqueás un hito 🏅.</li>
            </ol>
          </div>
        </section>
      )}

      {step === "recover" && (
        <section style={{ paddingTop: 20 }}>
          <button className="btn-ghost" style={{ marginBottom: 24 }} onClick={() => setStep("intro")}>
            ← Volver
          </button>
          <p className="eyebrow">Recuperar tu reto</p>
          <h2 className="display" style={{ fontSize: "1.8rem", margin: "8px 0 18px" }}>
            Pegá tu link o tu código
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
        </section>
      )}

      {step === "form" && (
        <section style={{ paddingTop: 20 }}>
          <button className="btn-ghost" style={{ marginBottom: 24 }} onClick={() => setStep("intro")}>
            ← Volver
          </button>
          <p className="eyebrow">Nuevo reto</p>
          <h2 className="display" style={{ fontSize: "1.9rem", margin: "8px 0 6px" }}>
            Armá tu reto de 90 días
          </h2>
          <p style={{ color: "var(--muted)", margin: "0 0 28px" }}>
            Empezás hoy mismo. Todo lo de acá abajo lo podés editar después.
          </p>

          <label className="eyebrow">Tu nombre</label>
          <input
            type="text"
            placeholder="Ej: Martina"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ marginTop: 8, marginBottom: 20 }}
          />

          <label className="eyebrow">Tu Instagram (opcional)</label>
          <input
            type="text"
            placeholder="@tuusuario"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            style={{ marginTop: 8, marginBottom: 20 }}
          />

          <div className="card" style={{ padding: 18, marginBottom: 28 }}>
            <p className="eyebrow" style={{ marginBottom: 8 }}>
              Tus no negociables por defecto (los editás cuando quieras)
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, color: "var(--white)", lineHeight: 1.9 }}>
              <li>💪 Entrenamiento</li>
              <li>🥗 Alimentación saludable</li>
              <li>🚶 Pasos diarios</li>
              <li>🧘 Meditación / oración</li>
              <li>✨ Afirmación positiva</li>
            </ul>
          </div>

          <div className="card" style={{ padding: 18, marginBottom: 28 }}>
            <p className="eyebrow" style={{ marginBottom: 8 }}>Inspiración: objetivos SMART</p>
            <p style={{ color: "var(--muted)", fontSize: "0.88rem", margin: "0 0 10px" }}>
              <b>Specific</b> (específico) · <b>Measurable</b> (medible) · <b>Achievable</b> (posible) ·{" "}
              <b>Relevant</b> (importante) · <b>Time-bound</b> (con fecha límite). Ejemplos:
            </p>
            {DEFAULT_OBJECTIVES.map((o) => (
              <p key={o} style={{ margin: "4px 0", color: "var(--gold-1)", fontSize: "0.92rem" }}>
                · {o}
              </p>
            ))}
            <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: 10 }}>
              Vas a poder escribir los tuyos apenas entres a tu panel.
            </p>
          </div>

          <label className="eyebrow">Tu correo (opcional)</label>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: "6px 0 8px" }}>
            Te lo pedimos solo para mandarte tu link único de recuperación — así podés
            entrar a tu reto desde cualquier dispositivo sin perder tu progreso.
          </p>
          <input
            type="email"
            placeholder="tu@mail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ marginBottom: 14 }}
          />
          <label style={{ display: "flex", gap: 10, alignItems: "center", color: "var(--muted)", fontSize: "0.9rem", marginBottom: 28 }}>
            <input
              type="checkbox"
              checked={wantsEmail}
              onChange={(e) => setWantsEmail(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            Sumarme también a la newsletter de TT90
          </label>

          {error && <p style={{ color: "#d97676", marginBottom: 16 }}>{error}</p>}

          <button className="btn-primary" style={{ width: "100%" }} disabled={loading} onClick={handleCreate}>
            {loading ? "Creando..." : "Arrancar los 90 días →"}
          </button>
        </section>
      )}
    </main>
  );
}
