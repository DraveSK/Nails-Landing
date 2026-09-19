import type { Tenant, Service, GalleryImage } from './db';
import template from '../index.html';
import { renderInstallPromptScript, PWA_STYLE } from './pwa';

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// JS-string-safe: the brand name gets substituted into both HTML text AND
// single-quoted JS string literals inside the template's translations
// object, so a raw apostrophe would break the script. HTML-unsafe chars
// aren't a real concern here (operator-entered business names, not user
// input from the public).
function jsSafe(s: string): string {
  return s.replace(/'/g, '’').replace(/"/g, '”');
}

const GALLERY_MARQUEE_STYLE = `
  .gallery-marquee-wrap { overflow: hidden; position: relative; width: 100%; -webkit-mask-image: linear-gradient(90deg, transparent, #000 5%, #000 95%, transparent); mask-image: linear-gradient(90deg, transparent, #000 5%, #000 95%, transparent); }
  .gallery-track { display: flex; gap: 14px; width: max-content; animation-name: gallery-scroll; animation-timing-function: linear; animation-iteration-count: infinite; }
  .gallery-marquee-wrap:hover .gallery-track { animation-play-state: paused; }
  @keyframes gallery-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
  .marquee-tile { flex: 0 0 auto; width: 200px; height: 200px; cursor: pointer; transition: transform .2s; }
  .marquee-tile:hover { transform: scale(1.04); }
  .gallery-lightbox { position: fixed; inset: 0; background: rgba(20,10,30,.92); z-index: 1000; display: none; align-items: center; justify-content: center; }
  .gallery-lightbox.show { display: flex; }
  .gallery-lightbox img { max-width: 88vw; max-height: 82vh; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,.5); }
  .gallery-lightbox-close { position: absolute; top: 20px; right: 24px; background: transparent; border: none; color: #fff; font-size: 1.6rem; cursor: pointer; }
  .gallery-lightbox-nav { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,.15); border: none; color: #fff; font-size: 2rem; width: 52px; height: 52px; border-radius: 50%; cursor: pointer; }
  .gallery-lightbox-prev { left: 16px; }
  .gallery-lightbox-next { right: 16px; }
  @media (max-width: 600px) { .marquee-tile { width: 140px; height: 140px; } }
`;

// Exact original text for each of the 6 service-card slots in index.html —
// used both to know what to replace and, when a tenant has fewer than 6
// services, to know exactly which literal chunks to hide.
const DEFAULT_SERVICES: { icon: string; title: string; desc: string; price: string }[] = [
  { icon: '✨', title: 'Gélové nechty', desc: 'Trvácne a lesklé, vydržia až 4 týždne bez odlupovania.', price: '25 €' },
  { icon: '💜', title: 'Akrylové nechty', desc: 'Pevná štruktúra, ideálna na predĺženie a tvarovanie nechtov.', price: '30 €' },
  { icon: '🌊', title: 'Manikúra', desc: 'Klasická starostlivosť o nechty a pokožku rúk.', price: '15 €' },
  { icon: '🔥', title: 'Pedikúra', desc: 'Relaxačná starostlivosť o chodidlá s peelingom a masážou.', price: '20 €' },
  { icon: '🎨', title: 'Nail art', desc: 'Ručne maľované vzory, kamienky alebo 3D dekorácie podľa vášho štýlu.', price: '5 €' },
  { icon: '🧼', title: 'Odstránenie', desc: 'Šetrné odstránenie gélu alebo akrylu bez poškodenia nechtov.', price: '10 €' },
];

// This renders the ORIGINAL nails.drave.sk sales-demo template — wheel,
// flip-book menu, SVG gallery, i18n switcher, GDPR cookie banner + legal
// modal all included — with tenant data substituted at the exact spots
// that were hardcoded demo content. Deliberately NOT a rebuild: the brief
// is "swap values into the existing design, don't change the design."
export function renderTenantSite(tenant: Tenant, services: Service[], gallery: GalleryImage[] = []): string {
  let out = template;
  const brand = jsSafe(tenant.brand_name);
  const primary = tenant.color_primary || '#FF3D8A';
  const secondary = tenant.color_secondary || '#8B2FF0';

  out = out.replace(
    /<title>Nails by Linh[^<]*<\/title>/,
    `<title>${escapeHtml(tenant.brand_name)}</title>`
  );
  out = out.split('Nails by Linh').join(brand);

  if (tenant.logo_data_url) {
    out = out.split('src="/logo.png"').join(`src="${tenant.logo_data_url}"`);
  }

  if (tenant.phone) {
    out = out.split('tel:+421 900 123 456').join(`tel:${jsSafe(tenant.phone)}`);
    out = out.split('+421 900 123 456').join(jsSafe(tenant.phone));
  }
  if (tenant.whatsapp_number) {
    out = out.split('421900123456').join(tenant.whatsapp_number.replace(/[^0-9]/g, ''));
  }
  if (tenant.email) {
    out = out.split('info@nailsbylinh.sk').join(jsSafe(tenant.email));
  }
  // Instagram/TikTok/YouTube didn't exist as visible elements in the
  // original template at all (Instagram was a dead admin field). The
  // fixed "Facebook: ..." contact line is dropped entirely rather than
  // turned into a list of social lines — the icon buttons down in the
  // final-CTA section are enough, no need to repeat the links as text too.
  const socialLine = out.match(/\s*<div class="contact-line"><span class="dot"><\/span> Facebook: [^<]*<\/div>/);
  if (socialLine) {
    out = out.replace(socialLine[0], '');
  }
  const finalFollowMatch = out.match(/<a class="btn btn-secondary" href="https:\/\/facebook\.com\/nailsbylinh"[\s\S]*?<\/a>/);
  if (finalFollowMatch) {
    const buttons = [
      tenant.facebook_url && `<a class="btn btn-secondary" href="${escapeHtml(tenant.facebook_url)}" target="_blank"><span>📘 Facebook</span></a>`,
      tenant.instagram_url && `<a class="btn btn-secondary" href="${escapeHtml(tenant.instagram_url)}" target="_blank"><span>📷 Instagram</span></a>`,
      tenant.tiktok_url && `<a class="btn btn-secondary" href="${escapeHtml(tenant.tiktok_url)}" target="_blank"><span>🎵 TikTok</span></a>`,
      tenant.youtube_url && `<a class="btn btn-secondary" href="${escapeHtml(tenant.youtube_url)}" target="_blank"><span>▶️ YouTube</span></a>`,
    ].filter(Boolean).join('\n    ');
    out = out.replace(finalFollowMatch[0], buttons);
  }
  if (tenant.maps_url) {
    out = out.replace(
      /href="https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=[^"]*"/,
      `href="${escapeHtml(tenant.maps_url)}"`
    );
    out = out.replace(
      /href="https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=[^"]*"/,
      `href="${escapeHtml(tenant.maps_url)}"`
    );
  }
  if (tenant.calendly_url) {
    out = out.split('https://calendly.com/dravesk/30mins').join(jsSafe(tenant.calendly_url));
  }
  // eyebrow/hero_title/hero_lede appear twice each — once as literal HTML
  // text, once inside the translations.sk JS object — an ordinary global
  // replace updates both at once since both copies are identical strings.
  out = out.split('💅 Nail salón · Bratislava').join(jsSafe(tenant.eyebrow_text));
  out = out.split('Nechty, čo <span class="grad">žiaria</span><br>tak ako vy.').join(jsSafe(tenant.hero_title));
  out = out.split('Farebné gél nechty, nail art a starostlivosť, po ktorej sa budete cítiť ako hviezda. Priamo v centre Bratislavy.').join(jsSafe(tenant.hero_subtitle));
  if (tenant.address) {
    const addr = jsSafe(tenant.address);
    out = out.split('Obchodná 12, 811 06 Bratislava').join(addr);
    out = out.split('Obchodn%C3%A1%2012%2C%20811%2006%20Bratislava').join(encodeURIComponent(tenant.address));
    out = out.split('Obchodn%C3%A1+12%2C+811+06+Bratislava').join(encodeURIComponent(tenant.address).replace(/%20/g, '+'));
  }
  if (tenant.hours_weekday) out = out.split('9:00 – 19:00').join(jsSafe(tenant.hours_weekday));
  if (tenant.hours_saturday) out = out.split('9:00 – 15:00').join(jsSafe(tenant.hours_saturday));
  if (tenant.hours_sunday && tenant.hours_sunday !== 'Zatvorené') {
    out = out.replace(
      '<span data-i18n="closed">Zatvorené</span>',
      `<span>${escapeHtml(tenant.hours_sunday)}</span>`
    );
  }

  // ── Service cards + wheel slots (fixed 6 in this design) ────────────────
  DEFAULT_SERVICES.forEach((def, i) => {
    const n = i + 1;
    const svc = services[i];
    if (svc) {
      if (svc.icon && svc.icon !== def.icon) {
        out = out.split(`<div class="icon">${def.icon}</div>`).join(`<div class="icon">${escapeHtml(svc.icon)}</div>`);
      }
      out = out.split(def.title).join(jsSafe(svc.name));
      if (svc.description) out = out.split(def.desc).join(jsSafe(svc.description));
      out = out.replace(
        `<span data-i18n="price_prefix">od</span> ${def.price}`,
        escapeHtml(svc.price)
      );
    } else {
      // Fewer than 6 real services — hide this slot rather than show
      // leftover demo content, in both the grid and the hero wheel.
      out = out.replace(`<div class="service-card" id="service${n}">`, `<div class="service-card" id="service${n}" style="display:none">`);
      out = out.replace(`href="#service${n}"`, `href="#service${n}" style="display:none"`);
    }
  });

  // ── Price-menu flip-book: regenerated from the real service list so it
  // always matches what's in the grid above, instead of the 2 fixed demo
  // pages with unrelated "extra" line items. ────────────────────────────
  const flipbookMatch = out.match(/<div class="flipbook" id="flipbook">[\s\S]*?<\/div>\s*<\/div>\s*<div class="flip-controls">/);
  if (flipbookMatch) {
    const { html: flipbookHtml, total: flipTotal } = renderFlipbook(tenant, services, brand);
    out = out.replace(flipbookMatch[0], flipbookHtml);
    out = out.replace(/<span id="flipIndicator">1 \/ \d+<\/span>/, `<span id="flipIndicator">1 / ${flipTotal}</span>`);
  }

  // ── Gallery: real uploaded photos replace the decorative SVG tiles once
  // an agency has uploaded at least one — an auto-scrolling right-to-left
  // strip (pauses on hover, click opens a full-size lightbox) rather than
  // paged grid pages, closer to how salons show off work on Instagram. ──
  if (gallery.length) {
    const galleryMatch = out.match(/<div class="gallery-grid">[\s\S]*?<\/div>\s*<\/section>/);
    if (galleryMatch) {
      const lightboxSrcs = gallery.map(g => `/img/${g.r2_key}`);
      const tile = (g: GalleryImage, i: number) => `
        <div class="gallery-tile marquee-tile" onclick="openGalleryLightbox(${i})"><img src="/img/${g.r2_key}" alt="${escapeHtml(g.caption || tenant.brand_name)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;border-radius:14px;"></div>`;
      // Doubled so the strip can loop seamlessly (scrolls exactly one
      // full copy's width, then jumps back unnoticed since copy 2 = copy 1).
      const tiles = gallery.map((g, i) => tile(g, i)).join('') + gallery.map((g, i) => tile(g, i)).join('');
      const duration = Math.max(gallery.length * 4, 12);
      out = out.replace(galleryMatch[0], `<div class="gallery-marquee-wrap">
        <div class="gallery-track" id="galleryTrack" style="animation-duration:${duration}s;">${tiles}</div>
      </div>
      <div class="gallery-lightbox" id="galleryLightbox" onclick="if(event.target===this) closeGalleryLightbox()">
        <button class="gallery-lightbox-close" onclick="closeGalleryLightbox()">✕</button>
        <button class="gallery-lightbox-nav gallery-lightbox-prev" onclick="galleryLightboxNav(-1)">‹</button>
        <img id="galleryLightboxImg" src="">
        <button class="gallery-lightbox-nav gallery-lightbox-next" onclick="galleryLightboxNav(1)">›</button>
      </div>
      <script>
        (function() {
          var srcs = ${JSON.stringify(lightboxSrcs)};
          var current = 0;
          window.openGalleryLightbox = function(i) {
            current = i % srcs.length;
            document.getElementById('galleryLightboxImg').src = srcs[current];
            document.getElementById('galleryLightbox').classList.add('show');
          };
          window.closeGalleryLightbox = function() { document.getElementById('galleryLightbox').classList.remove('show'); };
          window.galleryLightboxNav = function(dir) {
            current = (current + dir + srcs.length) % srcs.length;
            document.getElementById('galleryLightboxImg').src = srcs[current];
          };
        })();
      </script>
</section>`);
    }
  }

  // ── Theme colors: every gradient/accent in the CSS reads from these two
  // custom properties, so overriding them re-themes the whole page. ──────
  out = out.replace('</head>', `<style>:root{--hotpink:${primary};--purple:${secondary};}</style>
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="${primary}">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="${escapeHtml(tenant.brand_name)}">
${tenant.logo_data_url ? `<link rel="apple-touch-icon" href="${tenant.logo_data_url}">` : ''}
<style>${PWA_STYLE}${GALLERY_MARQUEE_STYLE}</style>
</head>`);

  out = out.replace('© 2026', `© ${new Date().getFullYear()}`);

  // ── Per-language content for the SK/VI/EN switcher. The literal-text
  // substitutions above only cover the page's initial state (Slovak,
  // rendered from raw HTML before any script runs) — switching language
  // re-renders from this `translations` object, so without this override
  // VI/EN would fall back to the original demo's placeholder text. Built
  // as JSON rather than string-splicing into the script, since a tenant's
  // text can contain quotes/apostrophes that would otherwise break it.
  const i18nOverrides = buildI18nOverrides(tenant, services);
  out = out.replace('</body>', `<script>
  (function() {
    var o = ${JSON.stringify(i18nOverrides)};
    if (typeof translations !== 'undefined') {
      Object.assign(translations.sk, o.sk);
      Object.assign(translations.vi, o.vi);
      Object.assign(translations.en, o.en);
    }
  })();
</script>
${renderInstallPromptScript(escapeHtml(tenant.brand_name))}
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() { navigator.serviceWorker.register('/sw.js').catch(function() {}); });
  }
</script>
</body>`);

  return out;
}

