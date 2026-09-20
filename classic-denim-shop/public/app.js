const state = {
  products: [],
  category: 'All',
  sort: 'featured',
  cart: JSON.parse(localStorage.getItem('classicDenimCart') || '[]')
};

const $ = (sel) => document.querySelector(sel);
const money = (value) => `₹${Number(value).toLocaleString('en-IN')}`;

async function loadProducts(extra = {}) {
  const params = new URLSearchParams();
  if (state.category !== 'All') params.set('category', state.category);
  if (state.sort !== 'featured') params.set('sort', state.sort);
  if (extra.search) params.set('search', extra.search);
  const res = await fetch(`/api/products?${params.toString()}`);
  state.products = await res.json();
  renderProducts();
}

function renderProducts() {
  const grid = $('#productGrid');
  if (!state.products.length) {
    grid.innerHTML = `<div class="loading">No products found. Try another filter.</div>`;
    return;
  }
  grid.innerHTML = state.products.map(product => `
    <article class="product-card">
      <div class="product-media">
        <img src="${product.image}" alt="${product.name}" loading="lazy">
        ${product.badge ? `<span class="badge">${product.badge}</span>` : ''}
      </div>
      <div class="product-body">
        <div class="product-meta">
          <div>
            <div class="product-name">${product.name}</div>
            <div class="product-detail">${product.description}</div>
          </div>
          <div class="product-price">${money(product.price)}${product.oldPrice ? `<span class="old-price">${money(product.oldPrice)}</span>` : ''}</div>
        </div>
        <div class="size-row">${product.sizes.map(s => `<button class="size-pill" data-size="${s}">${s}</button>`).join('')}</div>
        <button class="add-btn" data-id="${product.id}">Add to bag</button>
      </div>
    </article>
  `).join('');
}

function saveCart() {
  localStorage.setItem('classicDenimCart', JSON.stringify(state.cart));
  renderCart();
}

function addToCart(productId, size) {
  const product = state.products.find(p => p.id === productId) || state.products.concat([]).find(p => p.id === productId);
  if (!product) return;
  const chosenSize = size || product.sizes[0];
  const existing = state.cart.find(i => i.id === productId && i.size === chosenSize);
  if (existing) existing.qty += 1;
  else state.cart.push({ id: productId, size: chosenSize, qty: 1 });
  saveCart();
  showToast(`${product.name} added to your bag.`);
}

function getCartDetails() {
  return state.cart.map(item => {
    const product = state.products.find(p => p.id === item.id);
    return product ? { ...item, product } : null;
  }).filter(Boolean);
}

function renderCart() {
  const details = getCartDetails();
  const count = state.cart.reduce((sum,i) => sum + i.qty, 0);
  $('#cartCount').textContent = count;
  if (!details.length) {
    $('#cartItems').innerHTML = `<div class="cart-empty">Your bag is waiting for something good.<br><br><a href="#shop" class="text-link">Browse denim →</a></div>`;
  } else {
    $('#cartItems').innerHTML = details.map(item => `
      <div class="cart-item">
        <div class="cart-thumb"><img src="${item.product.image}" alt=""></div>
        <div><h4>${item.product.name}</h4><p>Size: ${item.size} · ${money(item.product.price)}</p><div class="qty-controls"><button data-action="dec" data-id="${item.id}" data-size="${item.size}">−</button><span>${item.qty}</span><button data-action="inc" data-id="${item.id}" data-size="${item.size}">+</button><button data-action="remove" data-id="${item.id}" data-size="${item.size}">Remove</button></div></div>
        <strong>${money(item.product.price * item.qty)}</strong>
      </div>
    `).join('');
  }
  const subtotal = details.reduce((sum,item) => sum + item.product.price * item.qty, 0);
  $('#cartSubtotal').textContent = money(subtotal);
  const shipping = subtotal >= 2999 || subtotal === 0 ? 0 : 149;
  $('#checkoutTotal').textContent = money(subtotal + shipping);
}

