// POST /api/inquiry  (Cloudflare Pages Function)
//
// Handles the "Have a project in mind?" form. Same setup as subscribe.js:
//   SUBMISSIONS     KV namespace binding: stores every inquiry
//   RESEND_API_KEY  secret: emails you each inquiry (hit Reply to answer the client directly)
//   NOTIFY_EMAIL    where those emails go
//   FROM_EMAIL      optional sender (domain must be verified in Resend)
// If neither KV nor email is configured the request fails, so inquiries are never silently lost.

const LIMITS = { name: 120, email: 254, site: 300, budget: 60, project: 5000 };

export async function onRequestPost({ request, env }) {
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  // Honeypot: real people never fill the hidden "company" field
  if (data.company) return json({ ok: true });

  const clean = {};
  for (const [key, max] of Object.entries(LIMITS)) {
    clean[key] = String(data[key] || "").trim().slice(0, max);
  }
  clean.email = clean.email.toLowerCase();

  if (!clean.name) return json({ ok: false, error: "Please add your name." }, 400);
  if (!isEmail(clean.email)) return json({ ok: false, error: "Please enter a valid email address." }, 400);
  if (clean.project.length < 10) return json({ ok: false, error: "Tell us a little more about the project." }, 400);

  const at = new Date().toISOString();
  const record = { ...clean, at, country: request.cf?.country || null };

  let stored = false;
  if (env.SUBMISSIONS) {
    // Timestamp first so a KV list comes back in date order
    const key = `inquiry:${at}:${crypto.randomUUID().slice(0, 8)}`;
    await env.SUBMISSIONS.put(key, JSON.stringify(record));
    stored = true;
  }

  const emailed = await notify(env, {
    subject: `Project inquiry from ${clean.name}`,
    replyTo: clean.email,
    text: [
      `Name: ${clean.name}`,
      `Email: ${clean.email}`,
      `Website: ${clean.site || "none given"}`,
      `Budget: ${clean.budget || "not given"}`,
      "",
      clean.project,
      "",
      `Received ${at}`,
    ].join("\n"),
  });

  if (!stored && !emailed) {
    return json({ ok: false, error: "The form isn't working right now." }, 500);
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
