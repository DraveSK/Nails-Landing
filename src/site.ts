import type { Tenant, Service } from './db';

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
export function renderTenantSite(tenant: Tenant, services: Service[]): string {
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

  return `<!DOCTYPE html>
<html lang="sk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${brand}</title>
<meta name="description" content="${escapeHtml(tenant.hero_subtitle)}">
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

  ${tenant.calendly_url ? `<section class="section booking">
    <h2>Rezervácia</h2>
    <iframe src="${escapeHtml(tenant.calendly_url)}" style="width:100%;min-height:650px;border:0;" title="Rezervácia termínu"></iframe>
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
  </footer>
</body>
</html>`;
}

export function renderNotFound(): string {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:80px 20px;">
  <h1>404</h1><p>Táto stránka neexistuje.</p>
  </body></html>`;
}
