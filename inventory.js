/* ============================================================
   Stockly — Inventory Management (Vanilla JS)
   All data persisted in localStorage.
   ============================================================ */

const STORAGE = {
  products: "stockly.products",
  categories: "stockly.categories",
  suppliers: "stockly.suppliers",
  activity: "stockly.activity",
  settings: "stockly.settings",
};

const state = {
  products: [],
  categories: [],
  suppliers: [],
  activity: [],
  settings: { company: "Stockly", currency: "$", theme: "light" },
  view: "dashboard",
  page: 1,
  pageSize: 8,
  filters: { search: "", category: "", status: "", sort: "name-asc" },
};

/* ---------- Utilities ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const uid = () => Math.random().toString(36).slice(2, 10);
const money = (n) => `${state.settings.currency}${Number(n || 0).toFixed(2)}`;
const load = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const timeAgo = (ts) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

/* ---------- Toasts ---------- */
function toast(msg, type = "success") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  $("#toasts").appendChild(el);
  setTimeout(() => { el.classList.add("hide"); setTimeout(() => el.remove(), 300); }, 2600);
}

/* ---------- Init ---------- */
function init() {
  state.products = load(STORAGE.products, []);
  state.categories = load(STORAGE.categories, []);
  state.suppliers = load(STORAGE.suppliers, []);
  state.activity = load(STORAGE.activity, []);
  state.settings = { ...state.settings, ...load(STORAGE.settings, {}) };

  if (!state.categories.length && !state.products.length) seed();

  applyTheme(state.settings.theme);
  bindUI();
  switchView("dashboard");
  renderAll();
}

function seed() {
  state.categories = [
    { id: uid(), name: "Electronics", desc: "Devices & gadgets" },
    { id: uid(), name: "Office", desc: "Office supplies" },
    { id: uid(), name: "Furniture", desc: "Chairs, desks and more" },
  ];
  state.suppliers = [
    { id: uid(), name: "Acme Corp", contact: "Jane Doe", email: "sales@acme.co", phone: "555-1010" },
    { id: uid(), name: "Globex", contact: "Alex Kim", email: "hi@globex.io", phone: "555-2020" },
  ];
  const [cE, cO, cF] = state.categories;
  const [sA, sG] = state.suppliers;
  state.products = [
    { id: uid(), name: "Wireless Mouse", sku: "WM-001", categoryId: cE.id, supplierId: sA.id, purchase: 8, price: 19.99, qty: 42, reorder: 10, unit: "pcs", status: "active" },
    { id: uid(), name: "Mechanical Keyboard", sku: "KB-220", categoryId: cE.id, supplierId: sG.id, purchase: 42, price: 89.0, qty: 3, reorder: 5, unit: "pcs", status: "active" },
    { id: uid(), name: "Office Chair", sku: "OC-500", categoryId: cF.id, supplierId: sA.id, purchase: 90, price: 189.5, qty: 0, reorder: 3, unit: "pcs", status: "active" },
    { id: uid(), name: "A4 Paper Ream", sku: "PP-A4", categoryId: cO.id, supplierId: sG.id, purchase: 3, price: 6.5, qty: 120, reorder: 20, unit: "ream", status: "active" },
  ];
  logActivity("Seeded demo data");
  persist();
}

function persist() {
  save(STORAGE.products, state.products);
  save(STORAGE.categories, state.categories);
  save(STORAGE.suppliers, state.suppliers);
  save(STORAGE.activity, state.activity);
  save(STORAGE.settings, state.settings);
}

function logActivity(text) {
  state.activity.unshift({ id: uid(), text, ts: Date.now() });
  state.activity = state.activity.slice(0, 25);
}

/* ---------- Theme ---------- */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $("#themeToggle").textContent = theme === "dark" ? "☀" : "🌙";
}

/* ---------- View switching ---------- */
function switchView(view) {
  state.view = view;
  $$(".view").forEach((s) => (s.hidden = s.dataset.view !== view));
  $$(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.view === view));
  closeSidebar();
  renderAll();
}

/* ---------- Renderers ---------- */
function renderAll() {
  renderDashboard();
  renderProducts();
  renderCategories();
  renderSuppliers();
  renderStock();
  renderReports();
  renderSettings();
  refreshSelects();
}

