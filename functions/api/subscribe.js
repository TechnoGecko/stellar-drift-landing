// POST /api/subscribe  (Cloudflare Pages Function)
//
// Saves a newsletter signup. Uses whichever of these you've set up in the Pages project:
//   SUBMISSIONS     KV namespace binding: stores every signup (recommended)
//   RESEND_API_KEY  secret: also emails you about each signup
//   NOTIFY_EMAIL    where those emails go
//   FROM_EMAIL      optional sender, e.g. "Stellar Drift <site@stellardrift.studio>" (domain must be verified in Resend)
// If neither KV nor email is configured the request fails, so signups are never silently lost.

export async function onRequestPost({ request, env }) {
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  // Honeypot: real people never fill the hidden "company" field
  if (data.company) return json({ ok: true });

  const email = String(data.email || "").trim().toLowerCase();
  if (!isEmail(email)) {
    return json({ ok: false, error: "Please enter a valid email address." }, 400);
  }

  const record = {
    email,
    at: new Date().toISOString(),
    country: request.cf?.country || null,
  };

  let stored = false;
  if (env.SUBMISSIONS) {
    // Keyed by email, so signing up twice doesn't create duplicates
    await env.SUBMISSIONS.put(`subscriber:${email}`, JSON.stringify(record));
    stored = true;
  }

  const emailed = await notify(env, {
    subject: `New subscriber: ${email}`,
    text: `${email} joined the Stellar Drift list.\n\n${record.at}`,
  });

  if (!stored && !emailed) {
    return json({ ok: false, error: "Signups aren't working right now." }, 500);
  }
  return json({ ok: true });
}

// ---------- helpers ----------

function isEmail(v) {
  return v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function notify(env, { subject, text, replyTo }) {
  if (!env.RESEND_API_KEY || !env.NOTIFY_EMAIL) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.FROM_EMAIL || "Stellar Drift <onboarding@resend.dev>",
        to: [env.NOTIFY_EMAIL],
        subject,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
