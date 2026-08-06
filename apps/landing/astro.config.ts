import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

/**
 * The site is prerendered to static HTML, which is Astro's default and the reason it was chosen:
 * there is no server to boot, nothing to keep warm, and nothing to operate. Turning any page into
 * a rendered-on-request one is a deliberate act, not a default to drift into.
 *
 * `site` is what makes canonical URLs and the sitemap come out absolute, so it has to state the
 * domain the installer already points at: `release/install.sh` reads its downloads from the same
 * host, and the two must never disagree.
 */
export default defineConfig({
    site: "https://openlab.bot",
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
