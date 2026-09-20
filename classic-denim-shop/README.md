# Classic Denim Shop

A complete, Render-ready men's denim shop built from scratch using Node.js, Express, HTML, CSS and JavaScript.

## Included

- Responsive storefront
- Hero section, collections, story and newsletter area
- Product catalog with 12 products
- Category filters and sorting
- Product search overlay
- Size selection
- Persistent cart using browser localStorage
- Cart quantity controls and subtotal/shipping calculation
- Demo checkout form
- Order API (`POST /api/orders`)
- Health API (`GET /api/health`)
- Local SVG product artwork
- Render deployment configuration (`render.yaml`)

## Run locally

1. Install Node.js 20+.
2. Open a terminal inside this folder.
3. Run:

```bash
npm install
npm start
```

4. Open `http://localhost:10000`.

## Deploy to Render

### Option A — GitHub + Render Dashboard

1. Create a GitHub repository.
2. Upload all files from this project.
3. In Render, choose **New + → Web Service**.
4. Connect the GitHub repository.
5. Use:
   - Runtime: **Node**
   - Build command: `npm install`
   - Start command: `npm start`
6. Deploy.

### Option B — Render Blueprint

Because `render.yaml` is included, you can use Render's Blueprint flow and select the repository. Render will use the Node service definition automatically.

## Important production notes

This version intentionally uses an in-memory order array for a simple demo. Orders reset when the Render service restarts or redeploys.

For a real store, connect a database such as PostgreSQL and add a payment gateway such as Stripe or Razorpay before accepting real orders.
