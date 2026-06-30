import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email, profileId, name } = await req.json();
    if (!email || !profileId) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      // Si todavía no configuraste Resend, no rompemos el flujo de la app.
      return NextResponse.json({ skipped: true });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tt90.vercel.app";
    const link = `${siteUrl}/d?p=${profileId}`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "TT90 <onboarding@resend.dev>",
        to: email,
        subject: "Tu link único de TT90 — guardalo bien 🔑",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background:#0a0908; color:#f6f2e8;">
            <p style="color:#d4a84a; letter-spacing:2px; font-size:12px; text-transform:uppercase;">TT90</p>
            <h1 style="font-size:22px;">Hola ${name || ""}, este es tu link 🔑</h1>
            <p>Guardalo: es la única forma de volver a tu reto de 90 días desde cualquier dispositivo.</p>
            <p style="margin: 24px 0;">
              <a href="${link}" style="background:linear-gradient(135deg,#f4d989,#8a6a26); color:#1a1306; padding:14px 24px; border-radius:999px; text-decoration:none; font-weight:bold;">
                Entrar a mi reto
              </a>
            </p>
            <p style="color:#8c8576; font-size:13px;">O copiá este link: ${link}</p>
            <p style="margin-top:32px;">Un nuevo yo está en camino. Éxitos en estos 90 días.</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
