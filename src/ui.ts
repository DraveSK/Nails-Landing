// Both admin surfaces are plain server-rendered HTML + vanilla JS (no
// build step) — this product is positioned as the lightweight, cheap
// alternative to the main Nail-Core React/Vite admin, so it stays that way
// on purpose.

const SHARED_STYLE = `
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', sans-serif; background: #f6f5fa; margin: 0; color: #222; }
  .bar { background: #1f1f2e; color: #fff; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
  .bar b { font-size: 1.1rem; }
  .bar button { background: transparent; border: 1px solid #555; color: #fff; padding: 6px 14px; border-radius: 6px; cursor: pointer; }
  .wrap { max-width: 900px; margin: 30px auto; padding: 0 20px; }
  .card { background: #fff; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,.05); }
  .card h2 { margin-top: 0; font-size: 1.15rem; }
  label { display: block; font-size: .85rem; color: #555; margin: 12px 0 4px; }
  input, textarea { width: 100%; padding: 9px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: .95rem; }
  textarea { min-height: 60px; }
  button.primary { background: #FF3D8A; color: #fff; border: none; padding: 10px 22px; border-radius: 8px; cursor: pointer; font-weight: 600; margin-top: 14px; }
  button.secondary { background: #eee; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; margin-left: 8px; }
  button.danger { background: #ffe1e1; color: #b30000; border: none; padding: 6px 12px; border-radius: 8px; cursor: pointer; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  td, th { padding: 8px 6px; border-bottom: 1px solid #eee; text-align: left; font-size: .9rem; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .msg { padding: 10px 14px; border-radius: 8px; margin-bottom: 14px; font-size: .9rem; }
  .msg.ok { background: #e3f7e9; color: #1a7a3a; }
  .msg.err { background: #fde4e4; color: #a30000; }
  .login-box { max-width: 360px; margin: 90px auto; }
`;