function stats() {
  const total = state.products.length;
  const low = state.products.filter((p) => p.qty > 0 && p.qty <= (p.reorder || 0)).length;
  const out = state.products.filter((p) => p.qty === 0).length;
  const value = state.products.reduce((a, p) => a + Number(p.price) * Number(p.qty), 0);
  return { total, low, out, value, cats: state.categories.length };
}

function renderDashboard() {
  const s = stats();
  $("#statProducts").textContent = s.total;
  $("#statCategories").textContent = s.cats;
  $("#statLow").textContent = s.low;
  $("#statOut").textContent = s.out;
  $("#statValue").textContent = money(s.value);

  const act = $("#activityList");
  act.innerHTML = state.activity.length
    ? state.activity.slice(0, 8).map((a) => `<li><span class="dot"></span>${escapeHtml(a.text)}<span class="time">${timeAgo(a.ts)}</span></li>`).join("")
    : `<li class="empty">No activity yet</li>`;

  const low = state.products.filter((p) => p.qty <= (p.reorder || 0));
  $("#lowStockList").innerHTML = low.length
    ? low.slice(0, 8).map((p) => `<li><span class="dot" style="background:${p.qty===0?'var(--danger)':'var(--warning)'}"></span>${escapeHtml(p.name)} <span class="time">${p.qty} left</span></li>`).join("")
    : `<li class="empty">All stock levels healthy</li>`;

  $("#notifDot").hidden = low.length === 0;
}

function filteredProducts() {
  const { search, category, status, sort } = state.filters;
  let list = state.products.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) return false;
    }
    if (category && p.categoryId !== category) return false;
    if (status && p.status !== status) return false;
    return true;
  });
  const [key, dir] = sort.split("-");
  const map = { name: "name", stock: "qty", price: "price" };
  const k = map[key];
  list.sort((a, b) => {
    const av = a[k], bv = b[k];
    if (typeof av === "string") return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    return dir === "asc" ? av - bv : bv - av;
  });
  return list;
}

function renderProducts() {
  const tbody = $("#productsTable tbody");
  const list = filteredProducts();
  const totalPages = Math.max(1, Math.ceil(list.length / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;
  const start = (state.page - 1) * state.pageSize;
  const pageItems = list.slice(start, start + state.pageSize);

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty">No products match your filters</div></td></tr>`;
  } else {
    tbody.innerHTML = pageItems.map((p) => {
      const cat = state.categories.find((c) => c.id === p.categoryId);
      const sup = state.suppliers.find((s) => s.id === p.supplierId);
      const badge = p.qty === 0
        ? `<span class="badge badge-bad">Out of stock</span>`
        : p.qty <= (p.reorder || 0)
        ? `<span class="badge badge-warn">Low</span>`
        : `<span class="badge badge-ok">In stock</span>`;
      const statusBadge = p.status === "active"
        ? `<span class="badge badge-ok">Active</span>`
        : `<span class="badge badge-muted">Inactive</span>`;
      return `
        <tr>
          <td><strong>${escapeHtml(p.name)}</strong><div style="color:var(--muted);font-size:12px">${escapeHtml(p.unit || "")}</div></td>
          <td>${escapeHtml(p.sku)}</td>
          <td>${escapeHtml(cat?.name || "—")}</td>
          <td>${escapeHtml(sup?.name || "—")}</td>
          <td>${p.qty} ${badge}</td>
          <td>${money(p.price)}</td>
          <td>${statusBadge}</td>
          <td>
            <div class="row-actions">
              <button class="edit" data-edit="${p.id}" title="Edit">✎</button>
              <button class="del" data-del="${p.id}" title="Delete">🗑</button>
            </div>
          </td>
        </tr>`;
    }).join("");
  }

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const pag = $("#prodPagination");
  if (totalPages <= 1) { pag.innerHTML = ""; return; }
  let html = `<button ${state.page === 1 ? "disabled" : ""} data-pg="prev">‹</button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="${state.page === i ? "active" : ""}" data-pg="${i}">${i}</button>`;
  }
  html += `<button ${state.page === totalPages ? "disabled" : ""} data-pg="next">›</button>`;
  pag.innerHTML = html;
}

