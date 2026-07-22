# Everyday Supply Co.

E-commerce storefront and internal CRM for a wholesale supply business based in Johannesburg, South Africa. Handles product catalog, customer management, sales tracking, and inventory — all backed by Firebase.

**Live:** [everydaysupplies.co.za](https://everydaysupplies.co.za)

## What this is

Two apps under one repo:

1. **Storefront** (`index.html`) — Public-facing product catalog. Customers browse products by category, add to cart, and check out via WhatsApp. Built with TailwindCSS.

2. **CRM Dashboard** (`/crm`) — Admin-only panel behind Firebase Auth. Manages customers, records sales, tracks inventory levels, schedules follow-ups, and generates basic revenue reports. Built with vanilla CSS.

Both share the same Firebase backend (Auth + Firestore).

## Tech

- HTML, CSS, vanilla JavaScript — no frameworks
- Firebase Auth (email/password + Google sign-in)
- Cloud Firestore for all persistent data
- TailwindCSS 3.x for the storefront styling
- Hosted on GitHub Pages with custom domain

## Project layout

```
├── index.html            # storefront
├── info.html             # about/info page
├── 404.html              # custom error page
├── css/
│   ├── input.css         # tailwind source
│   └── styles.css        # compiled output
├── js/
│   ├── app.js            # storefront logic
│   ├── ui.js             # DOM rendering
│   ├── cart.js           # cart state
│   ├── firebase.js       # firebase init
│   ├── data.js           # product data
│   └── utils.js          # helpers
├── crm/
│   ├── index.html        # CRM single-page app
│   ├── config.json       # CRM settings
│   ├── css/style.css     # CRM styles
│   └── js/
│       ├── app.js        # all CRM logic (~1700 lines)
│       └── firebase-config.js
├── images/               # logos, product photos, favicons
├── manifest.json         # PWA manifest
├── sitemap.xml
└── package.json
```

## CRM features

- Customer database with status tracking (Lead, Active, Repeat, Inactive)
- Sales recording with payment status (Paid / Credit) and delivery tracking
- Product inventory with stock-in, stock-out, and low-stock alerts
- Follow-up scheduler with WhatsApp integration for outreach
- Revenue and outstanding credit reporting
- CSV import/export for customers, products, and sales
- Real-time Firestore sync with connection status indicator

## Running locally

```bash
npm install
npm run dev     # starts tailwind in watch mode
npm start       # launches live-server
```

You'll need your own Firebase project. Update credentials in `js/firebase.js` and `crm/js/firebase-config.js`.

Firebase setup:
- Enable Authentication (email/password + Google provider)
- Create a Firestore database
- Deploy security rules from `firebaserules`

## Deployment

Hosted on GitHub Pages. The `CNAME` file points to `everydaysupplies.co.za`. Push to `main` and it deploys automatically.

## Author

Avuyile Mthembu — [@mthembuavuyile](https://github.com/mthembuavuyile)

## License

ISC
