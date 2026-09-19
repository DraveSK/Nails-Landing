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
    <label>Mật khẩu</label>
    <input type="password" id="pw" placeholder="Mật khẩu">
    <button class="primary" onclick="login()" style="width:100%">Đăng nhập</button>
  </div>
  <script>
    if (localStorage.getItem('${afterLoginKey}')) location.href = '${appPath}';
    async function login() {
      const res = await fetch('${loginEndpoint}', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ password: document.getElementById('pw').value }) });
      const data = await res.json();
      if (data.success) { localStorage.setItem('${afterLoginKey}', data.token); location.href = '${appPath}'; }
      else document.getElementById('msg').innerHTML = '<div class="msg err">' + (data.message || 'Sai mật khẩu') + '</div>';
    }
    document.getElementById('pw').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
  </script></body></html>`;
}

export function tenantAdminPage(): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin</title><style>${SHARED_STYLE}</style></head><body>
  <div class="bar"><b>Admin — Quản lý trang</b><button onclick="logout()">Đăng xuất</button></div>
  <div class="wrap">
    <div id="msg"></div>

    <div class="card">
      <h2>Giao diện và tiêu đề</h2>
      <label>Tên salon</label><input id="brand_name">
      <div class="row">
        <div><label>Màu chính</label><input id="color_primary" type="color"></div>
        <div><label>Màu phụ</label><input id="color_secondary" type="color"></div>
      </div>
      <label>Logo</label><input id="logo_file" type="file" accept="image/*">
      <img id="logo_preview" style="max-width:80px;max-height:80px;border-radius:50%;margin-top:8px;display:none;">
      <label>Dòng chữ nhỏ phía trên tiêu đề (eyebrow)</label><input id="eyebrow_text">
      <label>Tiêu đề chính</label><input id="hero_title">
      <label>Mô tả ngắn</label><textarea id="hero_subtitle"></textarea>
      <button class="primary" onclick="saveTenant()">Lưu</button>
    </div>

    <div class="card">
      <h2>Liên hệ và chân trang</h2>
      <div class="row">
        <div><label>Địa chỉ</label><input id="address"></div>
        <div><label>Điện thoại</label><input id="phone"></div>
      </div>
      <div class="row">
        <div><label>Số WhatsApp (chỉ số)</label><input id="whatsapp_number"></div>
        <div><label>Email</label><input id="email"></div>
      </div>
      <div class="row">
        <div><label>Facebook URL</label><input id="facebook_url"></div>
        <div><label>Instagram URL</label><input id="instagram_url"></div>
      </div>
      <label>Calendly URL (đặt lịch)</label><input id="calendly_url">
      <div class="row">
        <div><label>Giờ Thứ 2 – Thứ 6</label><input id="hours_weekday"></div>
        <div><label>Giờ Thứ 7</label><input id="hours_saturday"></div>
      </div>
      <label>Giờ Chủ nhật</label><input id="hours_sunday">
      <button class="primary" onclick="saveTenant()">Lưu</button>
    </div>

    <div class="card">
      <h2>Album ảnh (nội thất, sản phẩm)</h2>
      <p style="font-size:.85rem;color:#666;margin-bottom:10px;">Ảnh sẽ hiển thị trên trang dưới dạng cuốn sách để khách lật xem. Ảnh tải lên sẽ tự động được nén nhỏ lại.</p>
      <input id="gallery_file" type="file" accept="image/*" multiple>
      <div id="gallery_grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:10px;margin-top:14px;"></div>
    </div>

    <div class="card">
      <h2>Bảng giá dịch vụ</h2>
      <table id="svc_table"><thead><tr><th>Icon</th><th>Tên</th><th>Giá</th><th></th></tr></thead><tbody></tbody></table>
      <div class="row" style="margin-top:14px;">
        <div><label>Icon (emoji)</label><input id="new_icon" value="💅"></div>
        <div><label>Tên dịch vụ</label><input id="new_name"></div>
      </div>
      <label>Giá</label><input id="new_price" placeholder="vd: từ 25€">
      <label>Mô tả ngắn (hiện dưới tên dịch vụ)</label><input id="new_desc" placeholder="vd: Bền đẹp, giữ được 4 tuần">
      <button class="primary" onclick="addService()">Thêm dịch vụ</button>
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

    let editingServiceId = null;

    function renderServices() {
      const tbody = document.querySelector('#svc_table tbody');
      tbody.innerHTML = services.map(s => {
        if (s.id === editingServiceId) {
          return \`<tr>
            <td><input id="edit_icon" value="\${s.icon}" style="width:50px;"></td>
            <td><input id="edit_name" value="\${s.name}"><br><input id="edit_desc" value="\${s.description || ''}" placeholder="Mô tả ngắn" style="margin-top:4px;"></td>
            <td><input id="edit_price" value="\${s.price}" style="width:80px;"></td>
            <td>
              <button class="primary" style="padding:6px 12px;margin-top:0;" onclick="saveService('\${s.id}')">Lưu</button>
              <button class="secondary" onclick="cancelEditService()">Hủy</button>
            </td>
          </tr>\`;
        }
        return \`<tr>
          <td>\${s.icon}</td><td>\${s.name}<br><span style="color:#888;font-size:.8rem;">\${s.description || ''}</span></td><td>\${s.price}</td>
          <td>
            <button class="secondary" onclick="editService('\${s.id}')">Sửa</button>
            <button class="danger" onclick="deleteService('\${s.id}')">Xóa</button>
          </td>
        </tr>\`;
      }).join('');
    }

    function editService(id) { editingServiceId = id; renderServices(); }
    function cancelEditService() { editingServiceId = null; renderServices(); }

    async function saveService(id) {
      const name = document.getElementById('edit_name').value.trim();
      const price = document.getElementById('edit_price').value.trim();
      const icon = document.getElementById('edit_icon').value.trim() || '💅';
      const description = document.getElementById('edit_desc').value.trim();
      if (!name || !price) { showMsg('Vui lòng điền tên và giá', false); return; }
      const res = await fetch('/admin/api/services/' + id, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ name, price, icon, description }) });
      const data = await res.json();
      if (data.success) {
        const s = services.find(x => x.id === id);
        Object.assign(s, { name, price, icon, description });
        editingServiceId = null;
        renderServices();
        showMsg('Đã lưu ✅', true);
      } else showMsg(data.message || 'Có lỗi xảy ra', false);
    }

    async function saveTenant() {
      const fields = {};
      for (const k of ['brand_name','color_primary','color_secondary','eyebrow_text','hero_title','hero_subtitle','address','phone','whatsapp_number','email','facebook_url','instagram_url','calendly_url','hours_weekday','hours_saturday','hours_sunday']) {
        fields[k] = document.getElementById(k).value;
      }
      const res = await fetch('/admin/api/tenant', { method: 'PUT', headers: authHeaders(), body: JSON.stringify(fields) });
      const data = await res.json();
      showMsg(data.success ? 'Đã lưu ✅' : (data.message || 'Có lỗi xảy ra'), data.success);
    }

    document.getElementById('logo_file').addEventListener('change', async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const res = await fetch('/admin/api/tenant', { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ logo_data_url: reader.result }) });
        const data = await res.json();
        if (data.success) { document.getElementById('logo_preview').src = reader.result; document.getElementById('logo_preview').style.display = 'block'; showMsg('Đã lưu logo ✅', true); }
      };
      reader.readAsDataURL(file);
    });

    async function addService() {
      const name = document.getElementById('new_name').value.trim();
      const price = document.getElementById('new_price').value.trim();
      const icon = document.getElementById('new_icon').value.trim() || '💅';
      const description = document.getElementById('new_desc').value.trim();
      if (!name || !price) { showMsg('Vui lòng điền tên và giá', false); return; }
      const res = await fetch('/admin/api/services', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ name, price, icon, description }) });
      const data = await res.json();
      if (data.success) { services.push(data.service); renderServices(); document.getElementById('new_name').value = ''; document.getElementById('new_price').value = ''; document.getElementById('new_desc').value = ''; }
    }

    async function deleteService(id) {
      const res = await fetch('/admin/api/services/' + id, { method: 'DELETE', headers: authHeaders() });
      const data = await res.json();
      if (data.success) { services = services.filter(s => s.id !== id); renderServices(); }
    }

    // ── Gallery ────────────────────────────────────────────────────────────
    let gallery = [];

    async function loadGallery() {
      const res = await fetch('/admin/api/gallery', { headers: authHeaders() });
      const data = await res.json();
      gallery = data.images || [];
      renderGallery();
    }

    function renderGallery() {
      const grid = document.getElementById('gallery_grid');
      grid.innerHTML = gallery.map(g => \`
        <div style="position:relative;">
          <img src="/img/\${g.r2_key}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;">
          <button class="danger" onclick="deleteImage('\${g.id}')" style="position:absolute;top:4px;right:4px;padding:2px 8px;">×</button>
        </div>\`).join('');
    }

    // iPhones save photos as HEIC/HEIF by default, which most browsers
    // (everything except Safari) can't decode into a <canvas> at all — so
    // without this, uploads from an iPhone would silently fail. Converted
    // to JPEG client-side via heic2any (loaded on demand, only when a HEIC
    // file actually shows up) before the normal resize/compress step.
    let heic2anyLoaded = null;
    function loadHeic2any() {
      if (heic2anyLoaded) return heic2anyLoaded;
      heic2anyLoaded = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
        script.onload = () => resolve(window.heic2any);
        script.onerror = reject;
        document.head.appendChild(script);
      });
      return heic2anyLoaded;
    }
    function isHeic(file) {
      const name = (file.name || '').toLowerCase();
      return /image\/heic|image\/heif/.test(file.type) || name.endsWith('.heic') || name.endsWith('.heif');
    }

    // Resize/compress client-side before upload — keeps R2 storage and
    // upload time reasonable regardless of the original photo's size
    // (phone camera photos are often 4000px+/several MB).
    function compressImage(file) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        reader.onload = () => { img.onload = () => {
          const maxDim = 1600;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const scale = maxDim / Math.max(width, height);
            width = Math.round(width * scale); height = Math.round(height * scale);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        }; img.onerror = reject; img.src = reader.result; };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    document.getElementById('gallery_file').addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      for (const file of files) {
        try {
          let sourceFile = file;
          if (isHeic(file)) {
            showMsg('Đang chuyển đổi ảnh HEIC…', true);
            const heic2any = await loadHeic2any();
            sourceFile = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
          }
          const dataUrl = await compressImage(sourceFile);
          const res = await fetch('/admin/api/gallery', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ data: dataUrl }) });
          const data = await res.json();
          if (data.success) { gallery.push(data.image); renderGallery(); }
          else showMsg(data.message || 'Lỗi khi tải ảnh lên', false);
        } catch (err) { showMsg('Lỗi khi xử lý ảnh (định dạng không hỗ trợ?)', false); }
      }
      e.target.value = '';
    });

    async function deleteImage(id) {
      const res = await fetch('/admin/api/gallery/' + id, { method: 'DELETE', headers: authHeaders() });
      const data = await res.json();
      if (data.success) { gallery = gallery.filter(g => g.id !== id); renderGallery(); }
    }

    load();
    loadGallery();
  </script></body></html>`;
}

