# Effective-Dated Attendance Settings & Week-off Days

Introduce custom week-off days configuration support with effective-dated versioning. This allows administrators to change weekend policies (e.g. switching from Sat/Sun to Fri/Sat or Sunday-only) without corrupting historical attendance records or calculation logic.

---

## Proposed Changes

### 1. Database Model (Backend)

#### [NEW] [attendance-setting.model.js](file:///d:/Company/HRMS/backend/src/models/attendance-setting.model.js)
Create the Mongoose schema for `AttendanceSetting`:
- `companyId`: ObjectId (ref: 'Company', required: true)
- `fullDayMinutes`: Number (default: 480)
- `halfDayMinutes`: Number (default: 240)
- `fixedBreakMinutes`: Number (default: 60)
- `earlyCheckoutTolerance`: Number (default: 15)
- `weekOffDays`: `[Number]` (Array of numbers representing week-off days, where 0 = Sunday, 1 = Monday, ..., 6 = Saturday. Default: `[0, 6]`)
- `effectiveFrom`: Date (default: current UTC date start of day)
- `effectiveTo`: Date (default: `null`)
- Compound index: `{ companyId: 1, effectiveFrom: 1 }` (non-unique to allow multiple historical and future records).

---

### 2. Routes & Controllers (Backend)

#### [MODIFY] [routes/attendance.routes.js](file:///d:/Company/HRMS/backend/src/routes/attendance.routes.js)
Register settings routes:
- `GET /settings`: Accessible by all authenticated roles (gets the active policy for their company).
- `PUT /settings`: Restricted to Company Admin or user with setting/attendance configuration permissions.

#### [MODIFY] [controllers/attendance.controller.js](file:///d:/Company/HRMS/backend/src/controllers/attendance.controller.js)
Add controller handlers:
- `getSettings`: Fetches the current active setting (where `effectiveTo` is `null`). If none exists, returns defaults.
- `updateSettings`: Saves updated settings:
  1. Finds the current active document (`effectiveTo` is `null`).
  2. If none exists, creates a new one with `effectiveFrom = todayStart`.
  3. If one exists, compares the `weekOffDays` arrays. If they differ:
     - Sets the current active document's `effectiveTo = yesterdayEnd` (UTC end of day).
     - Saves the old document.
     - Inserts a new document with the new `weekOffDays` and `effectiveFrom = todayStart` (UTC start of day).
  4. Returns the updated/new active settings configuration.

---

### 3. Business Logic Integration (Backend)

#### [MODIFY] [services/attendance.service.js](file:///d:/Company/HRMS/backend/src/services/attendance.service.js)
- Modify `getSettings(companyId)` helper (lines 13-20) to fetch the active settings document from Mongoose.
- Update `resolveVirtualStatus(companyId, employeeId, dateStr, joinDateStr)`:
  - Query `AttendanceSetting` where `companyId` matches and check-date is between `effectiveFrom` and `effectiveTo` (or `effectiveTo` is null).
  - Use in-memory check or a helper to check if the day of week is in `weekOffDays` instead of the hardcoded `dateObj.getUTCDay() === 0`.
- Update `getCompanyMonthlySummary`:
  - Prefetch the list of `AttendanceSetting` versions for `companyId` once before looping.
  - In the working days loop, identify the matching settings version in memory for each day and verify if the day of week is in `weekOffDays`.

#### [MODIFY] [services/leave-request.service.js](file:///d:/Company/HRMS/backend/src/services/leave-request.service.js)
- Update `calculateWorkingDays`:
  - Prefetch settings versions for the company overlapping with the range.
  - In the date loop, check each day against the active policy version's `weekOffDays` array instead of hardcoded `dayOfWeek === 0 || dayOfWeek === 6`.

---

### 4. Frontend UI & Navigation (Frontend)

#### [MODIFY] [components/Sidebar.jsx](file:///d:/Company/HRMS/frontend/src/components/Sidebar.jsx)
- Import `FiSettings` icon.
- Add a new "Settings" link inside the footer navigation block (above/below "My Profile") visible only to "Company Admin".

#### [MODIFY] [App.jsx](file:///d:/Company/HRMS/frontend/src/App.jsx)
- Import `AdminSettings` from `./pages/admin/Settings.jsx`.
- Add a Protected Route for `/admin/settings` guarded for Company Admins.

#### [MODIFY] [pages/leave/LeaveRequests.jsx](file:///d:/Company/HRMS/frontend/src/pages/leave/LeaveRequests.jsx)
- Fetch the company's active settings on component mount (to retrieve the active `weekOffDays` configuration).
- Replace hardcoded Saturday/Sunday checks (`fromDay === 0 || fromDay === 6`) inside `handleFromDateChange`, `handleToDateChange`, and `validateApplyForm` with a dynamic check using `weekOffDays.includes(fromDay)`.

---

### 5. Settings Screen (Frontend)

#### [NEW] [Settings.jsx](file:///d:/Company/HRMS/frontend/src/pages/admin/Settings.jsx)
Build a premium settings interface:
- Multi-select checkboxes for the 7 days of the week: Monday through Sunday.
- Fetch active settings on load using `GET /api/attendance/settings` and populate checkboxes.
- Save settings using `PUT /api/attendance/settings`, displaying a clean success notification upon update.

---

## Verification Plan

### Automated Verification
- Write a node-check test script in `scratch/verifySettings.js` to verify:
  1. Setting creation and versioning when week-offs are updated.
  2. Effective date calculation checks.
  3. Fallback logic.

### Manual Verification
- Open Settings page as a Company Admin.
- Change the week-off days, save, and verify that the updated list is persisted on reload.
- Check database records in MongoDB to ensure effective dating logic creates a new record and sets the old record's `effectiveTo` correctly.
- Open **Attendance Calendar** and verify that days configured as weekends are dynamically resolved and rendered with a `Week Off` badge (rather than hardcoded Sundays).
- Check the **Leave Request** calendar/form to ensure validation blocks the configured weekend days instead of Saturday/Sunday.
