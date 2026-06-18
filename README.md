# Multi-Tenant SaaS HRMS — Complete Technical Blueprint

> **Stack**: Node.js · Express.js · MongoDB · Mongoose · JWT · Zod · bcryptjs  
> **Architecture**: Centralized MVC · ES Modules · Single Database · Shared Collections · Explicit Tenant Isolation

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture & Tenant Isolation](#architecture--tenant-isolation)
4. [Functional Modules](#functional-modules)
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

This is the technical manual for the **Multi-Tenant SaaS Human Resource Management System (HRMS)**. Multiple companies (tenants) share a single MongoDB database and collections. All data is logically isolated by a `companyId` field that is propagated explicitly from the authenticated request context throughout the entire service and query layer.

**Key Principles:**
- One database, shared collections, logical tenant isolation via `companyId`
- Admin-controlled company onboarding (no public self-registration)
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

## Functional Modules

| Module | Base Route | Description |
| :--- | :--- | :--- |
| Authentication | `/api/v1/auth` | Login, logout, password change, current session user |
| Company Foundation | `/api/v1/companies` | Tenant onboarding, company settings management |
| Employees | `/api/v1/employees` | User directory, onboarding, termination, manager links |
| Departments | `/api/v1/departments` | Business unit organization with unique codes |
| Designations | `/api/v1/designations` | Corporate title levels |
| Branches | `/api/v1/branches` | Physical office locations |
| Shifts | `/api/v1/shifts` | Core working hours schedules (24-hour inputs) |
| Holidays | `/api/v1/holidays` | Company holidays calendar |
| Roles & Permissions | `/api/v1/roles` | RBAC role definitions and dynamic permissions mapping |
| Audit Logs | `/api/v1/audit-logs` | Immutable activity trail tracking oldData vs newData |
| Leave Management | `/api/v1/leave` | LMS: types, policies, balances, requests pipeline, calendar |

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
| `departmentId` | ObjectId | ❌ | Ref → departments |
| `designationId` | ObjectId | ❌ | Ref → designations |
| `branchId` | ObjectId | ❌ | Ref → branches |
| `shiftId` | ObjectId | ❌ | Ref → shifts |
| `reportingManagerId`| ObjectId | ❌ | Ref → users |
| `lastLogin` | Date | ❌ | Updated on each login |
| `createdBy` | ObjectId | ❌ | Ref → users (null for seeded admin) |
| `updatedBy` | ObjectId | ❌ | Ref → users |
| `createdAt` | Date | auto | Mongoose timestamps |
| `updatedAt` | Date | auto | Mongoose timestamps |

**Indexes:** `{ companyId: 1, email: 1 }` (unique compound)

---

### Collection: `departments`
Stores tenant-scoped business departments.

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `companyId` | ObjectId | ✅ | Ref → companies |
| `name` | String | ✅ | Department name |
| `code` | String | ✅ | Unique code per company |
| `description` | String | ❌ | |
| `createdBy` | ObjectId | ✅ | Ref → users |
| `updatedBy` | ObjectId | ✅ | Ref → users |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ companyId: 1, code: 1 }` (unique compound)

---

### Collection: `designations`
Stores corporate job title designations.

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `companyId` | ObjectId | ✅ | Ref → companies |
| `title` | String | ✅ | designation title |
| `description` | String | ❌ | |
| `createdBy` | ObjectId | ✅ | Ref → users |
| `updatedBy` | ObjectId | ✅ | Ref → users |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ companyId: 1, title: 1 }` (unique compound)

---

### Collection: `branches`
Stores office location details.

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `companyId` | ObjectId | ✅ | Ref → companies |
| `name` | String | ✅ | Location name |
| `address` | String | ✅ | |
| `city` | String | ✅ | |
| `state` | String | ✅ | |
| `country` | String | ✅ | |
| `zipCode` | String | ✅ | |
| `createdBy` | ObjectId | ✅ | Ref → users |
| `updatedBy` | ObjectId | ✅ | Ref → users |

---

### Collection: `shifts`
Stores operational shift hour periods.

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `companyId` | ObjectId | ✅ | Ref → companies |
| `name` | String | ✅ | Shift name |
| `startTime` | String | ✅ | Start time `HH:MM` |
| `endTime` | String | ✅ | End time `HH:MM` |
| `description` | String | ❌ | |
| `createdBy` | ObjectId | ✅ | Ref → users |
| `updatedBy` | ObjectId | ✅ | Ref → users |

---

### Collection: `holiday_calendars`
Stores company-scoped public/optional holidays.

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `companyId` | ObjectId | ✅ | Ref → companies |
| `name` | String | ✅ | Holiday description |
| `date` | Date | ✅ | |
| `description` | String | ❌ | |
| `isOptional` | Boolean | ✅ | Optional rest day |
| `isDeleted` | Boolean | ✅ | Soft delete flag |

---

### Collection: `roles`
Stores tenant-scoped security authorization roles.

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
| `module` | String | ✅ | e.g. `employee`, `leave` |
| `action` | String | ✅ | e.g. `create`, `apply` |
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

### Collection: `leave_types`
Stores leaves categories.

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `companyId` | ObjectId | ✅ | Ref → companies |
| `name` | String | ✅ | Type name |
| `code` | String | ✅ | Short code (e.g. SL, CL, LOP) |
| `description` | String | ❌ | |
| `status` | String | ✅ | `active` / `inactive` |

---

### Collection: `leave_policies`
Stores leave allocation quotas per LeaveType.

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `companyId` | ObjectId | ✅ | Ref → companies |
| `name` | String | ✅ | Policy name |
| `leaveTypeId` | ObjectId | ✅ | Ref → leave_types |
| `allocatedDays` | Number | ✅ | Days per year |
| `isHalfDayAllowed`| Boolean | ✅ | Enables half day |
| `status` | String | ✅ | `active` / `inactive` |

---

### Collection: `leave_balances`
Stores employee leave allocation ledgers.

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `companyId` | ObjectId | ✅ | Ref → companies |
| `employeeId` | ObjectId | ✅ | Ref → users |
| `leaveTypeId` | ObjectId | ✅ | Ref → leave_types |
| `allocated` | Number | ✅ | Total allocated |
| `used` | Number | ✅ | Total used |
| `remaining` | Number | ✅ | Total remaining |

---

### Collection: `leave_requests`
Stores leave applications and workflow history.

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `companyId` | ObjectId | ✅ | Ref → companies |
| `employeeId` | ObjectId | ✅ | Ref → users |
| `employeeName` | String | ✅ | Snapshot |
| `employeeCode` | String | ❌ | Snapshot |
| `departmentName`| String | ❌ | Snapshot |
| `leaveTypeId` | ObjectId | ✅ | Ref → leave_types |
| `fromDate` | Date | ✅ | |
| `toDate` | Date | ✅ | |
| `totalDays` | Number | ✅ | Days count (excluding weekends/holidays) |
| `isHalfDay` | Boolean | ✅ | |
| `reason` | String | ✅ | |
| `status` | String | ✅ | `pending_manager`, `pending_hr`, `approved`... |
| `approvalHistory`| Array | ✅ | Approval trail timeline |

---

### Collection: `in_app_notifications`
Stores in-app notifications inbox scoped to tenant and recipient user.

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `companyId` | ObjectId | ✅ | Ref → companies |
| `userId` | ObjectId | ✅ | Ref → users (recipient) |
| `title` | String | ✅ | Notification header title |
| `message` | String | ✅ | Body content details |
| `type` | String | ✅ | `leave_applied`, `leave_approved`, `leave_rejected`, `leave_cancelled`, `leave_sent_back` |
| `referenceId` | ObjectId | ✅ | Ref → leave_requests |
| `isRead` | Boolean | ✅ | Read/Unread flag (default: false) |

---

### Collection: `audit_logs`
Immutable activity trail. No `updatedAt`.

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `companyId` | ObjectId | ✅ | Ref → companies |
| `userId` | ObjectId | ✅ | Ref → users (actor) |
| `module` | String | ✅ | e.g. `user`, `role`, `leave_request` |
| `action` | String | ✅ | e.g. `create`, `approve_final`, `delete` |
| `oldData` | Mixed | ❌ | Previous state snapshot |
| `newData` | Mixed | ❌ | New state snapshot |
| `ipAddress` | String | ❌ | Requester IP |
| `createdAt` | Date | auto | Indexed for sort |

---

## Folder & File Structure

```
d:\Company\HRMS\
├── README.md                          ← This blueprint manual
│
├── frontend/                          ← Frontend Client Web Application
│   ├── package.json
│   ├── src/
│   │   ├── api/
│   │   │   └── axiosClient.js         ← Axios instance with interceptors
│   │   ├── context/
│   │   │   └── AuthContext.jsx        ← JWT session provider
│   │   ├── components/
│   │   │   ├── Sidebar.jsx            ← Navigation sidebar containing the menu
│   │   │   ├── Button.jsx             ← Action Button UI
│   │   │   ├── Card.jsx               ← Content Container card
│   │   │   ├── Input.jsx              ← Reusable Form Inputs (Select, Textarea, Dates)
│   │   │   └── Table.jsx              ← Pagination Datagrid component
│   │   └── pages/
│   │       ├── leave/
│   │       │   ├── LeaveRequests.jsx  ← Request apply forms and approval pipeline
│   │       │   ├── LeaveCalendar.jsx  ← Visual calendar (weekend/holiday exclusions)
│   │       │   ├── LeaveBalances.jsx  ← Balances view & HR adjustment interface
│   │       │   ├── LeavePolicies.jsx  ← Allocations policy configurator
│   │       │   └── LeaveTypes.jsx     ← Categories (SL, CL, EL, LOP) config page
│   │       ├── admin/
│   │       │   ├── Employees.jsx      ← Onboard employee directory
│   │       │   ├── Departments.jsx    ← Department lookup list
│   │       │   ├── Designations.jsx   ← Designations lookup list
│   │       │   ├── Branches.jsx       ← Branch locations lookup list
│   │       │   ├── Shifts.jsx         ← Working hours shifts config list
│   │       │   ├── Holidays.jsx       ← Holidays configuration directory
│   │       │   └── Dashboard.jsx      ← Overview metrics dashboard
│   │       └── Profile.jsx            ← User profile management (My Profile)
│   │
└── backend/                           ← Backend API Server
    ├── package.json
    ├── scripts/
    │   ├── bootstrap-db.js            ← Database core permissions and mapping bootstrapper
    │   └── seedItDemoData.js          ← Seeds companies (INFY, WIPRO, TCS), roles, managers, & employees
    ├── src/
    │   ├── database/
    │   │   ├── connection.js          ← MongoDB Mongoose connection manager
    │   │   └── bootstrap.js           ← Self-healing database permission bootstrapper
    │   ├── models/
    │   │   ├── company.model.js
    │   │   ├── user.model.js
    │   │   ├── department.model.js
    │   │   ├── designation.model.js
    │   │   ├── branch.model.js
    │   │   ├── shift.model.js
    │   │   ├── holiday-calendar.model.js
    │   │   ├── role.model.js
    │   │   ├── permission.model.js
    │   │   ├── role-permission.model.js
    │   │   ├── leave-type.model.js
    │   │   ├── leave-policy.model.js
    │   │   ├── leave-balance.model.js
    │   │   ├── leave-request.model.js
    │   │   ├── in-app-notification.model.js
    │   │   └── audit-log.model.js
    │   ├── services/
    │   │   ├── auth.service.js
    │   │   ├── company.service.js
    │   │   ├── user.service.js        ← Handles user directory & employee profile CRUD
    │   │   ├── department.service.js
    │   │   ├── designation.service.js
    │   │   ├── branch.service.js
    │   │   ├── shift.service.js
    │   │   ├── holiday-calendar.service.js
    │   │   ├── role.service.js
    │   │   ├── permission.service.js
    │   │   ├── leave-type.service.js
    │   │   ├── leave-policy.service.js
    │   │   ├── leave-balance.service.js
    │   │   ├── leave-request.service.js ← Validations, approvals workflow, and balance deduction
    │   │   ├── leave-calendar.service.js
    │   │   ├── leave-notification.service.js
    │   │   └── auditLog.service.js
    │   ├── controllers/
    │   │   ├── auth.controller.js
    │   │   ├── company.controller.js
    │   │   ├── employee.controller.js  ← Employee directory controller
    │   │   ├── department.controller.js
    │   │   ├── designation.controller.js
    │   │   ├── branch.controller.js
    │   │   ├── shift.controller.js
    │   │   ├── holiday-calendar.controller.js
    │   │   ├── role.controller.js
    │   │   ├── permission.controller.js
    │   │   ├── leave-type.controller.js
    │   │   ├── leave-policy.controller.js
    │   │   ├── leave-balance.controller.js
    │   │   ├── leave-request.controller.js
    │   │   ├── leave-calendar.controller.js
    │   │   ├── leave-notification.controller.js
    │   │   └── audit-log.controller.js
    │   ├── middlewares/
    │   │   ├── auth.middleware.js     ← JWT Bearer token validator
    │   │   ├── rbac.middleware.js     ← RBAC authorization middleware
    │   │   ├── validate.middleware.js ← Zod schema request body validator
    │   │   └── error.middleware.js    ← Formats CastError, Zod, and Mongo duplicate keys
    │   ├── routes/
    │   │   ├── index.js               ← Aggregates routes at /api/v1
    │   │   ├── auth.routes.js
    │   │   ├── company.routes.js
    │   │   ├── employee.routes.js
    │   │   ├── department.routes.js
    │   │   ├── designation.routes.js
    │   │   ├── branch.routes.js
    │   │   ├── shift.routes.js
    │   │   ├── holiday-calendar.routes.js
    │   │   ├── role.routes.js
    │   │   ├── permission.routes.js
    │   │   ├── leave.routes.js
    │   │   └── audit-log.routes.js
    │   └── utils/
    │       └── auth.utils.js          ← Token signing and hash checking utilities
```

---

## File-by-File Description

### Mongoose Models (`src/models/`)
Registered with explicit names using the 3rd argument of `mongoose.model()` to prevent Mongoose from auto-pluralizing or renaming collections.

| File | `mongoose.model(name, schema, collectionName)` |
| :--- | :--- |
| `company.model.js` | `Company`, `CompanySchema`, `'companies'` |
| `user.model.js` | `User`, `UserSchema`, `'users'` |
| `department.model.js` | `Department`, `DepartmentSchema`, `'departments'` |
| `designation.model.js` | `Designation`, `DesignationSchema`, `'designations'` |
| `branch.model.js` | `Branch`, `BranchSchema`, `'branches'` |
| `shift.model.js` | `Shift`, `ShiftSchema`, `'shifts'` |
| `holiday-calendar.model.js` | `HolidayCalendar`, `HolidayCalendarSchema`, `'holiday_calendars'` |
| `role.model.js` | `Role`, `RoleSchema`, `'roles'` |
| `permission.model.js` | `Permission`, `PermissionSchema`, `'permissions'` |
| `role-permission.model.js` | `RolePermission`, `RolePermissionSchema`, `'role_permissions'` |
| `leave-type.model.js` | `LeaveType`, `LeaveTypeSchema`, `'leave_types'` |
| `leave-policy.model.js` | `LeavePolicy`, `LeavePolicySchema`, `'leave_policies'` |
| `leave-balance.model.js` | `LeaveBalance`, `LeaveBalanceSchema`, `'leave_balances'` |
| `leave-request.model.js` | `LeaveRequest`, `LeaveRequestSchema`, `'leave_requests'` |
| `in-app-notification.model.js` | `InAppNotification`, `InAppNotificationSchema`, `'in_app_notifications'` |
| `audit-log.model.js` | `AuditLog`, `AuditLogSchema`, `'audit_logs'` |

### Services (`src/services/`)
* `auth.service.js` — Handles user login, logout, password resets, profile recovery, and permission queries (`hasPermission()`).
* `company.service.js` — Coordinates company onboarding (wrapping company creation, role setup, and company admin generation in a database transaction).
* `user.service.js` — Manages profile information, email uniqueness checks, active status tracking, and reporting manager assignments.
* `department.service.js` — Validates department creation constraints (unique code per tenant).
* `designation.service.js` / `branch.service.js` / `shift.service.js` — Basic master entity CRUD.
* `holiday-calendar.service.js` — Soft deletes and list retrievals for public holidays.
* `role.service.js` — Assigns global permissions to tenant roles, cascading permission deletions.
* `permission.service.js` — Seeding system for global system permissions.
* `leave-type.service.js` — Standardized active leave categories.
* `leave-policy.service.js` — Assigns policies to roles, triggering automated user balance allocation blocks.
* `leave-balance.service.js` — Fetching and manual adjustments for user balances.
* `leave-request.service.js` — Handles leave applications, past/weekend/holiday validators, overlaps, and multi-stage workflow transitions.
* `leave-calendar.service.js` — Parallel query runner gathering approved leaves and holidays for grid displays.
* `leave-notification.service.js` — Coordinates in-app notifications (triggers for leave applied, manager approved, HR approved, rejected, and cancelled), inbox fetching, and clearing all notifications.
* `auditLog.service.js` — Write-out helper to capture oldData vs newData snapshots for system audits.

---

## API Endpoints Reference

Base URL: `http://localhost:5000/api/v1`

### Authentication (`/auth`)
* `POST /auth/login` — Public. Login with `companyCode`, `email`, and `password`.
* `POST /auth/logout` — Protected. Logs out user, writes audit log.
* `GET /auth/me` — Protected. Retrieve active user profile data.

### Employees (`/employees`)
* `POST /employees/create` — Protected (`employee.create`). Onboard new employee user.
* `GET /employees/list` — Protected (`employee.view`). View employee directory.
* `GET /employees/profile/:id` — Protected (`employee.view`). Get individual profile details.
* `PUT /employees/update/:id` — Protected (`employee.edit`). Edit employee profile fields.
* `DELETE /employees/delete/:id` — Protected (`employee.delete`). Delete user.
* `POST /employees/terminate/:id` — Protected (`employee.delete`). Terminate employee user.

### Departments (`/departments`)
* `POST /departments/create` (or `POST /`) — Protected (`department.create`). Add department.
* `GET /departments/list` (or `GET /`) — Protected (`department.view`). List departments.
* `GET /departments/detail/:id` (or `GET /:id`) — Protected (`department.view`). View department.
* `PUT /departments/update/:id` (or `PUT /:id`) — Protected (`department.edit`). Edit department.
* `DELETE /departments/delete/:id` (or `DELETE /:id`) — Protected (`department.delete`). Delete department.

### Designations (`/designations`)
* `POST /designations/create` (or `POST /`) — Protected (`designation.create`). Add designation.
* `GET /designations/list` (or `GET /`) — Protected (`designation.view`). List designations.
* `GET /designations/detail/:id` (or `GET /:id`) — Protected (`designation.view`). View designation.
* `PUT /designations/update/:id` (or `PUT /:id`) — Protected (`designation.edit`). Edit designation.
* `DELETE /designations/delete/:id` (or `DELETE /:id`) — Protected (`designation.delete`). Delete designation.

### Branches (`/branches`)
* `POST /branches/create` (or `POST /`) — Protected (`branch.create`). Add branch office.
* `GET /branches/list` (or `GET /`) — Protected (`branch.view`). List branch offices.
* `GET /branches/detail/:id` (or `GET /:id`) — Protected (`branch.view`). View branch.
* `PUT /branches/update/:id` (or `PUT /:id`) — Protected (`branch.edit`). Edit branch details.
* `DELETE /branches/delete/:id` (or `DELETE /:id`) — Protected (`branch.delete`). Remove branch.

### Shifts (`/shifts`)
* `POST /shifts/create` (or `POST /`) — Protected (`shift.create`). Add shift timing.
* `GET /shifts/list` (or `GET /`) — Protected (`shift.view`). List shift timing.
* `GET /shifts/detail/:id` (or `GET /:id`) — Protected (`shift.view`). View shift.
* `PUT /shifts/update/:id` (or `PUT /:id`) — Protected (`shift.edit`). Edit shift.
* `DELETE /shifts/delete/:id` (or `DELETE /:id`) — Protected (`shift.delete`). Delete shift.

### Holidays (`/holidays`)
* `POST /holidays/create` (or `POST /`) — Protected (`holiday.create`). Create holiday.
* `GET /holidays/list` (or `GET /`) — Protected (`holiday.view`). List holidays.
* `GET /holidays/detail/:id` (or `GET /:id`) — Protected (`holiday.view`). View holiday details.
* `PUT /holidays/update/:id` (or `PUT /:id`) — Protected (`holiday.edit`). Edit holiday date/name.
* `DELETE /holidays/delete/:id` (or `DELETE /:id`) — Protected (`holiday.delete`). Remove holiday.

### Roles & Permissions (`/roles` & `/permissions`)
* `POST /roles/create` (or `POST /`) — Protected (`role.edit`). Add role.
* `GET /roles/list` (or `GET /`) — Protected (`role.view`). List roles.
* `PUT /roles/update/:id` (or `PUT /:id`) — Protected (`role.edit`). Update role.
* `DELETE /roles/delete/:id` (or `DELETE /:id`) — Protected (`role.edit`). Delete role.
* `POST /roles/assign-permissions/:id` (or `POST /:id/permissions`) — Protected (`role.edit`). Assign permissions map.
* `GET /roles/permissions/:id` (or `GET /:id/permissions`) — Protected (`role.view`). Get permissions mapped to role.
* `GET /roles/all-permissions` — Protected (`role.view`). Get roles-to-permissions mapping matrix.
* `GET /permissions` — Protected (`role.view`). List all static permission keys.

### Audit Logs (`/audit-logs`)
* `GET /audit-logs` — Protected (`audit.view`). Get company activity audit logs.

### Leave Management (`/leave`)
* `POST /leave/types` — Protected (`leaveType.create`). Add leave type.
* `GET /leave/types` — Protected (`leaveType.view`/`leave.apply`). Get leave types.
* `PUT /leave/types/:id` — Protected (`leaveType.edit`). Edit leave type.
* `DELETE /leave/types/:id` — Protected (`leaveType.delete`). Delete leave type.
* `POST /leave/policies` — Protected (`leavePolicy.create`). Add leave policy.
* `GET /leave/policies` — Protected (`leavePolicy.view`). Get policies.
* `POST /leave/policies/:id/assign` — Protected (`leavePolicy.edit`). Assign policy to role.
* `DELETE /leave/policies/:id` — Protected (`leavePolicy.delete`). Delete policy.
* `GET /leave/balances` — Protected (`leaveBalance.view`). View remaining allocations.
* `PUT /leave/balances/adjust` — Protected (`leaveBalance.manage`). Adjust balances.
* `POST /leave/requests` — Protected (`leave.apply`). Submit a leave application.
* `GET /api/leave/requests` — Protected (`leave.viewOwn`/`leave.viewAll`). Fetch leave list.
* `GET /leave/requests/:id` — Protected. Detailed request history.
* `PUT /leave/requests/:id/action` — Protected (`leave.approve`/`leave.reject`/`leave.sendBack`/`leave.cancel`). Update request status.
* `GET /leave/calendar` — Protected (`leaveCalendar.view`). Fetch calendar day events.
* `GET /leave/notifications` — Protected. Get notifications inbox.
* `PUT /leave/notifications/:id/read` — Protected. Mark notification as read.
* `DELETE /leave/notifications` — Protected. Clear all notifications from database.

---

## Permission Keys Reference

| Permission Key | Module | Action | Description |
| :--- | :--- | :--- | :--- |
| `employee.create` | employee | create | Onboard new employee profiles |
| `employee.view` | employee | view | View employees directory |
| `employee.edit` | employee | edit | Update employee details |
| `employee.delete` | employee | delete | Delete employee accounts |
| `company.view` | company | view | View company settings details |
| `company.edit` | company | edit | Update company records |
| `role.view` | role | view | View roles list & privilege matrices |
| `role.edit` | role | edit | Manage roles and permission assignments |
| `audit.view` | audit | view | Retrieve company compliance activity logs |
| `department.create` | department | create | Add business departments |
| `department.view` | department | view | View company departments list |
| `department.edit` | department | edit | Edit department details |
| `department.delete` | department | delete | Remove department records |
| `designation.create` | designation | create | Add job title designation levels |
| `designation.view` | designation | view | List designations |
| `designation.edit` | designation | edit | Edit designations details |
| `designation.delete` | designation | delete | Remove designation levels |
| `branch.create` | branch | create | Add branch locations |
| `branch.view` | branch | view | List branch offices |
| `branch.edit` | branch | edit | Edit branch info |
| `branch.delete` | branch | delete | Delete branch records |
| `shift.create` | shift | create | Add shift timing slots |
| `shift.view` | shift | view | List company shifts |
| `shift.edit` | shift | edit | Edit shift timing parameters |
| `shift.delete` | shift | delete | Delete shift templates |
| `holiday.create` | holiday | create | Create public holidays |
| `holiday.view` | holiday | view | View public holidays calendar list |
| `holiday.edit` | holiday | edit | Update holiday parameters |
| `holiday.delete` | holiday | delete | Delete holiday records |
| `leaveType.create` | leaveType | create | Add leave categories (SL, CL, etc.) |
| `leaveType.view` | leaveType | view | View leave categories |
| `leaveType.edit` | leaveType | edit | Edit leave type statuses |
| `leaveType.delete` | leaveType | delete | Delete leave categories |
| `leavePolicy.create` | leavePolicy | create | Create leave quota policies |
| `leavePolicy.view` | leavePolicy | view | List leave policies |
| `leavePolicy.edit` | leavePolicy | edit | Assign leave policies to roles |
| `leavePolicy.delete` | leavePolicy | delete | Remove leave policies |
| `leaveBalance.view` | leaveBalance | view | View remaining leave allocations |
| `leaveBalance.manage` | leaveBalance | manage | Manually adjust balance days |
| `leave.apply` | leave | apply | Submit leave applications |
| `leave.viewOwn` | leave | viewOwn | View own leave history |
| `leave.viewAll` | leave | viewAll | View employee leaves (HR/Admin approvals) |
| `leave.approve` | leave | approve | Approve pending leave applications |
| `leave.reject` | leave | reject | Reject leave requests |
| `leave.sendBack` | leave | sendBack | Send back leave requests for edits |
| `leave.cancel` | leave | cancel | Cancel submitted requests |
| `leaveCalendar.view` | leaveCalendar | view | Access monthly Leave Calendar |

---

## Default Roles & Permissions Matrix

Seeded company roles map to permissions based on the corporate access matrix below:

| Permission Key | Company Admin | HR | Manager | Employee |
| :--- | :---: | :---: | :---: | :---: |
| `employee.*` (all) | ✅ | ✅ | ❌ | ❌ |
| `employee.view` | ✅ | ✅ | ✅ | ✅ |
| `company.view` | ✅ | ✅ | ✅ | ✅ |
| `company.edit` | ✅ | ❌ | ❌ | ❌ |
| `role.*` (all) | ✅ | ❌ | ❌ | ❌ |
| `role.view` | ✅ | ✅ | ❌ | ❌ |
| `audit.view` | ✅ | ✅ | ❌ | ❌ |
| `department.*` | ✅ | ✅ | ❌ | ❌ |
| `department.view` | ✅ | ✅ | ✅ | ✅ |
| `designation.*` | ✅ | ✅ | ❌ | ❌ |
| `designation.view` | ✅ | ✅ | ✅ | ✅ |
| `branch.*` | ✅ | ✅ | ❌ | ❌ |
| `branch.view` | ✅ | ✅ | ✅ | ✅ |
| `shift.*` | ✅ | ✅ | ❌ | ❌ |
| `shift.view` | ✅ | ✅ | ✅ | ✅ |
| `holiday.*` | ✅ | ✅ | ❌ | ❌ |
| `holiday.view` | ✅ | ✅ | ✅ | ✅ |
| `leaveType.*` | ✅ | ✅ | ❌ | ❌ |
| `leavePolicy.*` | ✅ | ✅ | ❌ | ❌ |
| `leaveBalance.view` | ✅ | ✅ | ✅ | ✅ |
| `leaveBalance.manage`| ✅ | ✅ | ❌ | ❌ |
| `leave.apply` | ✅ | ✅ | ✅ | ✅ |
| `leave.viewOwn` | ✅ | ✅ | ✅ | ✅ |
| `leave.viewAll` | ✅ | ✅ | ✅ | ❌ |
| `leave.approve` | ✅ | ✅ | ✅ | ❌ |
| `leave.reject` | ✅ | ✅ | ✅ | ❌ |
| `leave.sendBack` | ✅ | ✅ | ✅ | ❌ |
| `leave.cancel` | ✅ | ✅ | ✅ | ✅ |
| `leaveCalendar.view`| ✅ | ✅ | ✅ | ✅ |

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
  └─ GET /auth/me
        └─ Returns populated current session user details & permissions
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

Every mutating database service method triggers `logAction()` to write compliance trail records:

```js
await logAction({
  companyId,          // Tenant company boundary
  userId,             // Actor performing action
  module: 'user',     // Module context
  action: 'create',   // Operation action
  oldData: null,      // Snapshot before modifications (null for creates)
  newData: savedUser, // Snapshot after modifications (null for deletes)
  ipAddress           // Requester IP
});
```

Passwords and credit card fields are **deleted from snapshots** before writing to `audit_logs`.

---

## Environment Variables

Create a `.env` file inside `backend/`:

```env
# Server Configurations
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# MongoDB Connection String
MONGODB_URI=mongodb://127.0.0.1:27017/hrms

# JWT Passphrases
JWT_ACCESS_SECRET=your_access_token_secret_here
JWT_REFRESH_SECRET=your_refresh_token_secret_here
JWT_RESET_SECRET=your_password_reset_token_secret_here
```

---

## Setup & Run Instructions

### Prerequisites
- Node.js v18 or higher
- MongoDB running locally or a MongoDB Atlas connection string

### Step 1 — Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2 — Configure Environment
Create `backend/.env` with your Mongo connection string and JWT Secrets.

### Step 3 — Seed IT Companies, Departments, Designations, Holidays & Users (Optional for testing)
```bash
cd ../backend
npm run seed:it
```
This drops the database, seeds 3 real-world companies (**INFY**, **WIPRO**, **TCS**), configures default roles, and generates demo accounts for testing. All core permissions and role mapping checks are automatically synced on startup when running the server.

### Step 5 — Start Development Servers
```bash
# Run backend
cd backend
npm run dev

# Run frontend (in another terminal)
cd frontend
npm run dev
```

---

## Seeding Workflow

```
Phase 1: Seed Global permissions
  └─ npm run seed
        └─ Connects to MongoDB
        └─ Inserts all static permission keys
        └─ Disconnects

Phase 2: Seed IT Company Data
  └─ npm run seed:it
        └─ Creates 3 company profiles (Infosys, Wipro, TCS)
        └─ Seeds Departments (DEV, QA, HR), Designations, Branches, Shifts
        └─ Creates default Role permissions mappings
        └─ Onboards default users (Admins, HRs, Managers, Employees)
        └─ Run migration script to link leaves permissions to role permissions
```

---

## Standard Response Format

All API responses follow this consistent structure:

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Success message."
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
  "message": "Token expired."
}
```

**Permission Error (403):**
```json
{
  "success": false,
  "data": null,
  "message": "Access forbidden."
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
