# Stellar Drift site: form setup

The newsletter and project forms post to two Cloudflare Pages Functions in `functions/api/`.
Cloudflare picks the `functions/` folder up automatically on deploy. They need at least one
place to send submissions, or they return an error (so nothing gets silently lost).

## 1. Store submissions (KV)

1. Cloudflare dashboard > Storage & Databases > KV > Create namespace, e.g. `stellardrift-submissions`
2. Your Pages project > Settings > Bindings > Add > KV namespace
   - Variable name: `SUBMISSIONS`
   - Namespace: the one you just made
3. Redeploy.

Entries show up in the KV namespace as `subscriber:<email>` and `inquiry:<timestamp>:<id>`.

## 2. Get emailed (optional, recommended for inquiries)

1. Sign up at resend.com and create an API key.
2. Pages project > Settings > Variables and Secrets:
   - `RESEND_API_KEY` (type: Secret) = your key
   - `NOTIFY_EMAIL` = stellar_drift_studio@pm.me
3. Redeploy.

Inquiry emails set Reply-To to the client, so hitting Reply goes straight to them.

Until you verify a domain in Resend, emails come from onboarding@resend.dev and can only go
to the address you signed up to Resend with. To send from your own domain, verify
stellardrift.studio in Resend and add:
   - `FROM_EMAIL` = `Stellar Drift <site@stellardrift.studio>`

## Share image

`media/og-image.png` (1200x630) is what shows when the link gets pasted into Instagram, iMessage,
Discord, etc. Swap in your own any time, same size and filename. To refresh a cached preview,
paste the URL into Facebook's Sharing Debugger.

## Page structure

- `/` home hub (index.html)
- `/work/` client services, inquiry form
- `/games/` StarDancer, newsletter signup
- `/about/` resume page for employers. Not in the nav, marked noindex (meta tag + `_headers`),
  and left out of sitemap.xml. Share the URL directly.

Shared styles and scripts live in `assets/site.css` and `assets/site.js`.
After deploying, submit https://stellardrift.studio/sitemap.xml in Google Search Console.