function openCart() {
  $('#cartDrawer').classList.add('open');
  $('#backdrop').style.display = 'block';
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  $('#cartDrawer').classList.remove('open');
  $('#backdrop').style.display = 'none';
  document.body.style.overflow = '';
}
function showToast(msg) {
  const toast = $('#toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2300);
}

function openSearch() {
  $('#searchOverlay').style.display = 'flex';
  $('#searchOverlay').setAttribute('aria-hidden','false');
  $('#searchInput').focus();
}
function closeSearch() {
  $('#searchOverlay').style.display = 'none';
  $('#searchOverlay').setAttribute('aria-hidden','true');
}

$('#categoryFilters').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-category]');
  if (!btn) return;
  state.category = btn.dataset.category;
  document.querySelectorAll('.filter').forEach(b => b.classList.toggle('active', b === btn));
  loadProducts();
});

$('#sortSelect').addEventListener('change', (e) => {
  state.sort = e.target.value;
  loadProducts();
});

$('#productGrid').addEventListener('click', (e) => {
  const add = e.target.closest('.add-btn');
  if (!add) return;
  const card = add.closest('.product-card');
  const selected = card.querySelector('.size-pill.selected');
  addToCart(add.dataset.id, selected ? selected.dataset.size : null);
});

$('#productGrid').addEventListener('click', (e) => {
  const size = e.target.closest('.size-pill');
  if (!size) return;
  size.closest('.size-row').querySelectorAll('.size-pill').forEach(s => s.classList.remove('selected'));
  size.classList.add('selected');
});

$('#cartItems').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const item = state.cart.find(i => i.id === btn.dataset.id && i.size === btn.dataset.size);
  if (!item) return;
  if (btn.dataset.action === 'inc') item.qty += 1;
  if (btn.dataset.action === 'dec') item.qty -= 1;
  if (btn.dataset.action === 'remove' || item.qty <= 0) state.cart = state.cart.filter(i => i !== item);
  saveCart();
});

$('#cartBtn').addEventListener('click', openCart);
$('#closeCart').addEventListener('click', closeCart);
$('#backdrop').addEventListener('click', closeCart);
$('#searchBtn').addEventListener('click', openSearch);
$('#closeSearch').addEventListener('click', closeSearch);
$('#mobileMenuBtn').addEventListener('click', () => $('#navLinks').classList.toggle('open'));

document.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', () => $('#navLinks').classList.remove('open')));

$('#searchInput').addEventListener('input', async (e) => {
  const q = e.target.value.trim();
  if (!q) { $('#searchResults').innerHTML = ''; return; }
  const res = await fetch(`/api/products?search=${encodeURIComponent(q)}`);
  const data = await res.json();
  $('#searchResults').innerHTML = data.length ? data.slice(0,7).map(p => `<a class="search-result" href="#shop" data-search-product="${p.id}"><span>${p.name}</span><strong>${money(p.price)}</strong></a>`).join('') : '<div class="cart-empty">No matches found.</div>';
});

$('#searchResults').addEventListener('click', closeSearch);

$('#checkoutBtn').addEventListener('click', () => {
  if (!state.cart.length) return showToast('Add a product before checkout.');
  closeCart();
  $('#checkoutModal').style.display = 'flex';
  $('#checkoutModal').setAttribute('aria-hidden','false');
  document.body.style.overflow = 'hidden';
});
$('#closeCheckout').addEventListener('click', () => { $('#checkoutModal').style.display = 'none'; document.body.style.overflow = ''; });
$('#checkoutModal').addEventListener('click', (e) => { if (e.target === $('#checkoutModal')) { $('#checkoutModal').style.display = 'none'; document.body.style.overflow = ''; } });

$('#checkoutForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const details = getCartDetails();
  const form = new FormData(e.target);
  const customer = Object.fromEntries(form.entries());
  const payload = { customer, items: details.map(i => ({ id:i.id, size:i.size, qty:i.qty })) };
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Placing order...';
  try {
    const res = await fetch('/api/orders', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Unable to place order');
    state.cart = [];
    saveCart();
    $('#checkoutModal').style.display = 'none';
    document.body.style.overflow = '';
    e.target.reset();
    showToast(`Order ${data.order.id} confirmed.`);
  } catch (err) {
    showToast(err.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Place demo order';
  }
});

$('#newsletterForm').addEventListener('submit', (e) => {
  e.preventDefault();
  e.target.reset();
  showToast('You’re on the list. Welcome to the club.');
});

async function init() {
  renderCart();
  await loadProducts();
}
init();