function renderCategories() {
  const tbody = $("#categoriesTable tbody");
  if (!state.categories.length) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty">No categories yet</div></td></tr>`;
    return;
  }
  tbody.innerHTML = state.categories.map((c) => {
    const count = state.products.filter((p) => p.categoryId === c.id).length;
    return `<tr>
      <td><strong>${escapeHtml(c.name)}</strong></td>
      <td>${escapeHtml(c.desc || "—")}</td>
      <td>${count}</td>
      <td><div class="row-actions">
        <button class="edit" data-cat-edit="${c.id}">✎</button>
        <button class="del" data-cat-del="${c.id}">🗑</button>
      </div></td>
    </tr>`;
  }).join("");
}

function renderSuppliers() {
  const tbody = $("#suppliersTable tbody");
  if (!state.suppliers.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty">No suppliers yet</div></td></tr>`;
    return;
  }
  tbody.innerHTML = state.suppliers.map((s) => `
    <tr>
      <td><strong>${escapeHtml(s.name)}</strong></td>
      <td>${escapeHtml(s.contact || "—")}</td>
      <td>${escapeHtml(s.email || "—")}</td>
      <td>${escapeHtml(s.phone || "—")}</td>
      <td><div class="row-actions">
        <button class="edit" data-sup-edit="${s.id}">✎</button>
        <button class="del" data-sup-del="${s.id}">🗑</button>
      </div></td>
    </tr>`).join("");
}

function renderStock() {
  const tbody = $("#stockTable tbody");
  if (!state.products.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty">No products yet</div></td></tr>`;
    return;
  }
  tbody.innerHTML = state.products.map((p) => {
    const badge = p.qty === 0
      ? `<span class="badge badge-bad">Out of stock</span>`
      : p.qty <= (p.reorder || 0)
      ? `<span class="badge badge-warn">Low</span>`
      : `<span class="badge badge-ok">In stock</span>`;
    return `<tr>
      <td>${escapeHtml(p.name)}</td>
      <td>${escapeHtml(p.sku)}</td>
      <td>${p.qty}</td>
      <td>${p.reorder || 0}</td>
      <td>${badge}</td>
    </tr>`;
  }).join("");
}

function renderReports() {
  const s = stats();
  $("#repTotal").textContent = s.total;
  $("#repValue").textContent = money(s.value);
  $("#repLow").textContent = s.low;
  $("#repOut").textContent = s.out;

  const low = state.products.filter((p) => p.qty > 0 && p.qty <= (p.reorder || 0));
  const out = state.products.filter((p) => p.qty === 0);
  $("#repLowList").innerHTML = low.length
    ? low.map((p) => `<li><span class="dot" style="background:var(--warning)"></span>${escapeHtml(p.name)}<span class="time">${p.qty} / ${p.reorder}</span></li>`).join("")
    : `<li class="empty">No low stock products</li>`;
  $("#repOutList").innerHTML = out.length
    ? out.map((p) => `<li><span class="dot" style="background:var(--danger)"></span>${escapeHtml(p.name)}<span class="time">0 left</span></li>`).join("")
    : `<li class="empty">Nothing out of stock</li>`;
}

function renderSettings() {
  $("#setCompany").value = state.settings.company;
  $("#setCurrency").value = state.settings.currency;
  $("#setTheme").value = state.settings.theme;
}

function refreshSelects() {
  const opts = (arr) => arr.map((x) => `<option value="${x.id}">${escapeHtml(x.name)}</option>`).join("");
  $("#prodCategory").innerHTML = `<option value="">— None —</option>` + opts(state.categories);
  $("#prodSupplier").innerHTML = `<option value="">— None —</option>` + opts(state.suppliers);
  const cur = $("#prodCategoryFilter").value;
  $("#prodCategoryFilter").innerHTML = `<option value="">All categories</option>` + opts(state.categories);
  $("#prodCategoryFilter").value = cur;
}

/* ---------- Modals ---------- */
function openModal(id) {
    document.querySelectorAll(".modal").forEach(modal => {
        modal.hidden = true;
    });

    document.getElementById(id).hidden = false;
}
function closeModal(el) { el.hidden = true; }

