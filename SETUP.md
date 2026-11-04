# Stellar Drift site: setup

Everything in `public/` is published as-is. `src/worker.js` handles the two form endpoints in
`src/api/`. Nothing outside `public/` is served, so this file, the source, and `.git` stay off the site.

The forms need at least one place to send submissions, or they return an error (so nothing gets
silently lost).

## 1. Store submissions (KV)

1. Cloudflare dashboard > Storage & Databases > KV > Create namespace, e.g. `stellardrift-submissions`
2. In `wrangler.jsonc`, uncomment `kv_namespaces` and paste in the namespace id.
3. Push to redeploy. Add the binding here, not in the dashboard: each deploy replaces bindings
   with what's in `wrangler.jsonc`.

Entries show up in the KV namespace as `subscriber:<email>` and `inquiry:<timestamp>:<id>`.

## 2. Get emailed (optional, recommended for inquiries)

1. Sign up at resend.com and create an API key.
2. Workers & Pages > stellar-drift-landing > Settings > Variables and Secrets:
   - `RESEND_API_KEY` (type: Secret) = your key
3. `NOTIFY_EMAIL` is already set in `wrangler.jsonc`.
4. Redeploy.

Inquiry emails set Reply-To to the client, so hitting Reply goes straight to them.

Until you verify a domain in Resend, emails come from onboarding@resend.dev and can only go
to the address you signed up to Resend with. To send from your own domain, verify
stellardrift.studio in Resend and add:
   - `FROM_EMAIL` = `Stellar Drift <site@stellardrift.studio>`

## Share image

`public/media/og-image.png` (1200x630) is what shows when the link gets pasted into Instagram, iMessage,
Discord, etc. Swap in your own any time, same size and filename. To refresh a cached preview,
paste the URL into Facebook's Sharing Debugger.

## Page structure

- `/` home: intro, a door to each section, what's in progress
- `/games/` StarDancer, newsletter signup
- `/music/` drumming, Tao of Drumming, soundscapes. Hidden for now (see below).
- `/work/` client services, inquiry form
- `/about/` public bio. Keep the day job off this page.
- `/resume/` for recruiters and employers. Not linked from the site, marked noindex (meta tag +
  `_headers`), and left out of sitemap.xml. Share the URL directly. It's unlisted, not private:
  this repo is public, so anyone looking through it can find the page.

Shared styles and scripts live in `public/assets/site.css` and `public/assets/site.js`.
After deploying, submit https://stellardrift.studio/sitemap.xml in Google Search Console.

## Showing or hiding the music section

In `wrangler.jsonc`, set `SHOW_MUSIC` to `true` or `false`, then push to redeploy.

When it's `false`, `/music/` returns a 404 and the Worker removes music from everything else before
it's sent: nav and footer links, the home page door and card, the sitemap entry, and some of the
wording on the home and about pages. Any other link to `/music/`, like one in a paragraph, becomes
plain text automatically. The page's files stay in `public/music/`, and this repo is public, so hidden
means off the site, not secret.

To add content that depends on the flag, use one of these attributes:

- `data-if-music`: only served when music is on
- `data-unless-music`: only served when music is off

Remember to check `public/media/og-image.png` too. Its text mentions music, and the Worker can't change that.

## Swapping in real media

Placeholders are white boxes with a label saying what goes there:

    <div class="media ratio-16x9 ph">StarDancer trailer or gameplay</div>

Replace with an image or video, keeping the `media` and ratio classes and dropping `ph`:

    <img class="media ratio-16x9" src="/media/stardancer.jpg" alt="...">

For YouTube, use `<iframe class="media ratio-16x9" src="https://www.youtube-nocookie.com/embed/VIDEO_ID" title="..." allowfullscreen></iframe>`.

Search the pages for `class="media` to find every placeholder, and `<!--` for links waiting on a URL.

## Page skies and colors

Set on `<body>`:

- `data-sky`: `drift` (default), `warp` (flying through stars), `pulse` (stars beat to a tempo), `still` (sparse and calm)
- `data-section`: `games` or `music` changes the accent color

## Updating styles or scripts

`/assets/*` is cached for an hour, so when you change `site.css` or `site.js` in a way the pages
depend on, bump the `?v=` number where the pages load them.
