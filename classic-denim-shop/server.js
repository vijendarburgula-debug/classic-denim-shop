const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = process.env.PORT || 10000;
const PUBLIC = path.join(__dirname, 'public');

const products = [
  { id: 'cd-001', name: 'Heritage Straight Jean', category: 'Jeans', fit: 'Straight', wash: 'Indigo', price: 2499, oldPrice: 2999, badge: 'Best Seller', sizes: ['30','32','34','36','38'], color: 'Deep Indigo', image: '/assets/product-jeans.svg', description: 'A timeless straight-leg jean with a vintage-inspired indigo wash.' },
  { id: 'cd-002', name: 'Rugged Slim Jean', category: 'Jeans', fit: 'Slim', wash: 'Dark', price: 2299, oldPrice: 2799, badge: 'New', sizes: ['30','32','34','36'], color: 'Midnight Blue', image: '/assets/product-jeans.svg', description: 'Clean, modern slim fit with a touch of stretch for everyday comfort.' },
  { id: 'cd-003', name: '501 Classic Taper', category: 'Jeans', fit: 'Tapered', wash: 'Medium', price: 2399, oldPrice: null, badge: '', sizes: ['30','32','34','36','38'], color: 'Stone Indigo', image: '/assets/product-jeans.svg', description: 'Roomier at the thigh and tapered through the ankle for a sharp silhouette.' },
  { id: 'cd-004', name: 'Raw Denim Original', category: 'Jeans', fit: 'Straight', wash: 'Raw', price: 3199, oldPrice: null, badge: 'Premium', sizes: ['30','32','34','36','38','40'], color: 'Raw Indigo', image: '/assets/product-jeans.svg', description: 'Rigid raw denim designed to age beautifully with wear.' },
  { id: 'cd-005', name: 'Vintage Western Shirt', category: 'Shirts', fit: 'Regular', wash: 'Blue', price: 1899, oldPrice: 2199, badge: '20% Off', sizes: ['S','M','L','XL','XXL'], color: 'Faded Blue', image: '/assets/product-shirt.svg', description: 'Classic snap-button denim shirt with western yoke detailing.' },
  { id: 'cd-006', name: 'Heavyweight Trucker Jacket', category: 'Jackets', fit: 'Regular', wash: 'Dark', price: 3499, oldPrice: null, badge: 'Iconic', sizes: ['S','M','L','XL','XXL'], color: 'Dark Indigo', image: '/assets/product-jacket.svg', description: 'Heavyweight denim trucker jacket built for cool nights and long drives.' },
  { id: 'cd-007', name: 'Washed Denim Jacket', category: 'Jackets', fit: 'Relaxed', wash: 'Light', price: 2999, oldPrice: 3399, badge: '', sizes: ['S','M','L','XL'], color: 'Sky Wash', image: '/assets/product-jacket.svg', description: 'Soft-washed denim with a relaxed fit and worn-in character.' },
  { id: 'cd-008', name: 'Indigo Overshirt', category: 'Shirts', fit: 'Relaxed', wash: 'Indigo', price: 2099, oldPrice: null, badge: '', sizes: ['S','M','L','XL','XXL'], color: 'Indigo', image: '/assets/product-shirt.svg', description: 'An easy layering piece with utility pockets and workwear attitude.' },
  { id: 'cd-009', name: 'Denim Utility Shorts', category: 'Shorts', fit: 'Regular', wash: 'Medium', price: 1599, oldPrice: null, badge: 'Summer', sizes: ['30','32','34','36','38'], color: 'Medium Blue', image: '/assets/product-shorts.svg', description: 'Everyday denim shorts with durable construction and utility pockets.' },
  { id: 'cd-010', name: 'Relaxed Carpenter Jean', category: 'Jeans', fit: 'Relaxed', wash: 'Light', price: 2599, oldPrice: null, badge: 'Workwear', sizes: ['30','32','34','36','38','40'], color: 'Light Vintage', image: '/assets/product-jeans.svg', description: 'Relaxed workwear fit with a hammer loop and utility pocket detail.' },
  { id: 'cd-011', name: 'Black Denim Jean', category: 'Jeans', fit: 'Slim', wash: 'Black', price: 2399, oldPrice: null, badge: '', sizes: ['30','32','34','36','38'], color: 'Washed Black', image: '/assets/product-jeans-black.svg', description: 'A versatile black denim jean for weekday looks and nights out.' },
  { id: 'cd-012', name: 'Classic Denim Cap', category: 'Accessories', fit: 'One Size', wash: 'Blue', price: 899, oldPrice: null, badge: '', sizes: ['One Size'], color: 'Indigo', image: '/assets/product-cap.svg', description: 'Six-panel denim cap with a curved brim and adjustable strap.' }
];

