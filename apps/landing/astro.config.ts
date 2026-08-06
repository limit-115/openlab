import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

/**
 * The site is prerendered to static HTML, which is Astro's default and the reason it was chosen:
 * there is no server to boot, nothing to keep warm, and nothing to operate. Turning any page into
 * a rendered-on-request one is a deliberate act, not a default to drift into.
 *
 * `site` is the host this site is reached at, and three separate things are derived from it rather
 * than written down twice: the canonical URL, the sitemap, and `robots.txt`. It has to stay the
 * host the install commands name, because `public/install.sh` and its two siblings are served from
 * here — a reader who pastes the command is fetching a file out of this build.
 */
export default defineConfig({
    site: "https://openlab.bot",
    integrations: [sitemap()],
    server: {
        host: "127.0.0.1",
        // The dashboard holds 4317 and the daemon 4318, so the site takes the next one. Stated
        // here so that running all three at once lands each on a port an operator can predict.
        port: 4319
    },
    vite: {
        plugins: [tailwindcss()]
    }
});
