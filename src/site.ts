import type { Tenant, Service, GalleryImage } from './db';
import { renderInstallPromptScript, PWA_STYLE } from './pwa';

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Each agency's live site. Deliberately its own clean template rather than a
// surgical clone of the nails.drave.sk sales-demo page: the demo's wheel/
// flipbook decorations are hand-tuned to that one fictional salon, so
// parameterizing them for every agency would be fragile. This template
// covers everything an agency can actually edit from /admin (branding,
// hero, services, contact/footer, Calendly), which is what the €79 product
// promises — a real page, not a pixel copy of the demo.
export function renderTenantSite(tenant: Tenant, services: Service[], gallery: GalleryImage[] = []): string {
  const primary = tenant.color_primary || '#FF3D8A';
  const secondary = tenant.color_secondary || '#8B2FF0';
  const brand = escapeHtml(tenant.brand_name);
  const waLink = tenant.whatsapp_number ? `https://wa.me/${tenant.whatsapp_number.replace(/[^0-9]/g, '')}` : '';

  const servicesHtml = services.map(s => `
    <div class="service-card">
      <div class="service-icon">${escapeHtml(s.icon || '💅')}</div>
      <div class="service-name">${escapeHtml(s.name)}</div>
      <div class="service-price">${escapeHtml(s.price)}</div>
    </div>`).join('\n');

  const logoHtml = tenant.logo_data_url
    ? `<img src="${tenant.logo_data_url}" alt="${brand}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;">`
    : '';

  // Rendered back-to-front (z-index) so index 0 sits on top of the stack —
  // "flipping" a page just rotates the top one away to reveal the next.
  const flipPagesHtml = gallery.map((g, i) => `
    <div class="flip-page" style="z-index:${gallery.length - i}; background-image:url('/img/${g.r2_key}');" data-index="${i}">
      ${g.caption ? `<div class="flip-caption">${escapeHtml(g.caption)}</div>` : ''}
    </div>`).join('\n');

  return `<!DOCTYPE html>
<html lang="sk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${brand}</title>
<meta name="description" content="${escapeHtml(tenant.hero_subtitle)}">
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="${primary}">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="${brand}">
${tenant.logo_data_url ? `<link rel="apple-touch-icon" href="${tenant.logo_data_url}">\n<link rel="icon" href="${tenant.logo_data_url}">` : ''}
<style>
  :root { --primary: ${primary}; --secondary: ${secondary}; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Segoe UI', sans-serif; color: #2b2b2b; background: #fff8fb; }
  a { color: inherit; }
  .nav { display: flex; align-items: center; justify-content: space-between; padding: 18px 6vw; }
  .nav .logo { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 1.2rem; }
  .nav .logo span { color: var(--primary); }
  .hero { text-align: center; padding: 60px 6vw 80px; background: linear-gradient(135deg, ${primary}22, ${secondary}22); }
  .eyebrow { display: inline-block; background: #fff; padding: 6px 16px; border-radius: 999px; font-size: .9rem; margin-bottom: 18px; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
  .hero h1 { font-size: clamp(1.8rem, 5vw, 3rem); margin-bottom: 16px; }
  .hero p { font-size: 1.1rem; color: #555; max-width: 560px; margin: 0 auto 28px; }
  .cta { display: inline-block; padding: 14px 32px; border-radius: 999px; background: linear-gradient(135deg, var(--primary), var(--secondary)); color: #fff; font-weight: 600; text-decoration: none; box-shadow: 0 8px 20px ${primary}55; }
  .section { padding: 60px 6vw; max-width: 1000px; margin: 0 auto; }
  .section h2 { text-align: center; font-size: 2rem; margin-bottom: 36px; }
  .services-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 18px; }
  .service-card { background: #fff; border-radius: 16px; padding: 24px; text-align: center; box-shadow: 0 4px 16px rgba(0,0,0,.06); }
  .service-icon { font-size: 2rem; margin-bottom: 10px; }
  .service-name { font-weight: 600; margin-bottom: 6px; }
  .service-price { color: var(--primary); font-weight: 700; }
  .booking { text-align: center; }
  .footer { background: #2b2b2b; color: #eee; padding: 50px 6vw; }
  .footer-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; max-width: 1000px; margin: 0 auto 24px; }
  .footer h3 { margin-bottom: 10px; color: #fff; }
  .footer a.social { margin-right: 12px; }
  .footer .copy { text-align: center; opacity: .6; font-size: .85rem; margin-top: 20px; }

  .flipbook-wrap { display: flex; flex-direction: column; align-items: center; gap: 16px; }
  .flipbook { position: relative; width: 100%; max-width: 480px; aspect-ratio: 4/3; perspective: 1800px; user-select: none; }
  .flip-page { position: absolute; inset: 0; background: #eee center/cover no-repeat; border-radius: 14px; box-shadow: 0 10px 28px rgba(0,0,0,.18); backface-visibility: hidden; transform-origin: left center; transition: transform .65s cubic-bezier(.4,.1,.2,1); cursor: pointer; }
  .flip-page.flipped { transform: rotateY(-178deg); }
  .flip-caption { position: absolute; left: 0; right: 0; bottom: 0; padding: 10px 14px; background: linear-gradient(transparent, rgba(0,0,0,.6)); color: #fff; font-size: .9rem; border-radius: 0 0 14px 14px; }
  .flip-controls { display: flex; align-items: center; gap: 18px; }
  .flip-controls button { width: 42px; height: 42px; border-radius: 50%; border: none; background: #fff; box-shadow: 0 2px 10px rgba(0,0,0,.1); font-size: 1.1rem; cursor: pointer; }
  .flip-controls button:disabled { opacity: .3; cursor: default; }
  .flip-counter { font-size: .85rem; color: #777; }

  .cookie-banner { position: fixed; left: 0; right: 0; bottom: 0; z-index: 999; background: #1f1f1f; color: #eee; padding: 18px 6vw; display: none; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; box-shadow: 0 -4px 20px rgba(0,0,0,.2); }
  .cookie-banner.show { display: flex; }
  .cookie-banner p { font-size: .85rem; max-width: 640px; line-height: 1.5; }
  .cookie-banner a { text-decoration: underline; }
  .cookie-actions { display: flex; gap: 10px; flex-shrink: 0; }
  .cookie-actions button { padding: 9px 18px; border-radius: 999px; border: none; cursor: pointer; font-weight: 600; font-size: .85rem; }
  .cookie-accept { background: var(--primary); color: #fff; }
  .cookie-decline { background: transparent; color: #ccc; border: 1px solid #555 !important; }
  .booking-consent-notice { padding: 40px 20px; text-align: center; color: #666; background: #f4f4f4; border-radius: 12px; }
  .booking-consent-notice button { margin-top: 12px; padding: 10px 24px; border-radius: 999px; border: none; background: var(--primary); color: #fff; font-weight: 600; cursor: pointer; }
  .footer-legal { text-align: center; margin-top: 14px; }
  .footer-legal a { font-size: .8rem; opacity: .7; margin: 0 8px; }
${PWA_STYLE}
</style>
</head>
<body>
  <nav class="nav">
    <div class="logo">${logoHtml}${brand}<span>.</span></div>
    ${tenant.calendly_url ? `<a class="cta" href="${escapeHtml(tenant.calendly_url)}" target="_blank" rel="noopener">Rezervovať</a>` : ''}
  </nav>

  <section class="hero">
    <div class="eyebrow">${escapeHtml(tenant.eyebrow_text)}</div>
    <h1>${escapeHtml(tenant.hero_title)}</h1>
    <p>${escapeHtml(tenant.hero_subtitle)}</p>
    ${tenant.calendly_url ? `<a class="cta" href="${escapeHtml(tenant.calendly_url)}" target="_blank" rel="noopener">Rezervovať termín</a>` : ''}
  </section>

  ${services.length ? `<section class="section">
    <h2>Cenník služieb</h2>
    <div class="services-grid">${servicesHtml}</div>
  </section>` : ''}

  ${gallery.length ? `<section class="section">
    <h2>Naše fotky</h2>
    <div class="flipbook-wrap">
      <div class="flipbook" id="flipbook">${flipPagesHtml}</div>
      <div class="flip-controls">
        <button id="flip-prev" aria-label="Predchádzajúca">‹</button>
        <span class="flip-counter"><span id="flip-current">1</span> / ${gallery.length}</span>
        <button id="flip-next" aria-label="Ďalšia">›</button>
      </div>
    </div>
  </section>
  <script>
    (function() {
      var pages = Array.prototype.slice.call(document.querySelectorAll('#flipbook .flip-page'));
      var total = pages.length;
      var current = 0;
      var prevBtn = document.getElementById('flip-prev');
      var nextBtn = document.getElementById('flip-next');
      var counter = document.getElementById('flip-current');
      function update() {
        counter.textContent = current + 1;
        prevBtn.disabled = current === 0;
        nextBtn.disabled = current === total - 1;
      }
      function next() { if (current < total - 1) { pages[current].classList.add('flipped'); current++; update(); } }
      function prev() { if (current > 0) { current--; pages[current].classList.remove('flipped'); update(); } }
      nextBtn.addEventListener('click', next);
      prevBtn.addEventListener('click', prev);
      document.getElementById('flipbook').addEventListener('click', function(e) {
        var rect = this.getBoundingClientRect();
        if (e.clientX - rect.left > rect.width / 2) next(); else prev();
      });
      update();
    })();
  </script>` : ''}

  ${tenant.calendly_url ? `<section class="section booking">
    <h2>Rezervácia</h2>
    <div id="booking-embed">
      <iframe data-src="${escapeHtml(tenant.calendly_url)}" style="width:100%;min-height:650px;border:0;display:none;" title="Rezervácia termínu"></iframe>
      <div class="booking-consent-notice" id="booking-consent-notice">
        <p>Rezervačný widget Calendly načíta súbory cookie tretej strany. Zobrazí sa po odsúhlasení cookies nižšie.</p>
        <button onclick="acceptCookies()">Povoliť a zobraziť rezerváciu</button>
        <p style="margin-top:10px;"><a href="${escapeHtml(tenant.calendly_url)}" target="_blank" rel="noopener">alebo rezervovať priamo na Calendly ↗</a></p>
      </div>
    </div>
  </section>` : ''}

  <footer class="footer">
    <div class="footer-grid">
      <div>
        <h3>Kontakt</h3>
        ${tenant.address ? `<p>${escapeHtml(tenant.address)}</p>` : ''}
        ${tenant.phone ? `<p><a href="tel:${escapeHtml(tenant.phone)}">${escapeHtml(tenant.phone)}</a></p>` : ''}
        ${tenant.email ? `<p><a href="mailto:${escapeHtml(tenant.email)}">${escapeHtml(tenant.email)}</a></p>` : ''}
        ${waLink ? `<p><a href="${waLink}" target="_blank" rel="noopener">WhatsApp</a></p>` : ''}
      </div>
      <div>
        <h3>Otváracie hodiny</h3>
        <p>Po–Pia: ${escapeHtml(tenant.hours_weekday)}</p>
        <p>Sobota: ${escapeHtml(tenant.hours_saturday)}</p>
        <p>Nedeľa: ${escapeHtml(tenant.hours_sunday)}</p>
      </div>
      <div>
        <h3>Sledujte nás</h3>
        ${tenant.facebook_url ? `<a class="social" href="${escapeHtml(tenant.facebook_url)}" target="_blank" rel="noopener">Facebook</a>` : ''}
        ${tenant.instagram_url ? `<a class="social" href="${escapeHtml(tenant.instagram_url)}" target="_blank" rel="noopener">Instagram</a>` : ''}
      </div>
    </div>
    <div class="copy">&copy; ${new Date().getFullYear()} ${brand}</div>
    <div class="footer-legal">
      <a href="/privacy">Ochrana osobných údajov (GDPR)</a>
      <a href="#" onclick="openCookieSettings(); return false;">Nastavenia cookies</a>
    </div>
  </footer>

  <div class="cookie-banner" id="cookie-banner">
    <p>Táto stránka používa cookies len na nevyhnutné fungovanie a — po vašom súhlase — na zobrazenie rezervačného widgetu Calendly. Viac v <a href="/privacy">Ochrane osobných údajov</a>.</p>
    <div class="cookie-actions">
      <button class="cookie-decline" onclick="declineCookies()">Odmietnuť</button>
      <button class="cookie-accept" onclick="acceptCookies()">Prijať</button>
    </div>
  </div>
  <script>
    (function() {
      var KEY = 'cookie_consent';
      var banner = document.getElementById('cookie-banner');
      var stored = null;
      try { stored = localStorage.getItem(KEY); } catch (e) {}
      function applyConsent(value) {
        var iframe = document.querySelector('#booking-embed iframe');
        var notice = document.getElementById('booking-consent-notice');
        if (value === 'accepted' && iframe && iframe.dataset.src) {
          iframe.src = iframe.dataset.src;
          iframe.style.display = 'block';
          if (notice) notice.style.display = 'none';
        }
      }
      window.acceptCookies = function() {
        try { localStorage.setItem(KEY, 'accepted'); } catch (e) {}
        banner.classList.remove('show');
        applyConsent('accepted');
      };
      window.declineCookies = function() {
        try { localStorage.setItem(KEY, 'declined'); } catch (e) {}
        banner.classList.remove('show');
      };
      window.openCookieSettings = function() { banner.classList.add('show'); };
      if (!stored) banner.classList.add('show');
      else applyConsent(stored);
    })();
  </script>

  ${renderInstallPromptScript(brand)}
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() { navigator.serviceWorker.register('/sw.js').catch(function() {}); });
    }
  </script>
</body>
</html>`;
}