function openProductModal(id) {
  const isEdit = !!id;
  $("#productModalTitle").textContent = isEdit ? "Edit Product" : "Add Product";
  const p = isEdit ? state.products.find((x) => x.id === id) : null;
  $("#prodId").value = p?.id || "";
  $("#prodName").value = p?.name || "";
  $("#prodSku").value = p?.sku || "";
  $("#prodCategory").value = p?.categoryId || "";
  $("#prodSupplier").value = p?.supplierId || "";
  $("#prodPurchase").value = p?.purchase ?? "";
  $("#prodPrice").value = p?.price ?? "";
  $("#prodQty").value = p?.qty ?? "";
  $("#prodReorder").value = p?.reorder ?? 5;
  $("#prodUnit").value = p?.unit || "";
  $("#prodStatus").value = p?.status || "active";
  openModal("productModal");
}

function openCategoryModal(id) {
  const c = id ? state.categories.find((x) => x.id === id) : null;
  $("#categoryModalTitle").textContent = c ? "Edit Category" : "Add Category";
  $("#catId").value = c?.id || "";
  $("#catName").value = c?.name || "";
  $("#catDesc").value = c?.desc || "";
  openModal("categoryModal");
}

function openSupplierModal(id) {
  const s = id ? state.suppliers.find((x) => x.id === id) : null;
  $("#supplierModalTitle").textContent = s ? "Edit Supplier" : "Add Supplier";
  $("#supId").value = s?.id || "";
  $("#supName").value = s?.name || "";
  $("#supContact").value = s?.contact || "";
  $("#supEmail").value = s?.email || "";
  $("#supPhone").value = s?.phone || "";
  openModal("supplierModal");
}

function confirmDialog(title, msg, onOk) {
  $("#confirmTitle").textContent = title;
  $("#confirmMsg").textContent = msg;
  const ok = $("#confirmOk");
  const handler = () => { onOk(); closeModal($("#confirmModal")); ok.removeEventListener("click", handler); };
  ok.addEventListener("click", handler);
  openModal("confirmModal");
}

/* ---------- Sidebar mobile ---------- */
function openSidebar() { $("#sidebar").classList.add("open"); $("#backdrop").classList.add("show"); }
function closeSidebar() { $("#sidebar").classList.remove("open"); $("#backdrop").classList.remove("show"); }

