/**
 * EXAMPLE: Replacing localStorage-based Inventory (BrandRates) functions
 * with calls to the new Node + MongoDB backend.
 *
 * In aims_v14__3_.html, find the functions below and replace them with
 * these versions. They keep the SAME function names/signatures so nothing
 * else in the file needs to change — only the internals swap from
 * "DB.brandRates.push/find/filter + saveDB()" to AimsAPI.inventory calls.
 *
 * NOTE: These are now async. renderRates() etc. become async too, which is
 * fine since they're called from event handlers (onclick, oninput) that
 * don't need to wait for them.
 */

// Cache of inventory items pulled from the API, refreshed by loadInventory()
let INV_CACHE = [];

async function loadInventory() {
  const res = await AimsAPI.inventory.list();
  INV_CACHE = res.data.map(item => ({
    id: item._id,
    name: item.name,
    shop: item.shop,
    cat: item.cat,
    bot: item.bot,
    half: item.half,
    nips: item.nips,
    updated: (item.updatedAt || '').split('T')[0],
  }));
  return INV_CACHE;
}

// Replaces: function renderRates(){ ... DB.brandRates.filter(...) ... }
async function renderRates() {
  await loadInventory(); // refresh cache from server

  const shopF = document.getElementById('rate-shop-filter').value;
  const search = (document.getElementById('rate-search').value || '').toLowerCase();
  let data = INV_CACHE.filter(r =>
    (shopF === 'all' || r.shop === shopF) &&
    (!search || r.name.toLowerCase().includes(search))
  );

  const catColors = { whisky: 'var(--gold)', rum: 'var(--orange)', beer: 'var(--teal)', gin: 'var(--purple)', vodka: 'var(--pink)', desi: 'var(--blue)', other: 'var(--muted)' };
  const tb = document.getElementById('rates-tb');
  tb.innerHTML = data.map(r => `
    <tr>
      <td style="font-weight:600">${r.name}</td>
      <td><span class="badge in">${r.shop}</span></td>
      <td><span class="amt">₹${(r.bot || 0).toLocaleString()}</span></td>
      <td><span class="amt ${r.half ? '' : 'z'}">${r.half ? '₹' + r.half : '—'}</span></td>
      <td><span class="amt ${r.nips ? '' : 'z'}">${r.nips ? '₹' + r.nips : '—'}</span></td>
      <td><span class="badge" style="background:rgba(212,163,64,.08);color:${catColors[r.cat] || 'var(--muted)'}">${r.cat}</span></td>
      <td style="font-size:.7rem;color:var(--muted);font-family:var(--fm)">${r.updated || '—'}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="icon-btn" onclick="openEditBrandModal('${r.id}')">✎ Edit</button>
          <button class="icon-btn" style="border-color:rgba(240,90,90,.3);color:var(--red)" onclick="deleteBrandRate('${r.id}')">✕</button>
        </div>
      </td>
    </tr>`).join('') || `<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--muted)">Koi brand nahi — "+ Add New Brand" se add karein</td></tr>`;
  document.getElementById('rates-cnt').textContent = `${data.length} brands`;
}

// Replaces: function saveBrandRate(){ ... DB.brandRates.push(entry); saveDB(); ... }
async function saveBrandRate() {
  const editId = document.getElementById('bm-edit-id').value;
  const name = document.getElementById('bm-name').value.trim();
  if (!name) { showToast('Brand name daalo!', 'err'); return; }

  const payload = {
    name,
    shop: document.getElementById('bm-shop').value,
    cat: document.getElementById('bm-cat').value,
    bot: parseInt(document.getElementById('bm-bot').value) || 0,
    half: parseInt(document.getElementById('bm-half').value) || 0,
    nips: parseInt(document.getElementById('bm-nips').value) || 0,
  };

  try {
    if (editId) {
      await AimsAPI.inventory.update(editId, payload);
    } else {
      await AimsAPI.inventory.create(payload);
    }
    await renderRates();
    closeModal('brand-modal');
    showToast(`${editId ? 'Updated' : 'Added'}: ${name} (₹${payload.bot} / ₹${payload.half} / ₹${payload.nips})`);
  } catch (e) {
    showToast(e.message || 'Save failed', 'err');
  }
}

// Replaces: function deleteBrandRate(id){ ... DB.brandRates=DB.brandRates.filter(...); saveDB(); ... }
async function deleteBrandRate(id) {
  const r = INV_CACHE.find(x => x.id === id);
  if (!confirm(`"${r?.name}" delete karein?`)) return;
  try {
    await AimsAPI.inventory.remove(id);
    await renderRates();
    showToast('Brand deleted');
  } catch (e) {
    showToast(e.message || 'Delete failed', 'err');
  }
}

// Replaces: function inlineEditRate / commitRate (single-field pencil edit)
async function commitRate(id, field, val) {
  const payload = { [field]: parseInt(val) || 0 };
  try {
    await AimsAPI.inventory.update(id, payload);
    await renderRates();
    const r = INV_CACHE.find(x => x.id === id);
    showToast(`${r?.name || ''} ${field} rate updated`);
  } catch (e) {
    showToast(e.message || 'Update failed', 'err');
  }
}
