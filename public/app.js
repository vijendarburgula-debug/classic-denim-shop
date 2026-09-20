const state = { products: [], category: 'All', sort: 'featured', cart: JSON.parse(localStorage.getItem('classicDenimCart') || '[]'), settings: null };
const $ = (sel) => document.querySelector(sel);
const money = (value) => `₹${Number(value).toLocaleString('en-IN')}`;

async function loadStore() {
  const res = await fetch('/api/store');
  const data = await res.json();
  state.settings = data.settings;
  $('#shopName').textContent = state.settings.name;
  $('#shopAddress').textContent = state.settings.address;
  $('#shopPhone').textContent = state.settings.phone;
  $('#shopPhone').href = `tel:${state.settings.phone}`;
  $('#footerPhone').textContent = state.settings.phone;
  $('#footerPhone').href = `tel:${state.settings.phone}`;
  $('#announcementPhone').textContent = state.settings.phone;
  const modes = [];
  if (state.settings.payments.cod) modes.push('Cash on Delivery');
  if (state.settings.payments.upi && state.settings.upiId) modes.push('UPI');
  $('#paymentModes').textContent = modes.length ? modes.join(' • ') : 'Contact shop for payment options';
  const upi = state.settings.payments.upi && state.settings.upiId;
  $('#upiPaymentOption').style.display = upi ? 'flex' : 'none';
  $('#upiHint').textContent = upi ? `UPI ID: ${state.settings.upiId}` : 'UPI not configured';
  if (!state.settings.payments.cod) document.querySelector('input[value="COD"]').disabled = true;
  if (!state.settings.payments.cod && upi) document.querySelector('input[value="UPI"]').checked = true;
}

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
  if (!state.products.length) { grid.innerHTML = `<div class="loading">No products found. Try another category.</div>`; return; }
  grid.innerHTML = state.products.map(product => `<article class="product-card"><div class="product-media"><img src="${product.image}" alt="${product.name}" loading="lazy">${product.badge ? `<span class="badge">${product.badge}</span>` : ''}</div><div class="product-body"><div class="product-meta"><div><div class="product-name">${product.name}</div><div class="product-detail">${product.description || ''}</div></div><div class="product-price">${money(product.price)}${product.oldPrice ? `<span class="old-price">${money(product.oldPrice)}</span>` : ''}</div></div><div class="size-row">${product.sizes.map(s => `<button class="size-pill" data-size="${s}">${s}</button>`).join('')}</div><button class="add-btn" data-id="${product.id}">Add to bag</button></div></article>`).join('');
}
function saveCart(){ localStorage.setItem('classicDenimCart', JSON.stringify(state.cart)); renderCart(); }
function addToCart(id, size){ const product = state.products.find(p => p.id === id); if (!product) return; const chosen = size || product.sizes[0]; const existing = state.cart.find(i=>i.id===id&&i.size===chosen); if(existing) existing.qty++; else state.cart.push({id,size:chosen,qty:1}); saveCart(); showToast(`${product.name} added to your bag.`); }
function getCartDetails(){ return state.cart.map(item=>{const product=state.products.find(p=>p.id===item.id);return product?{...item,product}:null}).filter(Boolean); }
function renderCart(){ const details=getCartDetails(); $('#cartCount').textContent=state.cart.reduce((s,i)=>s+i.qty,0); $('#cartItems').innerHTML=details.length?details.map(item=>`<div class="cart-item"><div class="cart-thumb"><img src="${item.product.image}" alt=""></div><div><h4>${item.product.name}</h4><p>Size: ${item.size} · ${money(item.product.price)}</p><div class="qty-controls"><button data-action="dec" data-id="${item.id}" data-size="${item.size}">−</button><span>${item.qty}</span><button data-action="inc" data-id="${item.id}" data-size="${item.size}">+</button><button data-action="remove" data-id="${item.id}" data-size="${item.size}">Remove</button></div></div><strong>${money(item.product.price*item.qty)}</strong></div>`).join(''):`<div class="cart-empty">Your bag is empty.<br><br><a href="#shop" class="text-link">Browse products →</a></div>`; const subtotal=details.reduce((s,i)=>s+i.product.price*i.qty,0); $('#cartSubtotal').textContent=money(subtotal); const shipping=subtotal>=2999||!subtotal?0:149; $('#checkoutTotal').textContent=money(subtotal+shipping); }
function openCart(){ $('#cartDrawer').classList.add('open'); $('#backdrop').style.display='block'; document.body.style.overflow='hidden'; }
function closeCart(){ $('#cartDrawer').classList.remove('open'); $('#backdrop').style.display='none'; document.body.style.overflow=''; }
function showToast(msg){const toast=$('#toast');toast.textContent=msg;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2500);}
function openSearch(){ $('#searchOverlay').style.display='flex'; $('#searchInput').focus(); }
function closeSearch(){ $('#searchOverlay').style.display='none'; }

