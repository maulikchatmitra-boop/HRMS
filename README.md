# Multi-Tenant SaaS HRMS — Phase 1

> **Stack**: Node.js · Express.js · MongoDB · Mongoose · JWT · Zod · bcryptjs  
> **Architecture**: Centralized MVC · ES Modules · Single Database · Shared Collections · Explicit Tenant Isolation

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture & Tenant Isolation](#architecture--tenant-isolation)
4. [Phase 1 Modules](#phase-1-modules)
5. [Database Design](#database-design)
6. [Folder & File Structure](#folder--file-structure)
7. [File-by-File Description](#file-by-file-description)
8. [API Endpoints Reference](#api-endpoints-reference)
9. [Permission Keys Reference](#permission-keys-reference)
10. [Default Roles & Permissions Matrix](#default-roles--permissions-matrix)
11. [Authentication Flow](#authentication-flow)
12. [RBAC Authorization Flow](#rbac-authorization-flow)
13. [Audit Log Strategy](#audit-log-strategy)
14. [Environment Variables](#environment-variables)
15. [Setup & Run Instructions](#setup--run-instructions)
16. [Seeding Workflow](#seeding-workflow)
17. [Standard Response Format](#standard-response-format)
18. [Security Architecture](#security-architecture)

---

## Project Overview

This is the Phase 1 backend for a **Multi-Tenant SaaS Human Resource Management System (HRMS)**. Multiple companies (tenants) share a single MongoDB database and collections. All data is logically isolated by a `companyId` field that is propagated explicitly from the authenticated request context throughout the entire service and query layer.

**Key Principles:**
- One database, shared collections, logical tenant isolation via `companyId`
- Admin-controlled company onboarding (no public self-registration in Phase 1)
- Email uniqueness is scoped per company (same email can exist across different companies)
- Permissions use `module.action` dot notation (e.g. `employee.create`)
- All business queries explicitly filter by `companyId: req.user.companyId`
- No automatic global query plugins — developer discipline enforced

---

## Technology Stack

| Layer | Technology |
| :--- | :--- |
| Runtime | Node.js (v18+) |
| Framework | Express.js v4 |
| Database | MongoDB |
| ODM | Mongoose v8 |
| Auth Tokens | JSON Web Tokens (JWT) |
| Password Hashing | bcryptjs (salt rounds: 12) |
| Input Validation | Zod |
| Module System | ES Modules (`"type": "module"`) |
| Dev Server | Nodemon |

---

## Architecture & Tenant Isolation

```
HTTP Request
    │
    ▼
Auth Middleware          ← Validates JWT, attaches req.user = { userId, companyId, roleId }
    │
    ▼
RBAC Middleware          ← Checks req.user.userId against role_permissions + permissions
    │
    ▼
Validation Middleware    ← Parses and sanitizes req.body using Zod schemas
    │
    ▼
Controller               ← Extracts params, calls service with companyId
    │
    ▼
Service                  ← Business logic, all queries include { companyId }
    │
    ▼
Mongoose Model           ← MongoDB query execution
    │
    ▼
MongoDB (Single DB)
```

**Tenant Isolation Rules:**
- Every Mongoose query that touches tenant data **must** include `companyId` explicitly
- `User.find({ companyId })` ✅ — `User.find({})` ❌
- All update/delete operations use `findOneAndUpdate({ _id, companyId })` to prevent IDOR attacks
- `companyId` is always sourced from `req.user.companyId` (the verified JWT payload) — never from client input

---

## Phase 1 Modules

| Module | Base Route | Description |
| :--- | :--- | :--- |
| Authentication | `/api/v1/auth` | Login, logout, password management, current user |
| Company Foundation | `/api/v1/companies` | Tenant onboarding, company settings |
| Users | `/api/v1/users` | Employee CRUD, role assignment |
| Roles | `/api/v1/roles` | Role CRUD, permission mapping |
| Permissions | `/api/v1/permissions` | Global static permissions list |
| Audit Logs | `/api/v1/audit-logs` | Activity history per tenant |

---

## Database Design

### Collection: `companies`
Stores tenant organization records.

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `companyName` | String | ✅ | Display name |
| `companyCode` | String | ✅ | Unique identifier, stored UPPERCASE |
| `email` | String | ✅ | Contact email |
| `phone` | String | ❌ | Contact phone |
| `status` | String | ✅ | `active` / `inactive` |
| `subscriptionStatus` | String | ✅ | `active` / `trial` / `expired` |
| `createdAt` | Date | auto | Mongoose timestamps |
| `updatedAt` | Date | auto | Mongoose timestamps |

**Indexes:** `companyCode: 1` (unique)

---

### Collection: `users`
Stores tenant-scoped user accounts.

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `companyId` | ObjectId | ✅ | Ref → companies |
| `firstName` | String | ✅ | |
| `lastName` | String | ✅ | |
| `email` | String | ✅ | Lowercase, unique per company |
| `password` | String | ✅ | bcrypt hashed, never returned |
| `roleId` | ObjectId | ✅ | Ref → roles |
| `status` | String | ✅ | `active` / `inactive` |
| `lastLogin` | Date | ❌ | Updated on each login |
| `createdBy` | ObjectId | ❌ | Ref → users (null for seeded admin) |
| `updatedBy` | ObjectId | ❌ | Ref → users |
| `createdAt` | Date | auto | Mongoose timestamps |
| `updatedAt` | Date | auto | Mongoose timestamps |

**Indexes:** `{ companyId: 1, email: 1 }` (unique compound)

---

### Collection: `roles`
Stores tenant-scoped roles.

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `companyId` | ObjectId | ✅ | Ref → companies |
| `roleName` | String | ✅ | Unique per company |
| `description` | String | ❌ | |
| `createdBy` | ObjectId | ✅ | Ref → users |
| `updatedBy` | ObjectId | ✅ | Ref → users |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ companyId: 1, roleName: 1 }` (unique compound)

---

### Collection: `permissions`
Global static metadata for system permissions. **Not company-scoped.**

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `module` | String | ✅ | e.g. `employee` |
| `action` | String | ✅ | e.g. `create` |
| `permissionKey` | String | ✅ | e.g. `employee.create` (globally unique) |

**Indexes:** `permissionKey: 1` (unique)

---

### Collection: `role_permissions`
Maps tenant roles to global permissions.

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `companyId` | ObjectId | ✅ | Ref → companies |
| `roleId` | ObjectId | ✅ | Ref → roles |
| `permissionId` | ObjectId | ✅ | Ref → permissions |
| `createdBy` | ObjectId | ✅ | Ref → users |
| `updatedBy` | ObjectId | ✅ | Ref → users |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ companyId: 1, roleId: 1, permissionId: 1 }` (unique compound)

---

### Collection: `audit_logs`
Immutable activity trail. No `updatedAt`.

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `companyId` | ObjectId | ✅ | Ref → companies |
| `userId` | ObjectId | ✅ | Ref → users (actor) |
| `module` | String | ✅ | e.g. `user`, `role`, `auth` |
| `action` | String | ✅ | e.g. `create`, `login`, `delete` |
| `oldData` | Mixed | ❌ | Previous state snapshot |
| `newData` | Mixed | ❌ | New state snapshot |
| `ipAddress` | String | ❌ | Requester IP |
| `createdAt` | Date | auto | Indexed for sort |

---

## Folder & File Structure

```
d:\Company\HRMS\
├── README.md                          ← This file
│
└── backend/
    ├── docs/
    │   └── api_endpoints.md           ← API payload & response documentation
    │
    ├── scripts/
    │   └── seed.js                    ← Global permissions seeder script
    │
    ├── src/
    │   ├── database/
    │   │   └── connection.js          ← Mongoose connection manager
    │   │
    │   ├── models/
    │   │   ├── company.model.js       ← companies collection schema
    │   │   ├── user.model.js          ← users collection schema
    │   │   ├── role.model.js          ← roles collection schema
    │   │   ├── role-permission.model.js  ← role_permissions collection schema
    │   │   ├── permission.model.js    ← permissions collection schema
    │   │   └── audit-log.model.js     ← audit_logs collection schema
    │   │
    │   ├── services/
    │   │   ├── auth.service.js        ← login, logout, password flows, hasPermission()
    │   │   ├── company.service.js     ← onboardCompany (transaction), updateCompany
    │   │   ├── user.service.js        ← createUser, getUsers, updateUser, deleteUser
    │   │   ├── role.service.js        ← createRole, assignPermissionsToRole, deleteRole
    │   │   ├── permission.service.js  ← getPermissions, bootstrapPermissions
    │   │   └── auditLog.service.js    ← logAction() reusable audit writer, getAuditLogs
    │   │
    │   ├── controllers/
    │   │   ├── auth.controller.js     ← login, logout, me, forgotPassword, resetPassword, changePassword
    │   │   ├── company.controller.js  ← onboardCompany, getCompany, updateCompany
    │   │   ├── user.controller.js     ← createUser, getUsers, getUser, updateUser, deleteUser
    │   │   ├── role.controller.js     ← createRole, getRoles, updateRole, deleteRole, assignPermissions
    │   │   ├── permission.controller.js ← getPermissions
    │   │   └── audit-log.controller.js  ← getAuditLogs
    │   │
    │   ├── middlewares/
    │   │   ├── auth.middleware.js     ← JWT Bearer token verification → attaches req.user
    │   │   ├── rbac.middleware.js     ← authorize(permissionKey) → calls hasPermission()
    │   │   ├── validate.middleware.js ← validate(zodSchema) → sanitizes req.body
    │   │   ├── audit.middleware.js    ← request-level audit logging hook (extensible)
    │   │   └── error.middleware.js    ← Global error handler: formats Mongo & Zod errors
    │   │
    │   ├── routes/
    │   │   ├── index.js               ← Aggregates all module routes under /api/v1
    │   │   ├── auth.routes.js         ← POST /login, /logout, /forgot-password, /reset-password, /change-password, GET /me
    │   │   ├── company.routes.js      ← POST /onboard, GET /, PUT /
    │   │   ├── user.routes.js         ← POST /, GET /, GET /:id, PUT /:id, DELETE /:id
    │   │   ├── role.routes.js         ← POST /, GET /, PUT /:id, DELETE /:id, POST /:id/permissions, GET /:id/permissions
    │   │   ├── permission.routes.js   ← GET /
    │   │   └── audit-log.routes.js    ← GET /
    │   │
    │   ├── validators/
    │   │   ├── auth.validator.js      ← loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema
    │   │   ├── company.validator.js   ← onboardCompanySchema, updateCompanySchema
    │   │   ├── user.validator.js      ← createUserSchema, updateUserSchema
    │   │   └── role.validator.js      ← createRoleSchema, updateRoleSchema, assignPermissionsSchema
    │   │
    │   ├── utils/
    │   │   └── auth.utils.js          ← hashPassword, comparePassword, generateAccessToken, generateRefreshToken, generateResetToken, verifyToken
    │   │
    │   ├── app.js                     ← Express app: helmet, cors, body-parser, routes, error handler
    │   └── server.js                  ← Entry point: loads .env, connects DB, starts HTTP server
    │
    └── package.json
```

---

## File-by-File Description

### `src/database/connection.js`
Exports `connectDatabase()` async function. Called once at server startup from `server.js`. Connects Mongoose to the MongoDB URI from the environment.

### `src/models/`
All models are registered with explicit    names using the 3rd argument of `mongoose.model()` to prevent Mongoose from auto-pluralizing or renaming collections.

| File | `mongoose.model(name, schema, collectionName)` |
| :--- | :--- |
| `company.model.js` | `Company`, `CompanySchema`, `'companies'` |
| `user.model.js` | `User`, `UserSchema`, `'users'` |
| `role.model.js` | `Role`, `RoleSchema`, `'roles'` |
| `role-permission.model.js` | `RolePermission`, `RolePermissionSchema`, `'role_permissions'` |
| `permission.model.js` | `Permission`, `PermissionSchema`, `'permissions'` |
| `audit-log.model.js` | `AuditLog`, `AuditLogSchema`, `'audit_logs'` |

### `src/services/auth.service.js`
Core authentication service. Contains all authentication business logic:
- `login(companyCode, email, password)` — Resolves tenant by `companyCode`, matches user by `email + companyId`, verifies bcrypt hash, issues Access + Refresh tokens, updates `lastLogin`
- `logout(companyId, userId)` — Logs the logout audit event
- `forgotPassword(email, companyCode)` — Issues a stateless 30-minute JWT reset token
- `resetPassword(token, newPassword)` — Verifies reset token, hashes and saves new password
- `changePassword(userId, companyId, oldPassword, newPassword, actorId)` — Verifies current password before updating
- `getCurrentUser(userId, companyId)` — Returns populated user session
- `hasPermission(userId, permissionKey)` — Resolves user → role → role_permissions → permission

### `src/services/company.service.js`
Handles tenant provisioning inside a Mongoose session (transaction):
- `onboardCompany(companyData, adminData, actorId)` — Creates the company, seeds all 4 default roles, maps default permissions to each role, creates the initial Company Admin user
- `getCompanyById(companyId)` — Fetches company record
- `updateCompany(companyId, updateData, actorId)` — Updates allowed fields, logs old/new state

### `src/services/user.service.js`
- `createUser(companyId, userData, actorId)` — Validates email uniqueness within company, validates role belongs to company, hashes password, creates user
- `getUserById(companyId, userId)` — Finds user ensuring `companyId` match (IDOR protection)
- `getUsers(companyId, filter)` — Lists users with optional query filters
- `updateUser(companyId, userId, updateData, actorId)` — Validates email/role constraints before update
- `deleteUser(companyId, userId, actorId)` — Prevents self-deletion, hard deletes within tenant scope

### `src/services/role.service.js`
- `createRole`, `getRoles`, `updateRole`, `deleteRole` — All scoped by `companyId`
- `deleteRole` — Checks if any users are currently assigned before deleting; cascades permission mapping deletion in a transaction
- `assignPermissionsToRole(companyId, roleId, permissionIds, actorId)` — Replaces all role_permissions for the role in a transaction; validates all permissionIds exist globally
- `getRolePermissions(companyId, roleId)` — Returns permission documents populated from global collection

### `src/services/permission.service.js`
- `getPermissions()` — Returns all global static permissions
- `bootstrapPermissions(permissionsList)` — Called by the seed script; idempotent insertion of system permissions

### `src/services/auditLog.service.js`
- `logAction({ companyId, userId, module, action, oldData, newData, ipAddress })` — Reusable function imported by all other services to write audit records
- `getAuditLogs(companyId, filter, limit)` — Returns sorted, paginated logs with actor name populated

### `src/middlewares/auth.middleware.js`
Verifies the `Authorization: Bearer <token>` header using `verifyToken('access')` from `auth.utils.js`. Attaches `req.user = { userId, companyId, roleId }` on success.

### `src/middlewares/rbac.middleware.js`
Higher-order middleware factory: `authorize(permissionKey)`. Calls `hasPermission(req.user.userId, permissionKey)` from the auth service. Returns `403 Forbidden` if not allowed.

### `src/middlewares/validate.middleware.js`
Higher-order middleware factory: `validate(zodSchema)`. Calls `schema.safeParse(req.body)`. On failure, returns `400` with a structured `errors[]` array containing `{ field, message }`. On success, replaces `req.body` with the clean parsed data.

### `src/middlewares/error.middleware.js`
Global Express error handler (4-argument signature). Formats:
- `ValidationError` → Mongoose validation errors
- `code 11000` → MongoDB duplicate key constraint
- `CastError` → Invalid ObjectId format
- All others → 500 Internal Server Error (includes stack in development mode)

### `src/utils/auth.utils.js`
Single consolidated utility file for all security operations:
- `hashPassword(password)` — bcrypt hash with salt rounds 12
- `comparePassword(password, hash)` — bcrypt compare
- `generateAccessToken(payload)` — Signs with `JWT_ACCESS_SECRET`, expires 15m
- `generateRefreshToken(payload)` — Signs with `JWT_REFRESH_SECRET`, expires 7d
- `generateResetToken(payload)` — Signs with `JWT_RESET_SECRET`, expires 30m
- `verifyToken(token, type)` — Verifies using the correct secret based on `type: 'access' | 'refresh' | 'reset'`

### `src/app.js`
Configures and exports the Express application:
1. `helmet()` — Sets secure HTTP headers
2. `cors()` — Configures CORS origin from `process.env.CORS_ORIGIN`
3. `express.json()` + `express.urlencoded()` — Body parsing
4. `auditLogger` — Request-level audit hook
5. `router` — Mounted at `/api/v1`
6. `*` wildcard 404 handler
7. `errorHandler` — Global error handler (must be last)

### `src/server.js`
Application entry point:
1. `dotenv.config()` — Loads `.env` file
2. `connectDatabase()` — Establishes MongoDB connection
3. `app.listen(PORT)` — Starts HTTP server
4. Process-level error handlers for `unhandledRejection` and `uncaughtException`

---

## API Endpoints Reference

Base URL: `http://localhost:5000/api/v1`

| Method | Endpoint | Auth | Permission | Description |
| :--- | :--- | :--- | :--- | :--- |
| POST | `/auth/login` | Public | — | Login with companyCode + email + password |
| POST | `/auth/logout` | ✅ | — | Logout and clear refresh cookie |
| POST | `/auth/forgot-password` | Public | — | Generate password reset token |
| POST | `/auth/reset-password` | Public | — | Reset password with token |
| POST | `/auth/change-password` | ✅ | — | Change password (authenticated) |
| GET | `/auth/me` | ✅ | — | Get current user session |
| POST | `/companies/onboard` | Public | — | Onboard new company (admin-controlled) |
| GET | `/companies` | ✅ | `company.view` | Get own company details |
| PUT | `/companies` | ✅ | `company.edit` | Update company settings |
| POST | `/users` | ✅ | `employee.create` | Create a new user |
| GET | `/users` | ✅ | `employee.view` | List all users in company |
| GET | `/users/:id` | ✅ | `employee.view` | Get a single user |
| PUT | `/users/:id` | ✅ | `employee.edit` | Update user details |
| DELETE | `/users/:id` | ✅ | `employee.delete` | Delete a user |
| POST | `/roles` | ✅ | `role.edit` | Create a new role |
| GET | `/roles` | ✅ | `role.view` | List all roles |
| PUT | `/roles/:id` | ✅ | `role.edit` | Update a role |
| DELETE | `/roles/:id` | ✅ | `role.edit` | Delete a role |
| POST | `/roles/:id/permissions` | ✅ | `role.edit` | Assign permissions to role (replaces all) |
| GET | `/roles/:id/permissions` | ✅ | `role.view` | Get permissions assigned to role |
| GET | `/permissions` | ✅ | `role.view` | List all global system permissions |
| GET | `/audit-logs` | ✅ | `audit.view` | Get company audit logs |
| GET | `/health` | Public | — | System health check |

---

## Permission Keys Reference

All permissions follow the `module.action` convention:

| Permission Key | Module | Action | Description |
| :--- | :--- | :--- | :--- |
| `employee.create` | employee | create | Add new employees |
| `employee.view` | employee | view | View employee directory & profiles |
| `employee.edit` | employee | edit | Update employee details |
| `employee.delete` | employee | delete | Delete employee accounts |
| `company.view` | company | view | View company settings |
| `company.edit` | company | edit | Modify company settings |
| `role.view` | role | view | View roles and permission mappings |
| `role.edit` | role | edit | Create, update, delete roles and mappings |
| `audit.view` | audit | view | View audit log history |

---

## Default Roles & Permissions Matrix

When a company is onboarded, 3 default roles are automatically created and mapped:

| Permission Key | Company Admin | HR | Employee |
| :--- | :---: | :---: | :---: |
| `employee.create` | ✅ | ✅ | ❌ |
| `employee.view` | ✅ | ✅ | ❌ |
| `employee.edit` | ✅ | ✅ | ❌ |
| `employee.delete` | ✅ | ✅ | ❌ |
| `company.view` | ✅ | ✅ | ✅ |
| `company.edit` | ✅ | ❌ | ❌ |
| `role.view` | ✅ | ✅ | ❌ |
| `role.edit` | ✅ | ❌ | ❌ |
| `audit.view` | ✅ | ✅ | ❌ |

> [!NOTE]
> All default roles (such as HR and Employee) can be renamed, modified, or deleted by the administrator, except the `Company Admin` system role which is protected from deletion to prevent accidental lockout.

---

## Authentication Flow

```
Client
  │
  ├─ POST /auth/login { companyCode, email, password }
  │     │
  │     ├─ Find Company by companyCode (must be 'active')
  │     ├─ Find User by { email, companyId } (must be 'active')
  │     ├─ bcrypt.compare(password, user.password)
  │     ├─ Update user.lastLogin
  │     ├─ Sign Access Token (15m) + Refresh Token (7d)
  │     ├─ Write audit log: { module: 'auth', action: 'login' }
  │     └─ Return { user, company, accessToken } + Set refreshToken cookie
  │
  ├─ All protected requests
  │     └─ Authorization: Bearer <accessToken>
  │           └─ Auth Middleware verifies → attaches req.user
  │
  └─ POST /auth/forgot-password { companyCode, email }
        └─ Issues stateless Reset Token (30m) containing { userId, companyId, action: 'reset_password' }
              └─ POST /auth/reset-password { token, newPassword }
                    └─ Verifies reset token, hashes new password, saves
```

---

## RBAC Authorization Flow

```
Request enters RBAC Middleware: authorize('employee.create')
  │
  ├─ Check req.user.userId exists
  │
  ├─ Find User by userId → get user.companyId + user.roleId + user.status
  │
  ├─ Find Permission by permissionKey = 'employee.create'
  │
  ├─ Find RolePermission where { companyId, roleId, permissionId }
  │
  ├─ Match found? → next()         [Allow]
  └─ No match?   → 403 Forbidden  [Deny]
```

---

## Audit Log Strategy

Every service method that mutates data calls `logAction()` from `auditLog.service.js`:

```js
await logAction({
  companyId,          // Tenant scope
  userId,             // Actor who performed the action
  module: 'user',     // Which module was affected
  action: 'create',   // What happened
  oldData: null,      // Previous state (null for creates)
  newData: savedUser, // New state (null for deletes)
  ipAddress           // Optional request IP
});
```

Passwords and sensitive fields are **deleted from data snapshots** before writing to audit_logs.

---

## Environment Variables

Create a `.env` file inside `backend/`:

```env
# Server
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# MongoDB
MONGODB_URI=mongodb://127.0.0.1:27017/hrms

# JWT Secrets (use strong random strings in production)
JWT_ACCESS_SECRET=your_access_token_secret_here
JWT_REFRESH_SECRET=your_refresh_token_secret_here
JWT_RESET_SECRET=your_password_reset_token_secret_here
```

---

## Setup & Run Instructions

### Prerequisites
- Node.js v18 or higher
- MongoDB running locally or a MongoDB Atlas connection string

### Step 1 — Install dependencies
```bash
cd backend
npm install
```

### Step 2 — Configure environment
Create `backend/.env` with the variables listed above.

### Step 3 — Seed global permissions (run once)
```bash
npm run seed
```
This populates the global `permissions` collection with all 9 system permission keys. It is **idempotent** — safe to run multiple times.

### Step 4 — Onboard the first company
Call the onboarding endpoint once after seeding:
```bash
POST http://localhost:5000/api/v1/companies/onboard
Content-Type: application/json

{
  "company": {
    "companyName": "Acme Corp",
    "companyCode": "ACME",
    "email": "admin@acme.com",
    "phone": "+1234567890"
  },
  "admin": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@acme.com",
    "password": "AdminPass123"
  }
}
```
This creates the company, 4 default roles, all permission mappings, and the admin user in one atomic transaction.

### Step 5 — Start the development server
```bash
npm run dev
```
API is live at: `http://localhost:5000/api/v1`

### Available npm Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| `npm run dev` | `nodemon src/server.js` | Development server with hot reload |
| `npm start` | `node src/server.js` | Production server |
| `npm run seed` | `node scripts/seed.js` | Seed global permissions database |
| `npm run seed:it` | `node scripts/seedItDemoData.js` | Seed real-world IT companies, departments, designations, branches, shifts, holidays, roles, and employees |

---

## Seeding Workflow

```
Phase 1: Bootstrap (once globally)
  └─ npm run seed
        └─ Connects to MongoDB
        └─ Calls bootstrapPermissions([ all 9 permission objects ])
        └─ Inserts new, skips existing
        └─ Logs: "Inserted: X | Skipped: Y"
        └─ Disconnects

Phase 2: Tenant Onboarding (once per company)
  └─ POST /companies/onboard { company, admin }
        └─ Creates Company record
        └─ Creates 4 default Roles (Company Admin, HR, Manager, Employee)
        └─ Queries global permissions collection
        └─ Creates role_permissions mappings per default matrix
        └─ Creates initial Admin User (password hashed)
        └─ Writes audit log entry
        └─ All steps wrapped in Mongoose session transaction (atomic)
```

---

## Standard Response Format

All API responses follow this consistent structure:

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Descriptive success message."
}
```

**Validation Error (400):**
```json
{
  "success": false,
  "data": null,
  "message": "Validation failed.",
  "errors": [
    { "field": "email", "message": "Please enter a valid email address." }
  ]
}
```

**Auth Error (401):**
```json
{
  "success": false,
  "data": null,
  "message": "Authentication token has expired."
}
```

**Permission Error (403):**
```json
{
  "success": false,
  "data": null,
  "message": "Access forbidden. You do not have permission to perform this action."
}
```

**Server Error (500):**
```json
{
  "success": false,
  "data": null,
  "message": "Internal Server Error",
  "stack": "...only visible in development mode"
}
```

---

## Security Architecture

| Concern | Implementation |
| :--- | :--- |
| Password Storage | bcrypt hash, salt rounds 12 |
| Access Tokens | JWT signed, expires in 15 minutes |
| Refresh Tokens | JWT signed, expires in 7 days, stored in HttpOnly + Secure + SameSite=Strict cookie |
| Reset Tokens | Stateless JWT signed, expires in 30 minutes, verified by type-specific secret |
| Tenant Isolation | Explicit `companyId` in every tenant query — no global automatic injection |
| IDOR Prevention | All ID-based queries include `{ _id, companyId }` to prevent cross-tenant access |
| Input Sanitization | Zod schema validation strips unrecognized keys from all request bodies |
| HTTP Security Headers | `helmet` middleware sets HSTS, CSP, and disables `X-Powered-By` |
| Error Disclosure | Stack traces only exposed in `NODE_ENV=development` |
| Duplicate Key Errors | Mongo `code 11000` errors are caught and returned as user-friendly `400` responses |