export function loginPage(title: string, loginEndpoint: string, afterLoginKey: string, appPath: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title><style>${SHARED_STYLE}</style></head><body>
  <div class="login-box card">
    <h2>${title}</h2>
    <div id="msg"></div>
    <label>Heslo</label>
    <input type="password" id="pw" placeholder="Heslo">
    <button class="primary" onclick="login()" style="width:100%">Prihlásiť sa</button>
  </div>
  <script>
    if (localStorage.getItem('${afterLoginKey}')) location.href = '${appPath}';
    async function login() {
      const res = await fetch('${loginEndpoint}', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ password: document.getElementById('pw').value }) });
      const data = await res.json();
      if (data.success) { localStorage.setItem('${afterLoginKey}', data.token); location.href = '${appPath}'; }
      else document.getElementById('msg').innerHTML = '<div class="msg err">' + (data.message || 'Nesprávne heslo') + '</div>';
    }
    document.getElementById('pw').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
  </script></body></html>`;
}

export function tenantAdminPage(): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin</title><style>${SHARED_STYLE}</style></head><body>
  <div class="bar"><b>Admin — nastavenia stránky</b><button onclick="logout()">Odhlásiť</button></div>
  <div class="wrap">
    <div id="msg"></div>

    <div class="card">
      <h2>Vzhľad a hlavička</h2>
      <label>Názov salónu</label><input id="brand_name">
      <div class="row">
        <div><label>Primárna farba</label><input id="color_primary" type="color"></div>
        <div><label>Sekundárna farba</label><input id="color_secondary" type="color"></div>
      </div>
      <label>Logo</label><input id="logo_file" type="file" accept="image/*">
      <img id="logo_preview" style="max-width:80px;max-height:80px;border-radius:50%;margin-top:8px;display:none;">
      <label>Krátky text nad nadpisom (eyebrow)</label><input id="eyebrow_text">
      <label>Hlavný nadpis</label><input id="hero_title">
      <label>Podnadpis</label><textarea id="hero_subtitle"></textarea>
      <button class="primary" onclick="saveTenant()">Uložiť</button>
    </div>

    <div class="card">
      <h2>Kontakt a pätička</h2>
      <div class="row">
        <div><label>Adresa</label><input id="address"></div>
        <div><label>Telefón</label><input id="phone"></div>
      </div>
      <div class="row">
        <div><label>WhatsApp číslo (len číslice)</label><input id="whatsapp_number"></div>
        <div><label>Email</label><input id="email"></div>
      </div>
      <div class="row">
        <div><label>Facebook URL</label><input id="facebook_url"></div>
        <div><label>Instagram URL</label><input id="instagram_url"></div>
      </div>
      <label>Calendly URL (rezervácie)</label><input id="calendly_url">
      <div class="row">
        <div><label>Po–Pia hodiny</label><input id="hours_weekday"></div>
        <div><label>Sobota hodiny</label><input id="hours_saturday"></div>
      </div>
      <label>Nedeľa hodiny</label><input id="hours_sunday">
      <button class="primary" onclick="saveTenant()">Uložiť</button>
    </div>

    <div class="card">
      <h2>Cenník služieb</h2>
      <table id="svc_table"><thead><tr><th>Ikona</th><th>Názov</th><th>Cena</th><th></th></tr></thead><tbody></tbody></table>
      <div class="row" style="margin-top:14px;">
        <div><label>Ikona (emoji)</label><input id="new_icon" value="💅"></div>
        <div><label>Názov</label><input id="new_name"></div>
      </div>
      <label>Cena</label><input id="new_price" placeholder="napr. od 25€">
      <button class="primary" onclick="addService()">Pridať službu</button>
    </div>
  </div>

  <script>
    const token = localStorage.getItem('tenant_token');
    if (!token) location.href = '/admin';
    let tenant = null, services = [];

    function authHeaders() { return { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }; }
    function showMsg(text, ok) { document.getElementById('msg').innerHTML = '<div class="msg ' + (ok ? 'ok' : 'err') + '">' + text + '</div>'; setTimeout(() => document.getElementById('msg').innerHTML = '', 3000); }
    function logout() { localStorage.removeItem('tenant_token'); location.href = '/admin'; }

    async function load() {
      const res = await fetch('/admin/api/me', { headers: authHeaders() });
      if (res.status === 401) { logout(); return; }
      const data = await res.json();
      tenant = data.tenant; services = data.services;
      for (const k of ['brand_name','color_primary','color_secondary','eyebrow_text','hero_title','hero_subtitle','address','phone','whatsapp_number','email','facebook_url','instagram_url','calendly_url','hours_weekday','hours_saturday','hours_sunday']) {
        const el = document.getElementById(k); if (el) el.value = tenant[k] || '';
      }
      if (tenant.logo_data_url) { document.getElementById('logo_preview').src = tenant.logo_data_url; document.getElementById('logo_preview').style.display = 'block'; }
      renderServices();
    }

    function renderServices() {
      const tbody = document.querySelector('#svc_table tbody');
      tbody.innerHTML = services.map(s => \`<tr>
        <td>\${s.icon}</td><td>\${s.name}</td><td>\${s.price}</td>
        <td><button class="danger" onclick="deleteService('\${s.id}')">Zmazať</button></td>
      </tr>\`).join('');
    }

    async function saveTenant() {
      const fields = {};
      for (const k of ['brand_name','color_primary','color_secondary','eyebrow_text','hero_title','hero_subtitle','address','phone','whatsapp_number','email','facebook_url','instagram_url','calendly_url','hours_weekday','hours_saturday','hours_sunday']) {
        fields[k] = document.getElementById(k).value;
      }
      const res = await fetch('/admin/api/tenant', { method: 'PUT', headers: authHeaders(), body: JSON.stringify(fields) });
      const data = await res.json();
      showMsg(data.success ? 'Uložené ✅' : (data.message || 'Chyba'), data.success);
    }

    document.getElementById('logo_file').addEventListener('change', async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const res = await fetch('/admin/api/tenant', { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ logo_data_url: reader.result }) });
        const data = await res.json();
        if (data.success) { document.getElementById('logo_preview').src = reader.result; document.getElementById('logo_preview').style.display = 'block'; showMsg('Logo uložené ✅', true); }
      };
      reader.readAsDataURL(file);
    });

    async function addService() {
      const name = document.getElementById('new_name').value.trim();
      const price = document.getElementById('new_price').value.trim();
      const icon = document.getElementById('new_icon').value.trim() || '💅';
      if (!name || !price) { showMsg('Vyplňte názov a cenu', false); return; }
      const res = await fetch('/admin/api/services', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ name, price, icon }) });
      const data = await res.json();
      if (data.success) { services.push(data.service); renderServices(); document.getElementById('new_name').value = ''; document.getElementById('new_price').value = ''; }
    }

    async function deleteService(id) {
      const res = await fetch('/admin/api/services/' + id, { method: 'DELETE', headers: authHeaders() });
      const data = await res.json();
      if (data.success) { services = services.filter(s => s.id !== id); renderServices(); }
    }

    load();
  </script></body></html>`;
}

