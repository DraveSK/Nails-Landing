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
  if (tenant.facebook_url) {
    out = out.split('https://facebook.com/nailsbylinh').join(jsSafe(tenant.facebook_url));
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
  // an agency has uploaded at least one — paginated (8/page, matching the
  // grid's 4 columns) so a full album doesn't turn into one giant scroll. ──
  if (gallery.length) {
    const galleryMatch = out.match(/<div class="gallery-grid">[\s\S]*?<\/div>\s*<\/section>/);
    if (galleryMatch) {
      const PER_PAGE = 8;
      const pageCount = Math.ceil(gallery.length / PER_PAGE);
      const pagesHtml = Array.from({ length: pageCount }, (_, p) => {
        const tiles = gallery.slice(p * PER_PAGE, p * PER_PAGE + PER_PAGE).map(g => `
        <div class="gallery-tile"><img src="/img/${g.r2_key}" alt="${escapeHtml(g.caption || tenant.brand_name)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;border-radius:14px;"></div>`).join('');
        return `<div class="gallery-grid" data-gpage="${p}" style="${p === 0 ? '' : 'display:none;'}">${tiles}\n      </div>`;
      }).join('\n');
      const pager = pageCount > 1 ? `
      <div class="flip-controls" id="galleryPager" style="margin-top:18px;">
        <button id="galleryPrev" aria-label="Predchádzajúca strana">‹</button>
        <span id="galleryIndicator">1 / ${pageCount}</span>
        <button id="galleryNext" aria-label="Ďalšia strana">›</button>
      </div>
      <script>
        (function() {
          var pages = Array.prototype.slice.call(document.querySelectorAll('[data-gpage]'));
          var current = 0;
          var prevBtn = document.getElementById('galleryPrev');
          var nextBtn = document.getElementById('galleryNext');
          var indicator = document.getElementById('galleryIndicator');
          function update() {
            pages.forEach(function(el, i) { el.style.display = i === current ? '' : 'none'; });
            indicator.textContent = (current + 1) + ' / ' + pages.length;
            prevBtn.disabled = current === 0;
            nextBtn.disabled = current === pages.length - 1;
          }
          prevBtn.addEventListener('click', function() { if (current > 0) { current--; update(); } });
          nextBtn.addEventListener('click', function() { if (current < pages.length - 1) { current++; update(); } });
          update();
        })();
      </script>` : '';
      out = out.replace(galleryMatch[0], `${pagesHtml}${pager}\n</section>`);
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
<style>${PWA_STYLE}</style>
</head>`);

  out = out.replace('© 2026', `© ${new Date().getFullYear()}`);

  out = out.replace('</body>', `${renderInstallPromptScript(escapeHtml(tenant.brand_name))}
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() { navigator.serviceWorker.register('/sw.js').catch(function() {}); });
  }
</script>
</body>`);

  return out;
}

function renderFlipbook(tenant: Tenant, services: Service[], brandJsSafe: string): { html: string; total: number } {
  const brand = escapeHtml(tenant.brand_name);
  const primary = tenant.color_primary || '#FF3D8A';
  const secondary = tenant.color_secondary || '#8B2FF0';
  const logoHtml = tenant.logo_data_url
    ? `<img src="${tenant.logo_data_url}" alt="${brand}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`
    : '💅';

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

  const ctaLink = tenant.calendly_url || (tenant.whatsapp_number ? `https://wa.me/${tenant.whatsapp_number.replace(/[^0-9]/g, '')}` : '#');

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
            <a class="btn btn-primary" href="${escapeHtml(ctaLink)}" target="_blank" style="margin-top:20px;">
              <span>💬 Rezervovať termín</span>
            </a>
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
