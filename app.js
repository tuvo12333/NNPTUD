const API_BASE = 'https://api.escuelajs.co/api/v1';
let products = [];
let categories = [];
let state = {
  page: 1,
  pageSize: 10,
  search: '',
  sortBy: null, // 'title' or 'price'
  sortDir: 1, // 1 asc, -1 desc
};

// Utils
function el(id) { return document.getElementById(id); }

function fetchAll() {
  return fetch(`${API_BASE}/products`).then(r => r.json());
}
function fetchCategories() {
  return fetch(`${API_BASE}/categories`).then(r => r.json());
}

// Init
(async function init(){
  products = await fetchAll();
  categories = await fetchCategories();
  populateCategorySelects();
  setupListeners();
  render();
})();

function populateCategorySelects(){
  const fill = (sel) => {
    sel.innerHTML = '';
    categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      sel.appendChild(opt);
    });
  }
  fill(el('createCategory'));
  fill(el('detailCategory'));
}

function setupListeners(){
  el('searchInput').addEventListener('input', (e)=>{
    state.search = e.target.value.trim().toLowerCase();
    state.page = 1;
    render();
  });
  el('pageSize').addEventListener('change', (e)=>{
    state.pageSize = Number(e.target.value);
    state.page = 1;
    render();
  });
  el('sortTitle').addEventListener('click', ()=> toggleSort('title'));
  el('sortPrice').addEventListener('click', ()=> toggleSort('price'));
  el('exportCsv').addEventListener('click', exportCsv);
  el('createBtn').addEventListener('click', ()=> new bootstrap.Modal(el('createModal')).show());
  el('doCreate').addEventListener('click', doCreate);
  el('saveDetail').addEventListener('click', doSaveDetail);
}

function toggleSort(by){
  if(state.sortBy === by) state.sortDir *= -1;
  else { state.sortBy = by; state.sortDir = 1; }
  render();
}

function getFilteredSorted(){
  let arr = products.slice();
  if(state.search){
    arr = arr.filter(p => (p.title || '').toLowerCase().includes(state.search));
  }
  if(state.sortBy){
    arr.sort((a,b)=>{
      let A = a[state.sortBy], B = b[state.sortBy];
      if(typeof A === 'string') A = A.toLowerCase();
      if(typeof B === 'string') B = B.toLowerCase();
      if(A < B) return -1 * state.sortDir;
      if(A > B) return 1 * state.sortDir;
      return 0;
    });
  }
  return arr;
}

function render(){
  const all = getFilteredSorted();
  const total = all.length;
  const pageSize = state.pageSize;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if(state.page > pages) state.page = pages;
  const start = (state.page -1) * pageSize;
  const pageData = all.slice(start, start + pageSize);

  const tbody = el('tableBody'); tbody.innerHTML = '';
  pageData.forEach(p => {
    const tr = document.createElement('tr');
    tr.dataset.desc = p.description || '';
    tr.title = p.description || '';
    tr.innerHTML = `
      <td>${p.id}</td>
      <td><img src="${(p.images && p.images[0])||''}" class="img-thumb rounded"/></td>
      <td>${escapeHtml(p.title||'')}</td>
      <td>${p.price}</td>
      <td>${(p.category && p.category.name) || ''}</td>
    `;
    tr.addEventListener('click', ()=> openDetail(p));
    tbody.appendChild(tr);
  });

  renderPagination(pages);
}

function renderPagination(pages){
  const ul = el('pagination'); ul.innerHTML = '';
  const makePage = (n, active)=>{
    const li = document.createElement('li');
    li.className = 'page-item' + (active ? ' active' : '');
    const a = document.createElement('a');
    a.className = 'page-link';
    a.href = '#'; a.textContent = n;
    a.addEventListener('click', (e)=>{ e.preventDefault(); state.page = n; render(); });
    li.appendChild(a); return li;
  }
  // Prev
  const prev = document.createElement('li'); prev.className = 'page-item' + (state.page===1 ? ' disabled' : '');
  prev.innerHTML = `<a class="page-link" href="#">Previous</a>`;
  prev.querySelector('a').addEventListener('click', (e)=>{ e.preventDefault(); if(state.page>1){ state.page--; render();}});
  ul.appendChild(prev);

  for(let i=1;i<=pages;i++) ul.appendChild(makePage(i, state.page===i));

  const next = document.createElement('li'); next.className = 'page-item' + (state.page===pages ? ' disabled' : '');
  next.innerHTML = `<a class="page-link" href="#">Next</a>`;
  next.querySelector('a').addEventListener('click',(e)=>{ e.preventDefault(); if(state.page<pages){ state.page++; render();}});
  ul.appendChild(next);
}

function openDetail(product){
  el('detailId').value = product.id;
  el('detailTitle').value = product.title || '';
  el('detailPrice').value = product.price || 0;
  el('detailCategory').value = (product.category && product.category.id) || '';
  el('detailImages').value = (product.images || []).join(',');
  el('detailDescription').value = product.description || '';
  new bootstrap.Modal(el('detailModal')).show();
}

async function doSaveDetail(){
  const id = el('detailId').value;
  const body = {
    title: el('detailTitle').value,
    price: Number(el('detailPrice').value),
    description: el('detailDescription').value,
    categoryId: Number(el('detailCategory').value),
    images: el('detailImages').value.split(',').map(s=>s.trim()).filter(Boolean)
  };
  try{
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body)
    });
    if(!res.ok) throw new Error('Update failed');
    const updated = await res.json();
    // update local copy
    const idx = products.findIndex(p=>p.id==updated.id);
    if(idx>=0) products[idx] = updated;
    else products.unshift(updated);
    render();
    bootstrap.Modal.getInstance(el('detailModal')).hide();
    alert('Updated thành công');
  }catch(err){ alert('Update error: '+err.message); }
}

async function doCreate(){
  const body = {
    title: el('createTitle').value,
    price: Number(el('createPrice').value),
    description: el('createDescription').value,
    categoryId: Number(el('createCategory').value),
    images: el('createImages').value.split(',').map(s=>s.trim()).filter(Boolean)
  };
  try{
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)
    });
    if(!res.ok) throw new Error('Create failed');
    const created = await res.json();
    products.unshift(created);
    render();
    bootstrap.Modal.getInstance(el('createModal')).hide();
    el('createForm').reset();
    alert('Created thành công');
  }catch(err){ alert('Create error: '+err.message); }
}

function escapeHtml(text){
  if(!text) return '';
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function exportCsv(){
  const all = getFilteredSorted();
  const start = (state.page-1)*state.pageSize;
  const pageData = all.slice(start, start + state.pageSize);
  const rows = [ ['id','title','price','category','images','description'] ];
  pageData.forEach(p=>{
    rows.push([
      p.id,
      `"${(p.title||'').replace(/"/g,'""')}"`,
      p.price,
      `"${((p.category&&p.category.name)||'').replace(/"/g,'""')}"`,
      `"${(p.images||[]).join(';').replace(/"/g,'""')}"`,
      `"${(p.description||'').replace(/"/g,'""')}"`
    ]);
  });
  const csv = rows.map(r=>r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `products_page${state.page}.csv`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

