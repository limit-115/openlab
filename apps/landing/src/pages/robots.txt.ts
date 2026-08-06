import type { APIRoute } from "astro";

/**
 * Written from `site` rather than kept as a hand-edited file under `public/`, so the host a crawler
 * is sent to cannot drift from the host every canonical URL already states. Nothing here is hidden:
 * the site is one public page and three installer scripts, and a crawler is welcome to all of it.
 */
export const GET: APIRoute = ({ site }) =>
    new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL("sitemap-index.xml", site)}\n`, {
        headers: { "content-type": "text/plain; charset=utf-8" }
    });