export function renderPrivacyPage(tenant: Tenant): string {
  const brand = escapeHtml(tenant.brand_name);
  return `<!DOCTYPE html>
<html lang="sk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ochrana osobných údajov — ${brand}</title>
<style>
  body { font-family: -apple-system, 'Segoe UI', sans-serif; max-width: 720px; margin: 0 auto; padding: 40px 20px 80px; color: #2b2b2b; line-height: 1.6; }
  h1 { font-size: 1.6rem; margin-bottom: 6px; }
  h2 { font-size: 1.1rem; margin: 28px 0 8px; }
  a { color: ${tenant.color_primary || '#FF3D8A'}; }
  .back { display: inline-block; margin-bottom: 24px; }
</style>
</head>
<body>
  <a class="back" href="/">&larr; Späť na stránku</a>
  <h1>Ochrana osobných údajov</h1>
  <p>Prevádzkovateľ: <strong>${brand}</strong>${tenant.address ? `, ${escapeHtml(tenant.address)}` : ''}${tenant.email ? ` — <a href="mailto:${escapeHtml(tenant.email)}">${escapeHtml(tenant.email)}</a>` : ''}</p>

  <h2>Aké údaje spracúvame</h2>
  <p>Táto stránka samotná neukladá žiadne osobné údaje na vlastných serveroch okrem technických údajov nevyhnutných na jej fungovanie (napr. voľba súhlasu s cookies vo vašom prehliadači). Ak si rezervujete termín cez Calendly, vaše meno, e-mail a telefón spracúva priamo <strong>Calendly</strong> podľa jeho vlastných zásad ochrany osobných údajov.</p>

  <h2>Cookies</h2>
  <p>Používame iba nevyhnutné technické cookies (uloženie vašej voľby súhlasu) a — až po vašom súhlase — cookies rezervačného widgetu Calendly, ktorý sa načíta len keď to odsúhlasíte. Súhlas môžete kedykoľvek zmeniť tlačidlom „Nastavenia cookies“ v pätičke stránky.</p>

  <h2>Vaše práva</h2>
  <p>Podľa nariadenia GDPR (EÚ 2016/679) máte právo na prístup k svojim údajom, ich opravu, vymazanie, obmedzenie spracúvania a prenosnosť. So žiadosťou sa obráťte priamo na prevádzkovateľa uvedeného vyššie${tenant.email ? ` na ${escapeHtml(tenant.email)}` : ''}. Ak spracúvanie súvisí s rezerváciou termínu, kontaktujte aj Calendly.</p>

  <h2>Kontakt</h2>
  <p>${tenant.address ? `${escapeHtml(tenant.address)}<br>` : ''}${tenant.phone ? `${escapeHtml(tenant.phone)}<br>` : ''}${tenant.email ? escapeHtml(tenant.email) : ''}</p>
</body>
</html>`;
}

export function renderNotFound(): string {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:80px 20px;">
  <h1>404</h1><p>Táto stránka neexistuje.</p>
  </body></html>`;
}
