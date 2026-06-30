"use client";

import { DailyLog } from "@/lib/types";

export default function HistoryGrid({ logs, todayDayNumber }: { logs: DailyLog[]; todayDayNumber: number }) {
  const byDay = new Map<number, DailyLog>();
  logs.forEach((l) => byDay.set(l.day_number, l));

  const cells = [];
  for (let day = 1; day <= todayDayNumber; day++) {
    const log = byDay.get(day);
    const isMilestone = day % 10 === 0;
    const isToday = day === todayDayNumber;
    let bg = "var(--black-soft)";
    let border = "1px solid var(--card-border)";
    if (log?.completed_all) {
      bg = "linear-gradient(135deg, var(--gold-1), var(--gold-3))";
    } else if (log && !log.completed_all && log.closed) {
      bg = "rgba(217, 118, 118, 0.18)";
      border = "1px solid rgba(217,118,118,0.4)";
    }
    cells.push(
      <div
        key={day}
        title={`Día ${day}`}
        style={{
          width: 26,
          height: 26,
          borderRadius: 7,
          background: bg,
          border: isToday ? "2px solid var(--gold-1)" : border,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.6rem",
          color: log?.completed_all ? "#1a1306" : "var(--muted)",
          fontWeight: 700,
        }}
      >
        {isMilestone ? "🏅" : ""}
      </div>
    );
  }

  return <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{cells}</div>;
}