/* ---------- Bind UI ---------- */
function bindUI() {
  // Sidebar nav
  $$(".nav-item").forEach((n) => n.addEventListener("click", (e) => {
    e.preventDefault();
    switchView(n.dataset.view);
  }));
  $("#menuBtn").addEventListener("click", openSidebar);
  $("#sidebarClose").addEventListener("click", closeSidebar);
  $("#backdrop").addEventListener("click", closeSidebar);

  // Theme
  $("#themeToggle").addEventListener("click", () => {
    state.settings.theme = state.settings.theme === "dark" ? "light" : "dark";
    applyTheme(state.settings.theme);
    persist();
  });

  // Profile dropdown
  $("#profile .avatar") && $(".avatar").addEventListener("click", (e) => {
    e.stopPropagation();
    $("#profileMenu").hidden = !$("#profileMenu").hidden;
  });
  document.addEventListener("click", () => ($("#profileMenu").hidden = true));
  $("#profileMenu").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.dataset.view) switchView(btn.dataset.view);
    if (btn.id === "clearAllBtn") clearAllData();
  });

  // Notif
  $("#notifBtn").addEventListener("click", () => switchView("reports"));

  // Global search jumps to products
  $("#globalSearch").addEventListener("input", (e) => {
    state.filters.search = e.target.value;
    state.page = 1;
    $("#prodSearch").value = e.target.value;
    if (state.view !== "products") switchView("products");
    else renderProducts();
  });

  // Products toolbar
  $("#prodSearch").addEventListener("input", (e) => { state.filters.search = e.target.value; state.page = 1; renderProducts(); });
  $("#prodCategoryFilter").addEventListener("change", (e) => { state.filters.category = e.target.value; state.page = 1; renderProducts(); });
  $("#prodStatusFilter").addEventListener("change", (e) => { state.filters.status = e.target.value; state.page = 1; renderProducts(); });
  $("#prodSort").addEventListener("change", (e) => { state.filters.sort = e.target.value; renderProducts(); });

  // Add buttons
  $("#addProductBtn").addEventListener("click", () => openProductModal());
  $("#addCategoryBtn").addEventListener("click", () => openCategoryModal());
  $("#addSupplierBtn").addEventListener("click", () => openSupplierModal());

  // Modal close
  document.addEventListener("click", (e) => {
    if (e.target.matches("[data-close]") || e.target.closest("[data-close]")) {
      const m = e.target.closest(".modal"); if (m) closeModal(m);
    }
    if (e.target.classList.contains("modal")) closeModal(e.target);
  });

  // Table actions
  $("#productsTable").addEventListener("click", (e) => {
    const editId = e.target.closest("[data-edit]")?.dataset.edit;
    const delId = e.target.closest("[data-del]")?.dataset.del;
    if (editId) openProductModal(editId);
    if (delId) {
      const p = state.products.find((x) => x.id === delId);
      confirmDialog("Delete product", `Delete "${p.name}"? This can't be undone.`, () => {
        state.products = state.products.filter((x) => x.id !== delId);
        logActivity(`Deleted product: ${p.name}`);
        persist(); renderAll();
        toast("Product deleted", "success");
      });
    }
  });
  $("#prodPagination").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-pg]"); if (!b) return;
    const v = b.dataset.pg;
    if (v === "prev") state.page--;
    else if (v === "next") state.page++;
    else state.page = Number(v);
    renderProducts();
  });

  $("#categoriesTable").addEventListener("click", (e) => {
    const editId = e.target.closest("[data-cat-edit]")?.dataset.catEdit;
    const delId = e.target.closest("[data-cat-del]")?.dataset.catDel;
    if (editId) openCategoryModal(editId);
    if (delId) {
      const c = state.categories.find((x) => x.id === delId);
      confirmDialog("Delete category", `Delete category "${c.name}"?`, () => {
        state.categories = state.categories.filter((x) => x.id !== delId);
        state.products.forEach((p) => { if (p.categoryId === delId) p.categoryId = ""; });
        logActivity(`Deleted category: ${c.name}`);
        persist(); renderAll();
        toast("Category deleted", "success");
      });
    }
  });

  $("#suppliersTable").addEventListener("click", (e) => {
    const editId = e.target.closest("[data-sup-edit]")?.dataset.supEdit;
    const delId = e.target.closest("[data-sup-del]")?.dataset.supDel;
    if (editId) openSupplierModal(editId);
    if (delId) {
      const s = state.suppliers.find((x) => x.id === delId);
      confirmDialog("Delete supplier", `Delete supplier "${s.name}"?`, () => {
        state.suppliers = state.suppliers.filter((x) => x.id !== delId);
        state.products.forEach((p) => { if (p.supplierId === delId) p.supplierId = ""; });
        logActivity(`Deleted supplier: ${s.name}`);
        persist(); renderAll();
        toast("Supplier deleted", "success");
      });
    }
  });

  // Forms
  $("#productForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = $("#prodId").value;
    const data = {
      name: $("#prodName").value.trim(),
      sku: $("#prodSku").value.trim(),
      categoryId: $("#prodCategory").value,
      supplierId: $("#prodSupplier").value,
      purchase: Number($("#prodPurchase").value || 0),
      price: Number($("#prodPrice").value || 0),
      qty: Number($("#prodQty").value || 0),
      reorder: Number($("#prodReorder").value || 0),
      unit: $("#prodUnit").value.trim(),
      status: $("#prodStatus").value,
    };
    if (!data.name || !data.sku) { toast("Name and SKU are required", "error"); return; }
    const dupe = state.products.find((p) => p.sku.toLowerCase() === data.sku.toLowerCase() && p.id !== id);
    if (dupe) { toast("SKU must be unique", "error"); return; }
    if (id) {
      state.products = state.products.map((p) => (p.id === id ? { ...p, ...data } : p));
      logActivity(`Updated product: ${data.name}`);
      toast("Product updated", "success");
    } else {
      state.products.push({ id: uid(), ...data });
      logActivity(`Added product: ${data.name}`);
      toast("Product added", "success");
    }
    persist(); renderAll(); closeModal($("#productModal"));
  });

  $("#categoryForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = $("#catId").value;
    const data = { name: $("#catName").value.trim(), desc: $("#catDesc").value.trim() };
    if (!data.name) { toast("Name is required", "error"); return; }
    if (id) {
      state.categories = state.categories.map((c) => (c.id === id ? { ...c, ...data } : c));
      logActivity(`Updated category: ${data.name}`);
    } else {
      state.categories.push({ id: uid(), ...data });
      logActivity(`Added category: ${data.name}`);
    }
    persist(); renderAll(); closeModal($("#categoryModal"));
    toast("Category saved", "success");
  });

  $("#supplierForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = $("#supId").value;
    const data = {
      name: $("#supName").value.trim(),
      contact: $("#supContact").value.trim(),
      email: $("#supEmail").value.trim(),
      phone: $("#supPhone").value.trim(),
    };
    if (!data.name) { toast("Name is required", "error"); return; }
    if (id) {
      state.suppliers = state.suppliers.map((s) => (s.id === id ? { ...s, ...data } : s));
      logActivity(`Updated supplier: ${data.name}`);
    } else {
      state.suppliers.push({ id: uid(), ...data });
      logActivity(`Added supplier: ${data.name}`);
    }
    persist(); renderAll(); closeModal($("#supplierModal"));
    toast("Supplier saved", "success");
  });

  // Settings
  $("#saveSettingsBtn").addEventListener("click", () => {
    state.settings.company = $("#setCompany").value.trim() || "Stockly";
    state.settings.currency = $("#setCurrency").value;
    state.settings.theme = $("#setTheme").value;
    applyTheme(state.settings.theme);
    persist(); renderAll();
    toast("Settings saved", "success");
  });
  $("#clearDataBtn").addEventListener("click", clearAllData);

  // Esc to close modals
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") $$(".modal").forEach((m) => (m.hidden = true));
  });
}