export function superAdminPage(): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Super Admin</title><style>${SHARED_STYLE}</style></head><body>
  <div class="bar"><b>Super Admin — správa agentúr</b><button onclick="logout()">Odhlásiť</button></div>
  <div class="wrap">
    <div id="msg"></div>
    <div class="card">
      <h2>Nová agentúra</h2>
      <div class="row">
        <div><label>Slug (subdoména, napr. "linh")</label><input id="new_slug" placeholder="linh"></div>
        <div><label>Názov salónu</label><input id="new_brand"></div>
      </div>
      <label>Heslo pre ich /admin</label><input id="new_password" type="text">
      <button class="primary" onclick="createTenant()">Vytvoriť (nasadiť okamžite)</button>
    </div>
    <div class="card">
      <h2>Agentúry</h2>
      <table id="tenants_table"><thead><tr><th>Slug</th><th>Názov</th><th>Aktívna</th><th></th></tr></thead><tbody></tbody></table>
    </div>
  </div>
  <script>
    const token = localStorage.getItem('super_token');
    if (!token) location.href = '/super-admin';
    function authHeaders() { return { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }; }
    function showMsg(text, ok) { document.getElementById('msg').innerHTML = '<div class="msg ' + (ok?'ok':'err') + '">' + text + '</div>'; setTimeout(() => document.getElementById('msg').innerHTML = '', 3000); }
    function logout() { localStorage.removeItem('super_token'); location.href = '/super-admin'; }

    async function load() {
      const res = await fetch('/super-admin/api/tenants', { headers: authHeaders() });
      if (res.status === 401) { logout(); return; }
      const data = await res.json();
      const tbody = document.querySelector('#tenants_table tbody');
      tbody.innerHTML = data.tenants.map(t => \`<tr>
        <td>\${t.slug}.nails.drave.sk</td><td>\${t.brand_name}</td>
        <td>\${t.active ? '✅' : '⏸️'}</td>
        <td><button class="secondary" onclick="toggleActive('\${t.id}', \${t.active ? 0 : 1})">\${t.active ? 'Pozastaviť' : 'Aktivovať'}</button></td>
      </tr>\`).join('');
    }

    async function createTenant() {
      const slug = document.getElementById('new_slug').value.trim().toLowerCase();
      const brand_name = document.getElementById('new_brand').value.trim();
      const password = document.getElementById('new_password').value;
      if (!slug || !brand_name || !password) { showMsg('Vyplňte všetky polia', false); return; }
      const res = await fetch('/super-admin/api/tenants', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ slug, brand_name, password }) });
      const data = await res.json();
      if (data.success) { showMsg('Vytvorené — beží na ' + slug + '.nails.drave.sk ✅', true); load(); }
      else showMsg(data.message || 'Chyba', false);
    }

    async function toggleActive(id, active) {
      const res = await fetch('/super-admin/api/tenants/' + id, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ active }) });
      const data = await res.json();
      if (data.success) load();
    }

    load();
  </script></body></html>`;
}
