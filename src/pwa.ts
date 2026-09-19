import type { Tenant } from './db';
import { safeLogoUrl } from './site';

// One manifest per tenant, generated on the fly from their own D1 row — no
// static file per agency needed. The logo (already stored as a base64
// data: URL for the site itself) is reused directly as the icon; browsers
// happily scale a single square image for both required sizes, so this
// stays "1 Worker + 1 D1" with no extra asset pipeline.
export function renderManifest(tenant: Tenant): string {
  // Same fallback as everywhere else on the site (nav, favicon, flip-book
  // cover) — a tenant who hasn't uploaded their own logo yet should still
  // get the real shared logo here, not a blank placeholder pixel that
  // doesn't match what they see anywhere else. safeLogoUrl also rejects
  // anything that isn't actually shaped like a data:image/...;base64,...
  // string, since this is stored exactly as submitted via a raw API call.
  const icon = safeLogoUrl(tenant.logo_data_url) || '/logo.png';
  // Read the real MIME off the data: URL rather than assuming — a
  // mismatched "type" makes some browsers silently drop the icon.
  const mimeMatch = icon.match(/^data:(image\/[a-z]+);base64,/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const manifest = {
    name: tenant.brand_name,
    short_name: tenant.brand_name.slice(0, 20),
    description: tenant.hero_subtitle,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: tenant.color_primary || '#FF3D8A',
    // "any" only, not "maskable" — a maskable icon needs safe-zone padding
    // the agency's uploaded logo almost certainly doesn't have, and
    // claiming it anyway just gets it cropped badly on Android.
    icons: [
      { src: icon, sizes: '192x192', type: mime, purpose: 'any' },
      { src: icon, sizes: '512x512', type: mime, purpose: 'any' },
    ],
  };
  return JSON.stringify(manifest);
}

// Minimal service worker — its only job is to satisfy the "has a fetch
// handler" installability requirement most browsers (Chrome/Android in
// particular) check before offering the native install prompt. No caching
// strategy: a stale-cached salon site (wrong hours/prices) would be worse
// than no offline support at all for this product.
export function renderServiceWorker(): string {
  return `self.addEventListener('fetch', function() {});`;
}

// Injected into every tenant site. Handles both installable platforms:
// - Chrome/Android/Edge: capture beforeinstallprompt, show our own button,
//   call prompt() on click (native browsers hide their own mini-infobar
//   once preventDefault() runs, so we're not stacking two prompts).
// - iOS Safari: has no install API at all, so this shows manual
//   "Zdieľať → Pridať na plochu" instructions instead — the standard
//   workaround since Apple never shipped beforeinstallprompt.
// Dismissal is remembered per device (localStorage) so it never nags on
// every visit.
export function renderInstallPromptScript(brand: string): string {
  return `
  <div id="pwa-install-banner" class="pwa-install-banner">
    <div class="pwa-install-text">
      <strong>${brand}</strong>
      <span id="pwa-install-msg">Pridajte si túto stránku na plochu telefónu ako appku.</span>
    </div>
    <div class="pwa-install-actions">
      <button id="pwa-install-btn" style="display:none;">Nainštalovať</button>
      <button id="pwa-install-dismiss" class="pwa-install-dismiss">×</button>
    </div>
  </div>
  <script>
  (function() {
    var KEY = 'pwa_install_dismissed';
    var banner = document.getElementById('pwa-install-banner');
    var installBtn = document.getElementById('pwa-install-btn');
    var dismissBtn = document.getElementById('pwa-install-dismiss');
    var msg = document.getElementById('pwa-install-msg');
    var deferredPrompt = null;

    function dismissed() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
    function setDismissed() { try { localStorage.setItem(KEY, '1'); } catch (e) {} }

    var isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    var isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

    if (isStandalone || dismissed()) {
      // already installed, or user closed the banner before — stay quiet
    } else if (isIOS) {
      msg.textContent = 'Pridajte si túto stránku na plochu: klepnite na ikonu Zdieľať (□↑) a potom "Pridať na plochu".';
      banner.classList.add('show');
    } else {
      window.addEventListener('beforeinstallprompt', function(e) {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.style.display = 'inline-block';
        banner.classList.add('show');
      });
      window.addEventListener('appinstalled', function() { banner.classList.remove('show'); setDismissed(); });
    }

    installBtn.addEventListener('click', function() {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(function() { deferredPrompt = null; banner.classList.remove('show'); });
    });
    dismissBtn.addEventListener('click', function() { banner.classList.remove('show'); setDismissed(); });
  })();
  </script>`;
}

export const PWA_STYLE = `
  .pwa-install-banner { position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 998; background: #fff; border-radius: 14px; box-shadow: 0 8px 28px rgba(0,0,0,.18); padding: 14px 16px; display: none; align-items: center; justify-content: space-between; gap: 12px; max-width: 480px; margin: 0 auto; }
  .pwa-install-banner.show { display: flex; }
  .pwa-install-text { font-size: .85rem; line-height: 1.4; }
  .pwa-install-text strong { display: block; margin-bottom: 2px; }
  .pwa-install-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .pwa-install-actions button#pwa-install-btn { background: var(--primary); color: #fff; border: none; padding: 8px 16px; border-radius: 999px; font-weight: 600; font-size: .85rem; cursor: pointer; }
  .pwa-install-dismiss { background: transparent; border: none; font-size: 1.2rem; color: #999; cursor: pointer; line-height: 1; padding: 4px; }
`;
