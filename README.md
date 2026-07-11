# SUSI - System for Unit & Space Inventory

SUSI is a premium, automated apartment management, ledger transaction tracker, and utility billing application.

---

## Key Features

1.  **Public Marketing Landing Page (`/`)**: Displays live vacant apartments and pitches core features to potential application buyers.
2.  **Public Room Listing (`/rooms`)**: A real-time vacancy catalog showcasing layout rent rates and booking guidelines.
3.  **Landlord Admin Center (`/admin`)**:
    *   **Units Inventory**: Register, modify, and monitor units (Vacant, Occupied, Maintenance statuses).
    *   **Tenants Directory**: Register and manage leases, contact settings, and security deposit details.
    *   **Billing & Ledger**: Post automated utility calculations (Water differential consumption at ₱50/m³, Electricity consumption at ₱12/kWh) and manage transaction records.
    *   **Arrears Checks**: Automate late fees (optional and customizable) and flag late units.
    *   **Documents Management**: Generate lease agreements and eviction notices to print or download.
    *   **Maintenance tickets**: Review and progress tenant-reported issues.
4.  **Tenant Portal (`/portal`)**: Secure dashboards for invited tenants to review balances, download documents, and file maintenance tickets.
5.  **Multi-stage Containerization**: Optimized Next.js standalone container deployment.

---

## Technology Stack

*   **Framework**: Next.js 15+ (App Router)
*   **Database**: PostgreSQL with Prisma v7 ORM
*   **Storage**: MinIO S3 Object Storage for lease/notice files
*   **Styling**: TailwindCSS & Vanilla CSS
*   **Authentication**: Auth.js (NextAuth.js v5 credentials flow)
*   **Testing**: Playwright E2E testing framework

---

## Quick Start (Docker Development)

1.  **Initialize Database and Storage**:
    ```bash
    docker-compose up -d
    ```
2.  **Install dependencies**:
    ```bash
    npm install --legacy-peer-deps
    ```
3.  **Prepare Database**:
    ```bash
    npx prisma db push
    ```
4.  **Start Development Server**:
    ```bash
    npm run dev
    ```

---

## E2E Testing

Run Playwright E2E tests:
```bash
npx playwright test
```

---

## Deployment (Production Build)

Create a optimized standalone image using the Dockerfile:
```bash
docker build -t susi-app .
```
