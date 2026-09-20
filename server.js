const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = process.env.PORT || 10000;
const PUBLIC = path.join(__dirname, 'public');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '.data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const STORE_FILE = path.join(DATA_DIR, 'store.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me-now';

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const defaultStore = {
  settings: {
    name: 'Classic Denim',
    tagline: "Men's Wear",
    address: 'Beside Shivalayam, Main Road, Gajwel',
    phone: '9502747507',
    upiId: '',
    payments: { cod: true, upi: true }
  },
  products: [
    { id: 'cd-001', name: 'Heritage Straight Jeans', category: 'Jeans', price: 2499, oldPrice: 2999, sizes: ['30','32','34','36','38'], badge: 'Best Seller', image: '/assets/product-jeans.svg', description: 'Classic straight-fit denim for everyday wear.' },
    { id: 'cd-002', name: 'Rugged Slim Jeans', category: 'Jeans', price: 2299, oldPrice: 2799, sizes: ['30','32','34','36'], badge: 'New', image: '/assets/product-jeans.svg', description: 'Modern slim-fit jeans with comfortable stretch.' },
    { id: 'cd-003', name: 'Classic Track Pants', category: 'Track Pants', price: 1499, oldPrice: null, sizes: ['S','M','L','XL','XXL'], badge: 'Popular', image: '/assets/product-shorts.svg', description: 'Comfort-first track pants for daily wear and travel.' },
    { id: 'cd-004', name: 'Denim Track Pants', category: 'Track Pants', price: 1699, oldPrice: null, sizes: ['S','M','L','XL'], badge: '', image: '/assets/product-jeans.svg', description: 'Smart casual track pants with a denim-inspired look.' },
    { id: 'cd-005', name: 'Classic Denim Shirt', category: 'Shirts', price: 1899, oldPrice: 2199, sizes: ['S','M','L','XL','XXL'], badge: '20% Off', image: '/assets/product-shirt.svg', description: 'Timeless button-down denim shirt with a clean fit.' },
    { id: 'cd-006', name: 'Casual Check Shirt', category: 'Shirts', price: 1599, oldPrice: null, sizes: ['S','M','L','XL','XXL'], badge: '', image: '/assets/product-shirt.svg', description: 'Easy everyday shirt for casual outfits.' },
    { id: 'cd-007', name: 'Classic Crew T-Shirt', category: 'T-Shirts', price: 899, oldPrice: null, sizes: ['S','M','L','XL','XXL'], badge: 'Everyday', image: '/assets/product-shirt.svg', description: 'Soft crew-neck T-shirt built for everyday comfort.' },
    { id: 'cd-008', name: 'Premium Cotton T-Shirt', category: 'T-Shirts', price: 1099, oldPrice: 1299, sizes: ['S','M','L','XL','XXL'], badge: '', image: '/assets/product-shirt.svg', description: 'Premium cotton T-shirt with a clean regular fit.' }
  ],
  orders: []
};

let store = loadStore();

const mime = {
  '.html':'text/html; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.js':'application/javascript; charset=utf-8',
  '.svg':'image/svg+xml',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg',
  '.webp':'image/webp',
  '.gif':'image/gif',
  '.ico':'image/x-icon'
};

function loadStore() {
  try {
    if (fs.existsSync(STORE_FILE)) return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
  } catch (e) {
    console.error('Unable to load store.json:', e.message);
  }
  fs.writeFileSync(STORE_FILE, JSON.stringify(defaultStore, null, 2));
  return JSON.parse(JSON.stringify(defaultStore));
}

function saveStore() {
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
}

function send(res, status, data, contentType='application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
  res.end(typeof data === 'string' ? data : JSON.stringify(data));
}

function readBody(req, maxBytes = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    let total = 0;
    req.on('data', chunk => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('Request is too large. Please use a smaller image.'));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { reject(new Error('Invalid JSON request.')); }
    });
    req.on('error', reject);
  });
}

function isAdmin(req) {
  const token = req.headers['x-admin-password'];
  if (typeof token !== 'string' || token.length !== ADMIN_PASSWORD.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(ADMIN_PASSWORD));
}

function requireAdmin(req, res) {
  if (!isAdmin(req)) {
    send(res, 401, { error: 'Invalid owner password.' });
    return false;
  }
  return true;
}