export function superAdminLoginPage(): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Super Admin</title><style>${SHARED_STYLE}</style></head><body>
  <div class="login-box card">
    <h2>Super Admin</h2>
    <div id="msg"></div>
    <label>Mật khẩu</label>
    <input type="password" id="pw" placeholder="Mật khẩu">
    <button class="primary" onclick="login()" style="width:100%">Đăng nhập</button>
  </div>
  <script>
    if (localStorage.getItem('super_token')) location.href = '/super-admin/app';
    async function login() {
      const res = await fetch('/super-admin/api/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ password: document.getElementById('pw').value }) });
      const data = await res.json();
      if (data.success) { localStorage.setItem('super_token', data.token); location.href = '/super-admin/app'; }
      else document.getElementById('msg').innerHTML = '<div class="msg err">' + (data.message || 'Sai mật khẩu') + '</div>';
    }
    document.getElementById('pw').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
  </script></body></html>`;
}

export function superAdminPage(): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Super Admin</title><style>${SHARED_STYLE}</style></head><body>
  <div class="bar"><b>Super Admin — Quản lý đại lý</b><button onclick="logout()">Đăng xuất</button></div>
  <div class="wrap">
    <div id="msg"></div>
    <div class="card">
      <h2>Tạo đại lý mới</h2>
      <div class="row">
        <div><label>Slug (subdomain, vd: "linh")</label><input id="new_slug" placeholder="linh"></div>
        <div><label>Tên salon</label><input id="new_brand"></div>
      </div>
      <label>Mật khẩu cho /admin của họ</label><input id="new_password" type="text">
      <button class="primary" onclick="createTenant()">Tạo (chạy ngay lập tức)</button>
    </div>
    <div class="card">
      <h2>Danh sách đại lý</h2>
      <table id="tenants_table"><thead><tr><th>Slug</th><th>Tên</th><th>Trạng thái</th><th></th></tr></thead><tbody></tbody></table>
    </div>
    <div class="card">
      <h2>Đổi mật khẩu Super Admin</h2>
      <label>Mật khẩu hiện tại</label><input id="cur_pw" type="password">
      <label>Mật khẩu mới</label><input id="new_pw" type="password">
      <button class="primary" onclick="changePassword()">Đổi mật khẩu</button>
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
        <td>\${t.active ? '✅ Hoạt động' : '⏸️ Tạm dừng'}</td>
        <td><button class="secondary" onclick="toggleActive('\${t.id}', \${t.active ? 0 : 1})">\${t.active ? 'Tạm dừng' : 'Kích hoạt'}</button></td>
      </tr>\`).join('');
    }

    async function createTenant() {
      const slug = document.getElementById('new_slug').value.trim().toLowerCase();
      const brand_name = document.getElementById('new_brand').value.trim();
      const password = document.getElementById('new_password').value;
      if (!slug || !brand_name || !password) { showMsg('Vui lòng điền đầy đủ thông tin', false); return; }
      const res = await fetch('/super-admin/api/tenants', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ slug, brand_name, password }) });
      const data = await res.json();
      if (data.success) { showMsg('Đã tạo — chạy tại ' + slug + '.nails.drave.sk ✅', true); load(); }
      else showMsg(data.message || 'Có lỗi xảy ra', false);
    }

    async function changePassword() {
      const currentPassword = document.getElementById('cur_pw').value;
      const newPassword = document.getElementById('new_pw').value;
      if (!currentPassword || !newPassword) { showMsg('Vui lòng điền đầy đủ mật khẩu', false); return; }
      if (newPassword.length < 6) { showMsg('Mật khẩu mới phải có ít nhất 6 ký tự', false); return; }
      const res = await fetch('/super-admin/api/change-password', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ currentPassword, newPassword }) });
      const data = await res.json();
      if (data.success) { showMsg('Đổi mật khẩu thành công ✅', true); document.getElementById('cur_pw').value = ''; document.getElementById('new_pw').value = ''; }
      else showMsg(data.message || 'Có lỗi xảy ra', false);
    }

    async function toggleActive(id, active) {
      const res = await fetch('/super-admin/api/tenants/' + id, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ active }) });
      const data = await res.json();
      if (data.success) load();
    }

    load();
  </script></body></html>`;
}