let orders = [];
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'application/javascript; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp' };

function send(res, status, data, contentType='application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
  res.end(typeof data === 'string' ? data : JSON.stringify(data));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}
function filterProducts(query) {
  let result = [...products];
  const category = query.get('category');
  const search = query.get('search');
  const sort = query.get('sort');
  if (category && category !== 'All') result = result.filter(p => p.category === category);
  if (query.get('fit') && query.get('fit') !== 'All') result = result.filter(p => p.fit === query.get('fit'));
  if (search) {
    const q = search.toLowerCase().trim();
    result = result.filter(p => [p.name,p.category,p.fit,p.wash,p.color].join(' ').toLowerCase().includes(q));
  }
  if (sort === 'low') result.sort((a,b)=>a.price-b.price);
  if (sort === 'high') result.sort((a,b)=>b.price-a.price);
  if (sort === 'name') result.sort((a,b)=>a.name.localeCompare(b.name));
  return result;
}

const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsed.pathname;

  if (req.method === 'GET' && pathname === '/api/health') return send(res, 200, { status:'ok', service:'classic-denim-shop' });
  if (req.method === 'GET' && pathname === '/api/products') return send(res, 200, filterProducts(parsed.searchParams));
  if (req.method === 'GET' && pathname.startsWith('/api/products/')) {
    const id = pathname.split('/').pop();
    const product = products.find(p => p.id === id);
    return product ? send(res, 200, product) : send(res, 404, { error:'Product not found' });
  }
  if (req.method === 'POST' && pathname === '/api/orders') {
    try {
      const body = await readBody(req);
      const { customer, items } = body;
      if (!customer || !customer.name || !customer.email || !customer.phone || !customer.address || !customer.city || !customer.pincode) return send(res,400,{error:'Please provide all required customer details.'});
      if (!Array.isArray(items) || !items.length) return send(res,400,{error:'Your cart is empty.'});
      const normalized = items.map(item => {
        const product = products.find(p => p.id === item.id);
        if (!product) throw new Error(`Unknown product: ${item.id}`);
        const qty = Math.max(1, Math.min(10, Number(item.qty) || 1));
        return { id:product.id, name:product.name, qty, size:item.size || product.sizes[0], price:product.price };
      });
      const subtotal = normalized.reduce((sum,item)=>sum + item.price * item.qty, 0);
      const shipping = subtotal >= 2999 ? 0 : 149;
      const order = { id:`CD-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`, createdAt:new Date().toISOString(), customer, items:normalized, subtotal, shipping, total:subtotal+shipping, status:'Confirmed' };
      orders.push(order);
      return send(res,201,{order});
    } catch (e) { return send(res,400,{error:e.message || 'Invalid request.'}); }
  }

  let filePath = pathname === '/' ? path.join(PUBLIC,'index.html') : path.normalize(path.join(PUBLIC, pathname.replace(/^\/+/,'')));
  if (!filePath.startsWith(PUBLIC)) return send(res,403,'Forbidden','text/plain; charset=utf-8');
  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      const fallback = path.join(PUBLIC,'index.html');
      res.writeHead(200,{ 'Content-Type': mime['.html'] });
      fs.createReadStream(fallback).pipe(res);
    }
  });
});

server.listen(PORT, () => console.log(`Classic Denim Shop running on port ${PORT}`));