$('#categoryFilters').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(!b)return;state.category=b.dataset.category;document.querySelectorAll('.filter').forEach(x=>x.classList.toggle('active',x===b));loadProducts();});
$('#sortSelect').addEventListener('change',e=>{state.sort=e.target.value;loadProducts();});
$('#productGrid').addEventListener('click',e=>{const size=e.target.closest('.size-pill');if(size){size.closest('.size-row').querySelectorAll('.size-pill').forEach(s=>s.classList.remove('selected'));size.classList.add('selected');return;}const add=e.target.closest('.add-btn');if(add){const selected=add.closest('.product-card').querySelector('.size-pill.selected');addToCart(add.dataset.id,selected?selected.dataset.size:null);}});
$('#cartItems').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const item=state.cart.find(i=>i.id===b.dataset.id&&i.size===b.dataset.size);if(!item)return;if(b.dataset.action==='inc')item.qty++;if(b.dataset.action==='dec')item.qty--;if(b.dataset.action==='remove'||item.qty<=0)state.cart=state.cart.filter(i=>i!==item);saveCart();});
$('#cartBtn').addEventListener('click',openCart); $('#closeCart').addEventListener('click',closeCart); $('#backdrop').addEventListener('click',closeCart); $('#searchBtn').addEventListener('click',openSearch); $('#closeSearch').addEventListener('click',closeSearch); $('#mobileMenuBtn').addEventListener('click',()=>$('#navLinks').classList.toggle('open'));
document.querySelectorAll('.nav-links a').forEach(a=>a.addEventListener('click',()=>$('#navLinks').classList.remove('open')));
document.querySelectorAll('[data-jump-category]').forEach(a=>a.addEventListener('click',()=>{state.category=a.dataset.jumpCategory;document.querySelectorAll('.filter').forEach(b=>b.classList.toggle('active',b.dataset.category===state.category));setTimeout(()=>loadProducts(),0);}));
$('#searchInput').addEventListener('input',async e=>{const q=e.target.value.trim();if(!q){$('#searchResults').innerHTML='';return;}const res=await fetch(`/api/products?search=${encodeURIComponent(q)}`);const data=await res.json();$('#searchResults').innerHTML=data.length?data.slice(0,8).map(p=>`<a class="search-result" href="#shop" data-search-product="${p.id}"><span>${p.name}</span><strong>${money(p.price)}</strong></a>`).join(''):'<div class="cart-empty">No matches found.</div>';});
$('#searchResults').addEventListener('click',e=>{const a=e.target.closest('[data-search-product]');if(a){closeSearch();state.category='All';document.querySelectorAll('.filter').forEach(b=>b.classList.toggle('active',b.dataset.category==='All'));loadProducts();}});
$('#checkoutBtn').addEventListener('click',()=>{if(!state.cart.length)return showToast('Add a product before checkout.');closeCart();$('#checkoutModal').style.display='flex';document.body.style.overflow='hidden';});
$('#closeCheckout').addEventListener('click',()=>{ $('#checkoutModal').style.display='none'; document.body.style.overflow=''; });
$('#checkoutModal').addEventListener('click',e=>{if(e.target===$('#checkoutModal')){$('#checkoutModal').style.display='none';document.body.style.overflow='';}});
$('#checkoutForm').addEventListener('submit',async e=>{e.preventDefault();const details=getCartDetails();const form=new FormData(e.target);const customer={name:form.get('name'),phone:form.get('phone'),city:form.get('city'),pincode:form.get('pincode'),address:form.get('address')};const paymentMode=form.get('paymentMode');const btn=e.target.querySelector('button[type="submit"]');btn.disabled=true;btn.textContent='Placing order...';try{const res=await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({customer,paymentMode,items:details.map(i=>({id:i.id,size:i.size,qty:i.qty}))})});const data=await res.json();if(!res.ok)throw new Error(data.error);state.cart=[];saveCart();$('#checkoutModal').style.display='none';document.body.style.overflow='';e.target.reset();showToast(`Order ${data.order.id} confirmed.`);}catch(err){showToast(err.message);}finally{btn.disabled=false;btn.textContent='Place order';}});
$('#upiPaymentOption').addEventListener('click',()=>{$('input[value="UPI"]').checked=true;});
async function init(){renderCart();await loadStore();await loadProducts();}
init().catch(err=>showToast(err.message));
