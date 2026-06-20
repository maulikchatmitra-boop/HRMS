# Task Checklist - Effective-Dated Settings & Week-Offs

- [x] Backend Schema & Routes
  - [x] Create `attendance-setting.model.js` database schema
  - [x] Add settings endpoints to `routes/attendance.routes.js`
  - [x] Implement controllers `getSettings` and `updateSettings` inside `controllers/attendance.controller.js`
- [x] Backend Calculations & Logic Integration
  - [x] Update `getSettings` helper and `resolveVirtualStatus` in `services/attendance.service.js`
  - [x] Update `getCompanyMonthlySummary` in `services/attendance.service.js` to prefetch and map settings
  - [x] Update `calculateWorkingDays` in `services/leave-request.service.js` to prefetch and map settings
- [x] Frontend Sidebar, Routing, & Leave Validation
  - [x] Update `components/Sidebar.jsx` to render Settings menu item
  - [x] Add `/admin/settings` route in `App.jsx`
  - [x] Update frontend validations in `pages/leave/LeaveRequests.jsx` to check dynamic week-off configurations
- [x] Settings Page UI
  - [x] Create frontend page `pages/admin/Settings.jsx` with weekend checkbox options