function cleanText(value, fallback='') {
  return String(value ?? fallback).trim();
}

function filterProducts(query) {
  let result = [...store.products];
  const category = query.get('category');
  const search = query.get('search');
  const sort = query.get('sort');
  const allowed = new Set(['Jeans','Track Pants','Shirts','T-Shirts']);
  if (category && category !== 'All' && allowed.has(category)) result = result.filter(p => p.category === category);
  if (search) {
    const q = search.toLowerCase().trim();
    result = result.filter(p => [p.name,p.category].join(' ').toLowerCase().includes(q));
  }
  if (sort === 'low') result.sort((a,b)=>a.price-b.price);
  if (sort === 'high') result.sort((a,b)=>b.price-a.price);
  if (sort === 'name') result.sort((a,b)=>a.name.localeCompare(b.name));
  return result;
}

function safeUploadName(ext) {
  return `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
}

function dataUrlToFile(dataUrl) {
  const match = /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,(.+)$/i.exec(dataUrl || '');
  if (!match) throw new Error('Please select a valid JPG, PNG, WEBP or GIF image.');
  const mimeType = match[1].toLowerCase();
  const ext = mimeType.includes('png') ? '.png' : mimeType.includes('gif') ? '.gif' : mimeType.includes('webp') ? '.webp' : '.jpg';
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 5 * 1024 * 1024) throw new Error('Image must be 5 MB or smaller.');
  return { buffer, ext };
}

const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsed.pathname;

  if (req.method === 'GET' && pathname === '/api/health') {
    return send(res, 200, { status:'ok', service:'classic-denim-shop' });
  }

  if (req.method === 'GET' && pathname === '/api/store') {
    return send(res, 200, { settings: store.settings, categories: ['Jeans','Track Pants','Shirts','T-Shirts'] });
  }

  if (req.method === 'GET' && pathname === '/api/products') {
    return send(res, 200, filterProducts(parsed.searchParams));
  }

  if (req.method === 'GET' && pathname === '/api/admin/orders') {
    if (!requireAdmin(req, res)) return;
    return send(res, 200, store.orders);
  }

  if (req.method === 'GET' && pathname === '/api/admin/store') {
    if (!requireAdmin(req, res)) return;
    return send(res, 200, store);
  }

  if (req.method === 'POST' && pathname === '/api/admin/settings') {
    if (!requireAdmin(req, res)) return;
    try {
      const body = await readBody(req, 256 * 1024);
      store.settings = {
        ...store.settings,
        name: cleanText(body.name, 'Classic Denim'),
        tagline: cleanText(body.tagline, "Men's Wear"),
        address: cleanText(body.address, 'Beside Shivalayam, Main Road, Gajwel'),
        phone: cleanText(body.phone, '9502747507'),
        upiId: cleanText(body.upiId, ''),
        payments: {
          cod: Boolean(body.payments?.cod),
          upi: Boolean(body.payments?.upi)
        }
      };
      saveStore();
      return send(res, 200, { settings: store.settings });
    } catch (e) { return send(res, 400, { error: e.message }); }
  }

  if (req.method === 'POST' && pathname === '/api/admin/products') {
    if (!requireAdmin(req, res)) return;
    try {
      const body = await readBody(req, 8 * 1024 * 1024);
      const categories = new Set(['Jeans','Track Pants','Shirts','T-Shirts']);
      if (!categories.has(body.category)) return send(res, 400, { error: 'Category must be Jeans, Track Pants, Shirts or T-Shirts.' });
      if (!cleanText(body.name)) return send(res, 400, { error: 'Product name is required.' });
      const price = Number(body.price);
      if (!Number.isFinite(price) || price <= 0) return send(res, 400, { error: 'Enter a valid price.' });
      const sizes = Array.isArray(body.sizes) ? body.sizes.map(String).map(s => s.trim()).filter(Boolean) : cleanText(body.sizes).split(',').map(s=>s.trim()).filter(Boolean);
      if (!sizes.length) return send(res, 400, { error: 'Add at least one size.' });
      let image = cleanText(body.image);
      if (body.imageData) {
        const { buffer, ext } = dataUrlToFile(body.imageData);
        const filename = safeUploadName(ext);
        fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
        image = `/uploads/${filename}`;
      }
      if (!image) image = '/assets/product-shirt.svg';
      const product = {
        id: cleanText(body.id) || `cd-${crypto.randomBytes(4).toString('hex')}`,
        name: cleanText(body.name),
        category: body.category,
        price,
        oldPrice: body.oldPrice ? Number(body.oldPrice) : null,
        sizes,
        badge: cleanText(body.badge),
        image,
        description: cleanText(body.description)
      };
      const existingIndex = store.products.findIndex(p => p.id === product.id);
      if (existingIndex >= 0) store.products[existingIndex] = product;
      else store.products.unshift(product);
      saveStore();
      return send(res, 201, { product });
    } catch (e) { return send(res, 400, { error: e.message }); }
  }

  if (req.method === 'DELETE' && pathname.startsWith('/api/admin/products/')) {
    if (!requireAdmin(req, res)) return;
    const id = decodeURIComponent(pathname.split('/').pop());
    const before = store.products.length;
    store.products = store.products.filter(p => p.id !== id);
    if (store.products.length === before) return send(res, 404, { error: 'Product not found.' });
    saveStore();
    return send(res, 200, { success: true });
  }

  if (req.method === 'GET' && pathname.startsWith('/api/products/')) {
    const id = pathname.split('/').pop();
    const product = store.products.find(p => p.id === id);
    return product ? send(res, 200, product) : send(res, 404, { error:'Product not found' });
  }

  if (req.method === 'POST' && pathname === '/api/orders') {
    try {
      const body = await readBody(req, 1024 * 1024);
      const { customer, items, paymentMode } = body;
      if (!customer || !customer.name || !customer.phone || !customer.address || !customer.city || !customer.pincode) return send(res,400,{error:'Please provide all required delivery details.'});
      if (!Array.isArray(items) || !items.length) return send(res,400,{error:'Your cart is empty.'});
      if (!['COD','UPI'].includes(paymentMode)) return send(res,400,{error:'Please select a payment mode.'});
      if (paymentMode === 'COD' && !store.settings.payments.cod) return send(res,400,{error:'Cash on Delivery is currently unavailable.'});
      if (paymentMode === 'UPI' && (!store.settings.payments.upi || !store.settings.upiId)) return send(res,400,{error:'UPI payment is not configured yet. Please choose Cash on Delivery.'});
      const normalized = items.map(item => {
        const product = store.products.find(p => p.id === item.id);
        if (!product) throw new Error(`Unknown product: ${item.id}`);
        const qty = Math.max(1, Math.min(10, Number(item.qty) || 1));
        const size = product.sizes.includes(item.size) ? item.size : product.sizes[0];
        return { id:product.id, name:product.name, qty, size, price:product.price };
      });
      const subtotal = normalized.reduce((sum,item)=>sum + item.price * item.qty, 0);
      const shipping = subtotal >= 2999 ? 0 : 149;
      const order = {
        id:`CD-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        createdAt:new Date().toISOString(), customer, items:normalized,
        subtotal, shipping, total:subtotal+shipping,
        paymentMode,
        paymentStatus: paymentMode === 'UPI' ? 'Pending Verification' : 'Pay on Delivery',
        status:'Confirmed'
      };
      store.orders.unshift(order);
      saveStore();
      return send(res,201,{order});
    } catch (e) { return send(res,400,{error:e.message || 'Invalid request.'}); }
  }

  let filePath;
  if (pathname.startsWith('/uploads/')) {
    filePath = path.normalize(path.join(UPLOAD_DIR, pathname.replace(/^\/uploads\/+/,'')));
  } else {
    filePath = pathname === '/' ? path.join(PUBLIC,'index.html') : path.normalize(path.join(PUBLIC, pathname.replace(/^\/+/,'')));
  }
  const base = pathname.startsWith('/uploads/') ? UPLOAD_DIR : PUBLIC;
  if (!filePath.startsWith(base)) return send(res,403,'Forbidden','text/plain; charset=utf-8');
  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream', 'Cache-Control':'public, max-age=3600' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      const fallback = path.join(PUBLIC,'index.html');
      res.writeHead(200,{ 'Content-Type': mime['.html'] });
      fs.createReadStream(fallback).pipe(res);
    }
  });
});

server.listen(PORT, () => console.log(`Classic Denim Shop running on port ${PORT}`));
