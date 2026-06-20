# Effective-Dated Custom Settings Walkthrough

We have successfully designed, built, and integrated custom week-off configuration support with effective dating into the HRMS application.

## Summary of Changes

### 1. Database Model (Backend)
- **[attendance-setting.model.js](file:///d:/Company/HRMS/backend/src/models/attendance-setting.model.js)**: Created Mongoose schema supporting `weekOffDays`, `effectiveFrom`, and `effectiveTo` (to allow multiple versions of settings per company with effective dates), indexed by `{ companyId: 1, effectiveFrom: 1 }`.

### 2. Routes & Controllers (Backend)
- **[routes/attendance.routes.js](file:///d:/Company/HRMS/backend/src/routes/attendance.routes.js)**: Added `GET /settings` and `PUT /settings` API routes.
- **[controllers/attendance.controller.js](file:///d:/Company/HRMS/backend/src/controllers/attendance.controller.js)**: Implemented settings controllers. The `updateSettings` action handles versioning: terminating the active settings version as of "yesterday end of day" (UTC) and creating a new active document starting "today start of day" (UTC) when week-offs are altered.

### 3. Service Calculations (Backend)
- **[services/attendance.service.js](file:///d:/Company/HRMS/backend/src/services/attendance.service.js)**:
  - `resolveVirtualStatus`: Queries `AttendanceSetting` where checking date falls within the `effectiveFrom` and `effectiveTo` boundary to evaluate week-offs dynamically.
  - `getCompanyMonthlySummary`: Prefetches settings versions to determine weekend days dynamically in the working days loop.
- **[services/leave-request.service.js](file:///d:/Company/HRMS/backend/src/services/leave-request.service.js)**:
  - `calculateWorkingDays`: Prefetches company settings versions and calculates weekend exclusions dynamically based on the active policy on each specific date in the leave span.

### 4. Sidebar & Routing (Frontend)
- **[components/Sidebar.jsx](file:///d:/Company/HRMS/frontend/src/components/Sidebar.jsx)**: Integrated a "Settings" NavLink using `FiSettings` in the navigation footer, visible only to Company Admins.
- **[App.jsx](file:///d:/Company/HRMS/frontend/src/App.jsx)**: Registered the Protected Route for `/admin/settings` rendering `<AdminSettings />`.
- **[pages/leave/LeaveRequests.jsx](file:///d:/Company/HRMS/frontend/src/pages/leave/LeaveRequests.jsx)**: Fetches the company's active settings on mount and dynamically blocks configured weekends from being selected inside the form fields.

### 5. UI Page (Frontend)
- **[Settings.jsx](file:///d:/Company/HRMS/frontend/src/pages/admin/Settings.jsx)**: Created the settings panel containing weekend checkboxes, GET fetching, and PUT saving logic with clean notifications.
