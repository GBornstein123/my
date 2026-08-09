/**
 * Inlines the real rendered site into one self-contained HTML file:
 * fetches each route, embeds the compiled CSS and its woff2 faces as data
 * URIs, and adds a small router so internal links switch <main> content
 * instead of navigating. Output is a faithful preview, not a rebuild.
 */
import { writeFileSync } from "node:fs";

const BASE = "http://localhost:3111";
const ROUTES = [
  ["/", "Home"],
  ["/writing", "Writing"],
  ["/writing/the-trance-youre-already-in", "Essay"],
  ["/writing/suggestion-is-not-control", "Essay 2"],
  ["/writing/what-hypnosis-cannot-do", "Essay 3"],
  ["/writing/attention-as-the-only-instrument", "Essay 4"],
  ["/writing/the-stage-and-the-consulting-room", "Essay 5"],
  ["/listen", "Listen"],
  ["/about", "About"],
  ["/contact", "Contact"],
];

const get = async (p) => (await fetch(BASE + p)).text();
const buf = async (p) =>
  Buffer.from(await (await fetch(BASE + p)).arrayBuffer());

// 1. CSS, with every font file embedded
const home = await get("/");
const cssHref = home.match(/href="(\/_next\/static\/[^"]+\.css)"/)[1];
let css = await get(cssHref);

// Font URLs are relative to the stylesheet (/_next/static/chunks/x.css),
// so ../media/y.woff2 resolves to /_next/static/media/y.woff2.
const cssDir = cssHref.slice(0, cssHref.lastIndexOf("/"));
const fontRefs = [...new Set([...css.matchAll(/url\(([^)]+\.woff2)\)/g)].map((m) => m[1]))];
for (const ref of fontRefs) {
  const abs = new URL(ref, "http://x" + cssDir + "/").pathname;
  const b64 = (await buf(abs)).toString("base64");
  css = css.replaceAll(ref, `data:font/woff2;base64,${b64}`);
}
const fontPaths = fontRefs;

// next/font scopes --font-* to a generated class on <html>. We can't set
// attributes on the artifact's <html>, and the @theme tokens that reference
// these are declared at :root — where an undefined var makes the whole token
// invalid — so promote the three font variables to :root explicitly.
const fontVars = [...css.matchAll(/(--font-(?:fraunces|inter|newsreader)):([^;}]+)/g)]
  .map((m) => `${m[1]}:${m[2]}`)
  .join(";");
css += `\n:root{${fontVars}}\n`;
console.log("promoted font vars:", fontVars);
console.log(`inlined ${fontPaths.length} font files, css ${(css.length / 1024) | 0}kb`);

// 2. Per-route <main> content, plus the shared shell from home
const grab = (html, tag) => {
  const open = html.indexOf(`<${tag}`);
  const gt = html.indexOf(">", open);
  // Walk to the matching close tag, accounting for nesting.
  let depth = 1;
  let i = gt + 1;
  const openRe = new RegExp(`<${tag}[\\s>]`, "g");
  const closeRe = new RegExp(`</${tag}>`, "g");
  while (depth > 0) {
    openRe.lastIndex = i;
    closeRe.lastIndex = i;
    const o = openRe.exec(html);
    const c = closeRe.exec(html);
    if (!c) break;
    if (o && o.index < c.index) {
      depth++;
      i = o.index + 1;
    } else {
      depth--;
      i = c.index + 1;
      if (depth === 0) return html.slice(gt + 1, c.index);
    }
  }
  return "";
};

// The artifact wrapper owns <head>, so we can't declare a charset. Encode
// every non-ASCII character as a numeric entity so em dashes, curly quotes
// and arrows survive regardless of how the host labels the document.
const ascii = (s) =>
  s.replace(/[-￿]/g, (ch) => `&#${ch.charCodeAt(0)};`);

const panels = [];
for (const [route] of ROUTES) {
  const html = route === "/" ? home : await get(route);
  panels.push(
    `<div class="route" data-route="${route}" hidden>${ascii(grab(html, "main"))}</div>`,
  );
  process.stdout.write(".");
}
console.log("\nfetched", ROUTES.length, "routes");

const header = ascii(grab(home, "header"));
const footer = ascii(grab(home, "footer"));
const htmlClass = home.match(/<html[^>]*class="([^"]*)"/)[1];
const bodyOpen = `<div class="${htmlClass}">`;

const page = `<style>
${css}
/* Preview shell only — the site itself is unmodified above. */
.route[hidden]{display:none}
#preview-note{position:fixed;left:50%;bottom:1rem;transform:translateX(-50%);z-index:60;
  display:flex;gap:.6rem;align-items:center;padding:.55rem .95rem;border-radius:999px;
  background:var(--color-ink);color:var(--color-paper);font-family:var(--font-inter),sans-serif;
  font-size:.75rem;letter-spacing:.02em;box-shadow:0 6px 24px rgba(0,0,0,.18);max-width:calc(100vw - 2rem)}
#preview-note button{color:inherit;opacity:.6;background:none;border:0;cursor:pointer;font-size:1rem;line-height:1}
#preview-note button:hover{opacity:1}
</style>
${bodyOpen}
<div class="flex min-h-screen flex-col">
  <header class="sticky top-0 z-40 border-b border-rule bg-paper/85 backdrop-blur-md">${header}</header>
  <main id="main" class="flex-1">${panels.join("\n")}</main>
  <footer class="mt-32 border-t border-rule bg-paper-sunk">${footer}</footer>
</div>
</div>
<div id="preview-note">
  <span>Static preview &#8212; the contact form and audio players are not wired up.</span>
  <button type="button" aria-label="Dismiss" onclick="this.parentNode.remove()">&times;</button>
</div>
<script>
(function () {
  var routes = [...document.querySelectorAll(".route")];
  function show(path) {
    var target = routes.find(function (r) { return r.dataset.route === path; }) || routes[0];
    routes.forEach(function (r) { r.hidden = r !== target; });
    document.querySelectorAll('a[href^="/"]').forEach(function (a) {
      a.setAttribute("aria-current", a.getAttribute("href") === path ? "page" : "false");
    });
    window.scrollTo(0, 0);
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="/"]');
    if (!a) return;
    e.preventDefault();
    show(a.getAttribute("href"));
  });
  // Forms and audio have no backend in the preview.
  document.addEventListener("submit", function (e) { e.preventDefault(); });
  show("/");
})();
</script>`;

writeFileSync(process.argv[2], page);
console.log("wrote", process.argv[2], ((page.length / 1024 / 1024) * 1).toFixed(2) + "mb");
