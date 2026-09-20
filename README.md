# Classic Denim Men's Wear

A Render-ready men's wear shop for **Classic Denim, Gajwel**. The storefront is limited to four categories:

- Jeans
- Track Pants
- Shirts
- T-Shirts

## Owner features

Open `/admin.html` and log in with the `ADMIN_PASSWORD` configured in Render.

The owner can:

- Upload product pictures from a computer/phone
- Add product name, category, price, old price, badge, description and sizes
- Delete products
- Update shop name, address and phone number
- Configure UPI ID
- Enable/disable Cash on Delivery and UPI
- View customer orders

## Shop details pre-configured

- Address: Beside Shivalayam, Main Road, Gajwel
- Contact: 9502747507
- Payment options: Cash on Delivery and UPI (UPI is shown only after a UPI ID is configured)

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:10000`.

Owner page: `http://localhost:10000/admin.html`

## Render deployment

The application stores the product catalog, uploaded images and orders under `DATA_DIR`.

**Important:** Render's filesystem is ephemeral by default. For owner-uploaded images and shop data to survive restarts/deploys, attach a **paid persistent disk** to the web service and set its mount path to `/var/data`. Render documents that persistent disks are available to paid web services and preserve filesystem changes under the mount path. Free web services do not support persistent disks. See: https://render.com/docs/disks and https://render.com/docs/free

Set these environment variables in Render:

```text
ADMIN_PASSWORD = your-strong-owner-password
DATA_DIR = /var/data
```

Build command:

```text
npm install
```

Start command:

```text
npm start
```

## Payment note

Cash on Delivery works as an order option. UPI is a manual payment option: the customer sees the shop UPI ID and the order is marked **Pending Verification**. This app does not verify a UPI transaction automatically. For automatic online payment confirmation, connect a gateway such as Razorpay/Stripe.
