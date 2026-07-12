**Project Overview**
Please initialize and build the MVP for **SUSI (System for Unit & Space Inventory)**, a single-tenant apartment management and billing system. This app is designed for a single landlord to manage units, track utility meters, maintain a financial ledger, and generate automated PDF bills.
**Architecture & API-First Design**

* **Service Layer Pattern:** All business logic (billing calculations, arrears tracking, meter reading updates) must be encapsulated in dedicated Service functions, independent of UI components. This ensures the logic can be consumed by both the Next.js frontend and a future Android API/APK.
* **Next.js Implementation:** Use App Router. Expose functionality via Server Actions for the web dashboard, but ensure the underlying services are structured to be easily exposed as RESTful API routes in the future.

**Tech Stack & Infrastructure**

* **Framework:** Next.js (App Router).
* **Database:** PostgreSQL (via Prisma ORM).
* **Styling & UI:** Tailwind CSS, shadcn/ui.
* **PDF Generation:** `@react-pdf/renderer` (to run on ARM64 OCI instance).
* **Email:** Nodemailer (configured for OCI Always Free SMTP relay).
* **Storage:** Modern MinIO (via Docker) using Service Accounts for secure file management.
* **Staging:** Will deploy to a local pi5 before deploying to Oracle Always Free VM.
* **Production:** Will deploy to Oracle Always Free VM.
* **Testing:** Will use Playwright for end-to-end testing.
* **Containerization:** Use Docker for local development and deployment.
* **CI/CD:** Use GitHub Actions for automated testing and deployment.

**Core Features**

1. **Hybrid Tenant Model:** Tenants have a `billingPreference` (APP, EMAIL, PRINT). App access is invite-only via Auth.js.
2. **Financial Ledger:** Track all charges and payments; handle partial payments.
3. **Arrears & Eviction Workflow:** Tiered logic:

* 15 Days: Flag account, apply late fee, unlock "Notice of Arrears" print.
* 30 Days: Highlight unit status.
* 90 Days: Unlock "Notice of Eviction" template.

1. **Billing Workflow:** Monthly bill generation computes meter differences, generates a PDF, stores it in MinIO, and sends an email via OCI SMTP.
2. **Public Portal:** Unauthenticated `/rooms` route for listing vacant units and requirements.

**Database Schema (Prisma)**

* `Unit`: roomNumber, monthlyRate, status (VACANT, OCCUPIED, MAINTENANCE), waterMeter, electroMeter.
* `Tenant`: firstName, lastName, email, phone, status, depositPaid, advancePaid, billingPreference, appAccess.
* `Ledger`: type (CHARGE, PAYMENT, CREDIT), amount, description, receiptUrl, isVerified.
* `MaintenanceRequest`: title, description, imageUrl, status.
* `Document`: type, fileUrl.

**Agent Instructions**

1. **Setup:** Initialize the Next.js project and install required dependencies.
2. **Infrastructure:** Create `docker-compose.yml` for Postgres and MinIO.
3. **Database:** Scaffold the Prisma schema.
4. **Implementation Plan:** Before coding, provide a plan detailing how the Service Layer will be structured to support both web and future mobile API consumption.
5. **Create a README>.md** for deployment instructions and getting started guides.
6. **Create a DOCS>.md** for API documentation.
7. **Create a TESTING>.md** for testing instructions.
8. **Create a PROJECT_PLAN>.md** for project roadmap and milestones.
9. **Versioning:** we will use semantic versioning for our releases and maintain a changelog of all changes.
10. **em-dash:** do not use em-dashes in code or documentation. Use hyphens instead.
