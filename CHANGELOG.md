# CHANGELOG

All notable changes to the SUSI project are documented here.

## [1.0.0] - 2026-07-11

### Added
- **Core Architecture**: Scaffolded Next.js 15+ App Router application.
- **Database & Storage**: Compile Prisma v7 schemas with PostgreSQL backend and MinIO document object storage container.
- **Service Layer & Form Actions**:
  - Units CRUD management service.
  - Tenants registration, status matching, and unit assignments.
  - Calculated Ledger Billing engine for water/electro utility differentials.
  - Arrears monitoring with automated customizable late fee posting (₱500 default) and status triggers.
  - Notice PDF generation and lease agreements storage handler.
- **Portals & Views**:
  - Public marketing homepage (`/`) and vacancy directory boards (`/rooms`).
  - Auth.js credentials provider supporting Landlord logins (`/login`) and Tenant portal magic-links.
  - Landlord admin center (`/admin`, `/units`, `/tenants`, `/billing`, `/ledger`, `/maintenance`, `/documents`) wrapped in styled navigation.
  - Tenant portal dashboard (`/portal`) containing ledger invoice status details and maintenance request forms.
- **Testing & Containerization**:
  - Playwright E2E integration test suite (`tests/susi.spec.ts`).
  - Multi-stage standalone Dockerfile and docker-compose orchestration.
  - GitHub Actions CI build pipeline (`.github/workflows/ci.yml`).