function buildI18nOverrides(tenant: Tenant, services: Service[]) {
  const sk: Record<string, string> = {
    eyebrow: tenant.eyebrow_text,
    hero_title: tenant.hero_title,
    hero_lede: tenant.hero_subtitle,
  };
  const vi: Record<string, string> = {
    eyebrow: tenant.eyebrow_text_vi || tenant.eyebrow_text,
    hero_title: tenant.hero_title_vi || tenant.hero_title,
    hero_lede: tenant.hero_subtitle_vi || tenant.hero_subtitle,
  };
  const en: Record<string, string> = {
    eyebrow: tenant.eyebrow_text_en || tenant.eyebrow_text,
    hero_title: tenant.hero_title_en || tenant.hero_title,
    hero_lede: tenant.hero_subtitle_en || tenant.hero_subtitle,
  };
  services.slice(0, 6).forEach((s, i) => {
    const n = i + 1;
    sk[`card${n}_title`] = s.name;
    sk[`card${n}_desc`] = s.description;
    vi[`card${n}_title`] = s.name_vi || s.name;
    vi[`card${n}_desc`] = s.description_vi || s.description;
    en[`card${n}_title`] = s.name_en || s.name;
    en[`card${n}_desc`] = s.description_en || s.description;
  });
  return { sk, vi, en };
}

