# Settings Section Organization Notes

To clean up the HRMS sidebar navigation and separate daily operations from administrative configurations, we should establish a unified **Settings** section. Below is an outline of which pages should be moved into Settings and the rationale behind each choice.

---

## 1. Organization Structure Settings

These are the core metadata representing the company's hierarchy. Administrators set them up once or edit them infrequently.

*   **Branches (`Branches.jsx`)**
    *   *Why*: Branch management defines geographic locations and offices. It is a configuration setting, not a daily operational tool.
*   **Departments (`Departments.jsx`)**
    *   *Why*: Department definitions (e.g., R&D, Finance) shape how employees are grouped.
*   **Designations (`Designations.jsx`)**
    *   *Why*: Designation job titles (e.g., Senior Architect) map to employees' positions and grades.

---

## 2. Policy & Calendar Settings

These govern shifts, working hours, company holidays, and time-off policies. They define the guidelines that operational workflows calculate against.

*   **Shifts (`Shifts.jsx`)**
    *   *Why*: Defines shift start/end hours and expected durations. Daily attendance registers refer to these settings to determine if a check-in is "late" or "early".
*   **Holidays Calendar (`Holidays.jsx`)**
    *   *Why*: Defines company-wide days off. It configures the working calendar for leaves and attendance logic rather than tracking daily attendance.
*   **Leave Types (`LeaveTypes.jsx`)**
    *   *Why*: Configures the category of leaves (e.g. Casual Leave, Sick Leave, Maternity Leave) and their characteristics.
*   **Leave Policies (`LeavePolicies.jsx`)**
    *   *Why*: Defines specific rules for each leave type (e.g. accrual limits, carryover policies, and gender/department eligibility).

---

## 3. Access Control & Security Settings

These settings dictate permissions and system transparency.

*   **Roles & Permissions (`Roles.jsx`)**
    *   *Why*: Determines system accessibility, module permissions, and action capabilities for different user roles (e.g. Manager, HR Admin, Employee).
*   **Audit Logs (`AuditLogs.jsx`)**
    *   *Why*: Provides system trace logs for security tracking. Fits naturally under developer/administrator settings.

---

## Operational Modules to KEEP outside of Settings

For maximum clarity, daily operational pages should remain visible and accessible in the main sidebar.

*   **Employees (`Employees.jsx`)**: Main core database of active personnel.
*   **Leave Requests (`LeaveRequests.jsx`)**: Active workflow where managers approve or reject employee time-off requests.
*   **Leave Balances (`LeaveBalances.jsx`)**: View of currently accrued and remaining leaves for all employees.
*   **My Attendance (`MyAttendance.jsx`)**: Personal time-in and time-out tracking for the active logged-in employee.
*   **Attendance Reports / Calendar (`AttendanceReports.jsx` / `AttendanceCalendar.jsx`)**: Worksheets, clock-in logs, and reporting analytics.
*   **Regularization Requests (`RegularizationRequests.jsx`)**: Action item list for checking, approving, or correcting attendance errors.