function clearAllData() {
  confirmDialog("Clear all data", "This will erase all products, categories, suppliers and activity. Continue?", () => {
    Object.values(STORAGE).forEach((k) => localStorage.removeItem(k));
    state.products = []; state.categories = []; state.suppliers = []; state.activity = [];
    renderAll();
    toast("All data cleared", "warn");
  });
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

document.addEventListener("DOMContentLoaded", init);
// function openModal(id) {
//   $(`#${id}`).hidden = false;
// }
// function openModal(id) {
//   document.querySelectorAll(".modal").forEach(m => {
//     m.hidden = true;
//   });

//   document.getElementById(id).hidden = false;
// }
// function confirmDialog(title, msg, onOk) {
//   const modal = $("#confirmModal");
//   const ok = $("#confirmOk");

//   $("#confirmTitle").textContent = title;
//   $("#confirmMsg").textContent = msg;

//   const newBtn = ok.cloneNode(true);
//   ok.parentNode.replaceChild(newBtn, ok);

//   newBtn.addEventListener("click", () => {
//     onOk();
//     modal.hidden = true;
//   });

//   modal.hidden = false;
// }
// function closeAllModals() {
//   document.querySelectorAll(".modal").forEach(m => {
//     m.hidden = true;
//   });
// }
// document.addEventListener("click", e => {

//     if (e.target.matches("[data-close]")) {
//         closeAllModals();
//     }

//     if (e.target.classList.contains("modal")) {
//         closeAllModals();
//     }

// });
// function openModal(id) {

//     // Close every modal first
//     document.querySelectorAll(".modal").forEach(modal => {
//         modal.hidden = true;
//     });

//     // Open only the requested modal
//     document.getElementById(id).hidden = false;
// }
// function openModal(id) {
//     $(`#${id}`).hidden = false;
// }
// const handler = () => {
//     onOk();
//     closeModal($("#confirmModal"));
//     ok.removeEventListener("click", handler);
// };
// function confirmDialog(title, msg, onOk) {

//     const modal = $("#confirmModal");

//     $("#confirmTitle").textContent = title;
//     $("#confirmMsg").textContent = msg;

//     const oldBtn = $("#confirmOk");
//     const newBtn = oldBtn.cloneNode(true);

//     oldBtn.parentNode.replaceChild(newBtn, oldBtn);

//     newBtn.addEventListener("click", () => {
//         onOk();
//         modal.hidden = true;
//     });

//     openModal("confirmModal");
// }