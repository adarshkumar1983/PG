# StayZen MERN MVP

A responsive multi-tenant PG management SaaS starter built with MongoDB, Express, React and Node.js.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:4000`.

The dashboard uses seeded demo data when MongoDB is unavailable. Copy `.env.example` to `.env` and add `MONGODB_URI` to connect MongoDB.

## Demo login

- Email: `owner@stayzen.demo`
- Password: `demo1234`

## Architecture

- Tenant boundary: `Organization`
- User-to-tenant access: `Membership` with `owner`, `staff`, or `resident` role
- Platform access: `super_admin` on the user account
- Every property, resident, payment, and expense is scoped by `organizationId`
- Protected APIs require both an access token and `x-organization-id`

The current OTP, storage, and payment modules are integration boundaries. Production credentials and provider webhooks should be added after selecting those providers.
