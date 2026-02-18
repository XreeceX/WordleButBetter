import { NextResponse } from "next/server";
import { Resend } from "resend";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Daily challenge resets at midnight UTC. This runs at 19:00 UTC (5h before). */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const emailsRaw = process.env.REMINDER_EMAILS;
  const fromEmail = process.env.REMINDER_FROM_EMAIL ?? "Wordle But Better <onboarding@resend.dev>";

  if (!apiKey || !emailsRaw?.trim()) {
    return NextResponse.json(
      { error: "RESEND_API_KEY or REMINDER_EMAILS not configured" },
      { status: 500 }
    );
  }

  const toList = emailsRaw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (toList.length === 0) {
    return NextResponse.json({ sent: 0, error: "No reminder emails configured" });
  }

  const appUrl = process.env.NEXTAUTH_URL ?? "https://your-app.vercel.app";
  const dailyUrl = `${appUrl.replace(/\/$/, "")}/daily`;

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: toList,
    subject: "Daily challenge ends in 5 hours — Wordle But Better",
    html: `
      <p>Hi,</p>
      <p>Just a reminder: today's Daily Challenge ends in <strong>5 hours</strong> (midnight UTC).</p>
      <p><a href="${dailyUrl}" style="color:#a78bfa;font-weight:600;">Play the daily challenge →</a></p>
      <p>— Wordle But Better</p>
    `,
  });

  if (error) {
    console.error("Daily reminder send error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }

  return NextResponse.json({ sent: toList.length, id: data?.id });
}