function renderFlipbook(tenant: Tenant, services: Service[], brandJsSafe: string): { html: string; total: number } {
  const brand = escapeHtml(tenant.brand_name);
  const primary = tenant.color_primary || '#FF3D8A';
  const secondary = tenant.color_secondary || '#8B2FF0';
  // Same fallback as the nav/wheel logos elsewhere on the page: default to
  // the shared /logo.png static asset when the tenant hasn't uploaded
  // their own yet, instead of dropping to a plain emoji.
  const logoHtml = `<img src="${tenant.logo_data_url || '/logo.png'}" alt="${brand}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;

  const PER_PAGE = 6;
  const pages: string[] = [];
  for (let i = 0; i < services.length; i += PER_PAGE) {
    const chunk = services.slice(i, i + PER_PAGE);
    const items = chunk.map(s => `<li><span>${escapeHtml(s.icon || '💅')} ${escapeHtml(s.name)}</span><span>${escapeHtml(s.price)}</span></li>`).join('');
    pages.push(`<ul class="menu-list">${items}</ul>`);
  }
  if (pages.length === 0) {
    pages.push(`<p style="text-align:center;color:#888;">Cenník sa pripravuje.</p>`);
  }

  const total = pages.length + 2; // cover + content pages + back
  const contentPages = pages.map((p, idx) => `
        <div class="flip-page" style="z-index:${total - 1 - idx};background:#fff;">
          <div class="page-content">${p}</div>
        </div>`).join('');

  // Same "open the Calendly popup widget in-page" behavior as the main
  // contact section's booking button (index.html's #kontakt btn-calendar),
  // instead of just linking out to a new tab — falls back to a plain
  // WhatsApp link (which is inherently an external hand-off anyway) only
  // when the tenant hasn't set a Calendly URL.
  const backCta = tenant.calendly_url
    ? `<a class="btn btn-primary" href="${escapeHtml(tenant.calendly_url)}" target="_blank"
         onclick="if(typeof Calendly !== 'undefined'){Calendly.initPopupWidget({url: '${jsSafe(tenant.calendly_url)}'}); return false;}" style="margin-top:20px;">
        <span>💬 Rezervovať termín</span>
      </a>`
    : tenant.whatsapp_number
      ? `<a class="btn btn-primary" href="https://wa.me/${tenant.whatsapp_number.replace(/[^0-9]/g, '')}" target="_blank" style="margin-top:20px;">
          <span>💬 Rezervovať termín</span>
        </a>`
      : '';

  const html = `<div class="flipbook" id="flipbook">
        <div class="flip-page" style="z-index:${total};background:linear-gradient(160deg,${primary},${secondary});">
          <div class="page-content page-cover">
            <div class="page-cover-logo">${logoHtml}</div>
            <h3>${brand}</h3>
            <p>Kompletný cenník služieb</p>
            <span class="flip-hint">👉 Kliknite alebo použite šípky</span>
          </div>
        </div>
        ${contentPages}
        <div class="flip-page" style="z-index:1;background:linear-gradient(160deg,var(--ink),#4A2065);">
          <div class="page-content page-cover">
            <h3>Tešíme sa na vás! 💅</h3>
            ${backCta}
          </div>
        </div>
      </div>
      <div class="flip-controls">`;
  return { html, total };
}

export function renderNotFound(): string {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:80px 20px;">
  <h1>404</h1><p>Táto stránka neexistuje.</p>
  </body></html>`;
}
