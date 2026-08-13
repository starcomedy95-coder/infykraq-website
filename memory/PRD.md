# INFYKRAQ — Product Requirements Document

## Original problem statement (verbatim intent)
Multi-category e-commerce (sandals/footwear, electronics, watches, accessories). Premium look, fast, mobile-first.
Sections: homepage (logo, search, categories, new arrivals, bestsellers, flash sale, reviews, newsletter, footer),
category page, product detail page (images, optional video, zoom, dynamic attributes, price section, Buy Now,
wishlist, pincode check, delivery estimate, return policy), cart (qty update, coupon, shipping, GST),
checkout (contact, address, payment gateway + COD, order summary, coupon), payment gateway (Razorpay/PhonePe),
order system (order ID, invoice PDF, email/WhatsApp notification, status updates), customer account,
admin panel (product management, dynamic category fields, inventory, shipping, GST reports, coupons, offers,
website settings, customer management). Brand: INFYKRAQ. Contact: 9639905611. Email: waqutsaini@gmail.com.
Security: SSL, admin protection, role-based access, daily backup.
Expansion — Phase 1: website, payment, COD, shipping, GST. Phase 2: Android/iOS app. Phase 3: loyalty/referral.

## Architecture
- Frontend: React 19 + React Router + Tailwind + shadcn/ui + sonner. Contexts: AuthContext (cookie session), CartContext (localStorage).
- Backend: FastAPI single module `/app/backend/server.py`, all routes under `/api`. Seed data in `seed_data.py`.
- DB: MongoDB (`MONGO_URL`, `DB_NAME`). Collections: users, user_sessions, products, categories, coupons,
  reviews, orders, wishlists, settings, newsletter.
- Auth: (1) custom JWT email/password → httpOnly `access_token` cookie; (2) Emergent-managed Google sign-in →
  httpOnly `session_token` cookie backed by `user_sessions` (7-day expiry). Role-based access: customer / admin.
- Pricing engine (`compute_totals`): GST 18% inclusive, free shipping above ₹999 else ₹79, COD fee ₹49, percent/flat coupons.

## User personas
- Shopper (mobile-first): browses categories, checks pincode delivery, applies coupons, pays online or COD.
- Registered customer: tracks orders, keeps a wishlist, reuses saved contact details.
- Store owner / admin: manages products with dynamic per-category attributes, inventory, coupons, order status,
  GST reports, customers and website settings.

## Core requirements (static)
1. Premium, mobile-first storefront with search and category navigation.
2. Product detail with gallery, dynamic attributes, pincode/delivery estimate, return policy.
3. Cart + coupon + GST + shipping, checkout with online payment and COD.
4. Order lifecycle with order ID, invoice, status timeline.
5. Admin panel with role-based protection.
6. Brand settings editable (name, phone, email, announcement).

## Implemented (2026-06)
- 2026-06: Homepage (bento hero, category grid, flash sale with live countdown, new arrivals rail, bestsellers,
  reviews, newsletter, footer with brand contact), category/search page with price + sort filters.
- 2026-06: PDP — gallery with thumbnails and hover zoom, dynamic attributes, price/discount block, pincode
  serviceability + ETA + COD availability, return policy accordion, reviews, related products, sticky mobile bar.
- 2026-06: Cart (qty update, remove, coupon apply/suggestions, GST + shipping breakdown) and Checkout
  (contact, address, COD vs online, order summary).
- 2026-06: Orders — order number, status timeline, invoice via print, customer account order list, wishlist.
- 2026-06: Admin panel — stats, orders + status updates, product CRUD with dynamic attribute/spec editor,
  inventory low-stock alerts, coupon CRUD, customer list, monthly GST report, website settings.
- 2026-06: JWT auth with bcrypt, admin seeding, role-based 403 on `/api/admin/*`.
- 2026-06: Emergent-managed Google sign-in added alongside JWT (session exchange endpoint, callback route,
  "Continue with Google" on /login). Verified: 39/39 backend tests + all critical frontend flows pass.

## MOCKED
- Online payment gateway (Razorpay/PhonePe) — order marked paid without a real gateway.
- Email/WhatsApp order notifications — server-side log only.
- Invoice PDF — browser print dialog instead of a generated PDF.

## Backlog (prioritized)
P0
- Real Razorpay/PhonePe payment gateway with webhook verification.
- Server-generated invoice PDF with GSTIN, HSN and place-of-supply.
P1
- Email/WhatsApp notifications on order placement and each status change.
- Product image uploads in admin (object storage) instead of URL pasting.
- Address book on customer account + saved addresses at checkout.
- Product video support on PDP (field already exists in the model).
P2
- Offers/banner management, category CRUD in admin.
- Loyalty & referral program (Phase 3), reviews submitted by verified buyers.
- Daily DB backup automation, order export (CSV) for accounting.

## Next tasks
1. Wire a real payment gateway and replace the demo online-payment path.
2. Generate a downloadable GST invoice PDF per order.
3. Transactional email/WhatsApp notifications for order + status updates.
