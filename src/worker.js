// Routes the form endpoints and applies the SHOW_MUSIC flag. Everything else comes from public/.
import { onRequestPost as inquiry } from "./api/inquiry.js";
import { onRequestPost as subscribe } from "./api/subscribe.js";

const ROUTES = { "/api/inquiry": inquiry, "/api/subscribe": subscribe };

const remove = { element: (el) => el.remove() };

// data-if-music: only served when music is on. data-unless-music: only when it's off.
function applyMusicFlag(response, showMusic) {
  const [hide, keep] = showMusic ? ["data-unless-music", "data-if-music"] : ["data-if-music", "data-unless-music"];
  const rewriter = new HTMLRewriter()
    .on(`[${hide}]`, remove)
    .on(`[${keep}]`, { element: (el) => el.removeAttribute(keep) });
  // Any other link to the hidden page, like one in running text, becomes plain text.
  if (!showMusic) rewriter.on('a[href^="/music"]', { element: (el) => el.removeAndKeepContent() });
  return rewriter.transform(response);
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const handler = ROUTES[pathname];
    if (handler) {
      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
      }
      return handler({ request, env });
    }

    const showMusic = String(env.SHOW_MUSIC) === "true";
    if (!showMusic && (pathname === "/music" || pathname.startsWith("/music/"))) {
      return new Response("Not found", { status: 404 });
    }

    // Flipping the flag changes a page without changing its file, so a browser's
    // "has this changed?" check would get a 304 and keep showing the old version.
    const headers = new Headers(request.headers);
    headers.delete("If-None-Match");
    headers.delete("If-Modified-Since");
    const asset = await env.ASSETS.fetch(new Request(request, { headers }));

    if (pathname === "/sitemap.xml" && !showMusic) {
      const xml = (await asset.text()).replace(/[ \t]*<url><loc>[^<]*\/music\/<\/loc>.*<\/url>\r?\n/, "");
      const response = new Response(xml, asset);
      response.headers.delete("Content-Length");
      response.headers.delete("ETag");
      return response;
    }
    if (!(asset.headers.get("Content-Type") || "").includes("text/html")) return asset;

    const response = new Response(asset.body, asset);
    response.headers.delete("ETag");
    return applyMusicFlag(response, showMusic);
  },
};
