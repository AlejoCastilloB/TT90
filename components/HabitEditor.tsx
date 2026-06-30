"use client";

import { useState } from "react";
import { NonNegotiable } from "@/lib/types";
import { supabase } from "@/lib/supabase/client";

const PRESET_ICONS = [
  "💪","🏃","🚴","🏋️","🧘","🚶","🥗","🥤","💧","🍎",
  "📖","✍️","🎯","🧠","💡","🎨","🎸","💤","🛁","❤️",
  "🙏","✨","🌅","🌿","💰","📱","🚫","⏰","🔥","⭐",
];

type TrackingType = "days_per_week" | "minutes_per_day" | "custom";

type HabitEditorProps = {
  habits: NonNegotiable[];
  onSave: () => void;
};

export default function HabitEditor({ habits, onSave }: HabitEditorProps) {
  const [localHabits, setLocalHabits] = useState<NonNegotiable[]>(habits);
  const [pickingIconFor, setPickingIconFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateHabit(id: string, changes: Partial<NonNegotiable>) {
    setLocalHabits((prev) => prev.map((h) => (h.id === id ? { ...h, ...changes } : h)));
  }

  async function saveAll() {
    setSaving(true);
    for (const h of localHabits) {
      await supabase.from("non_negotiables").update({
        name: h.name,
        icon: h.icon,
        enabled: h.enabled,
        tracking_type: h.tracking_type,
        tracking_value: h.tracking_value,
        tracking_custom: h.tracking_custom,
      }).eq("id", h.id);
    }
    setSaving(false);
    onSave();
  }

  const trackingLabel = (h: NonNegotiable) => {
    if (h.tracking_type === "days_per_week") return `${h.tracking_value ?? 7} días/sem`;
    if (h.tracking_type === "minutes_per_day") return `${h.tracking_value ?? 30} min/día`;
    return h.tracking_custom || "Personalizado";
  };

  return (
    <div>
      {localHabits.map((h) => (
        <div
          key={h.id}
          className="card"
          style={{ padding: 14, marginBottom: 12, opacity: h.enabled ? 1 : 0.5 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <input
              type="checkbox"
              checked={h.enabled}
              onChange={(e) => updateHabit(h.id, { enabled: e.target.checked })}
              style={{ width: 16, height: 16, flexShrink: 0 }}
            />
            <button
              onClick={() => setPickingIconFor(pickingIconFor === h.id ? null : h.id)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "var(--black-soft)",
                border: "1px solid var(--card-border)",
                fontSize: "1.2rem",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {h.icon}
            </button>
            <input
              type="text"
              value={h.name}
              maxLength={30}
              onChange={(e) => updateHabit(h.id, { name: e.target.value })}
              style={{ fontSize: "0.9rem", padding: "8px 10px", flex: 1 }}
            />
          </div>

          {pickingIconFor === h.id && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10, background: "var(--black-soft)", padding: 10, borderRadius: 10 }}>
              {PRESET_ICONS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => { updateHabit(h.id, { icon }); setPickingIconFor(null); }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: h.icon === icon ? "var(--gold-3)" : "transparent",
                    border: "1px solid var(--card-border)",
                    fontSize: "1.1rem",
                    cursor: "pointer",
                  }}
                >
                  {icon}
                </button>
              ))}
              <button
                onClick={() => { updateHabit(h.id, { icon: "·" }); setPickingIconFor(null); }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: h.icon === "·" ? "var(--gold-3)" : "transparent",
                  border: "1px solid var(--card-border)",
                  fontSize: "1.4rem",
                  cursor: "pointer",
                  color: "var(--white)",
                  lineHeight: 1,
                }}
              >
                ·
              </button>
            </div>
          )}

          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {(["days_per_week", "minutes_per_day", "custom"] as TrackingType[]).map((type) => (
              <button
                key={type}
                onClick={() => updateHabit(h.id, { tracking_type: type })}
                style={{
                  flex: 1,
                  padding: "6px 4px",
                  borderRadius: 8,
                  border: "1px solid var(--card-border)",
                  background: h.tracking_type === type ? "linear-gradient(135deg, var(--gold-1), var(--gold-3))" : "var(--black-soft)",
                  color: h.tracking_type === type ? "#1a1306" : "var(--muted)",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {type === "days_per_week" ? "Días/sem" : type === "minutes_per_day" ? "Min/día" :
