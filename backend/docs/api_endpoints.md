# Multi-Tenant SaaS HRMS - Phase 1 API Endpoints Documentation

All requests must be prefixed with the base path `/api/v1`.

---

## 1. Authentication Module (`/auth`)

### A. User Login
- **Endpoint**: `POST /auth/login`
- **Authentication**: Public
- **Request Body**:
  ```json
  {
    "companyCode": "COMP1",
    "email": "admin@comp1.com",
    "password": "securepassword123"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "_id": "60c72b2f9b1d8b2bad000001",
        "companyId": "60c72b2f9b1d8b2bad000000",
        "firstName": "John",
        "lastName": "Doe",
        "email": "admin@comp1.com",
        "roleId": "60c72b2f9b1d8b2bad000002",
        "status": "active",
        "lastLogin": "2026-06-11T12:00:00.000Z"
      },
      "company": {
        "_id": "60c72b2f9b1d8b2bad000000",
        "companyName": "Company One",
        "companyCode": "COMP1",
        "email": "contact@comp1.com",
        "status": "active",
        "subscriptionStatus": "trial"
      },
      "accessToken": "eyJhbGciOi..."
    },
    "message": "Login successful."
  }
  ```
  *(Note: A `refreshToken` cookie is set as HttpOnly, Secure, SameSite=Strict).*

### B. User Logout
- **Endpoint**: `POST /auth/logout`
- **Authentication**: Authenticated (Bearer Access Token)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": null,
    "message": "Logged out successfully."
  }
  ```
  *(Note: Clears the `refreshToken` cookie).*

### C. Forgot Password
- **Endpoint**: `POST /auth/forgot-password`
- **Authentication**: Public
- **Request Body**:
  ```json
  {
    "companyCode": "COMP1",
    "email": "admin@comp1.com"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "resetToken": "eyJhbGciOi..."
    },
    "message": "Password reset link generated successfully."
  }
  ```

### D. Reset Password
- **Endpoint**: `POST /auth/reset-password`
- **Authentication**: Public
- **Request Body**:
  ```json
  {
    "token": "eyJhbGciOi...",
    "newPassword": "newsecurepassword123"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": null,
    "message": "Password has been reset successfully."
  }
  ```

### E. Change Password
- **Endpoint**: `POST /auth/change-password`
- **Authentication**: Authenticated
- **Request Body**:
  ```json
  {
    "oldPassword": "securepassword123",
    "newPassword": "newsecurepassword123"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": null,
    "message": "Password changed successfully."
  }
  ```

### F. Get Current User Profile (Me)
- **Endpoint**: `GET /auth/me`
- **Authentication**: Authenticated
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "60c72b2f9b1d8b2bad000001",
      "companyId": "60c72b2f9b1d8b2bad000000",
      "firstName": "John",
      "lastName": "Doe",
      "email": "admin@comp1.com",
      "roleId": {
        "_id": "60c72b2f9b1d8b2bad000002",
        "companyId": "60c72b2f9b1d8b2bad000000",
        "roleName": "Company Admin",
        "description": "Full administrative access"
      },
      "status": "active"
    },
    "message": "Current user session retrieved."
  }
  ```

---

## 2. Company Module (`/companies`)

### A. Onboard Company
- **Endpoint**: `POST /companies/onboard`
- **Authentication**: Public / Internal Admin
- **Request Body**:
  ```json
  {
    "company": {
      "companyName": "Company Two",
      "companyCode": "COMP2",
      "email": "contact@comp2.com",
      "phone": "+123456789"
    },
    "admin": {
      "firstName": "Admin",
      "lastName": "Two",
      "email": "admin@comp2.com",
      "password": "initialpassword123"
    }
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "company": {
        "_id": "60c72b2f9b1d8b2bad000100",
        "companyName": "Company Two",
        "companyCode": "COMP2",
        "email": "contact@comp2.com",
        "phone": "+123456789",
        "status": "active",
        "subscriptionStatus": "trial"
      },
      "roles": [...],
      "adminUser": {
        "_id": "60c72b2f9b1d8b2bad000101",
        "firstName": "Admin",
        "lastName": "Two",
        "email": "admin@comp2.com",
        "roleId": "60c72b2f9b1d8b2bad000102"
      }
    },
    "message": "Company onboarded successfully."
  }
  ```

### B. Get Company Settings
- **Endpoint**: `GET /companies`
- **Authentication**: Authenticated | Permission: `company.view`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "60c72b2f9b1d8b2bad000000",
      "companyName": "Company One",
      "companyCode": "COMP1",
      "email": "contact@comp1.com",
      "phone": "+111222333",
      "status": "active",
      "subscriptionStatus": "trial"
    },
    "message": "Company details retrieved successfully."
  }
  ```

### C. Update Company Settings
- **Endpoint**: `PUT /companies`
- **Authentication**: Authenticated | Permission: `company.edit`
- **Request Body**:
  ```json
  {
    "companyName": "Company One Updated",
    "phone": "+999888777"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "60c72b2f9b1d8b2bad000000",
      "companyName": "Company One Updated",
      "companyCode": "COMP1",
      "phone": "+999888777",
      "status": "active"
    },
    "message": "Company settings updated successfully."
  }
  ```

---

## 3. User Module (`/users`)

### A. Create User
- **Endpoint**: `POST /users`
- **Authentication**: Authenticated | Permission: `employee.create`
- **Request Body**:
  ```json
  {
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@comp1.com",
    "password": "employeetemp123",
    "roleId": "60c72b2f9b1d8b2bad000003"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "60c72b2f9b1d8b2bad000005",
      "companyId": "60c72b2f9b1d8b2bad000000",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@comp1.com",
      "roleId": "60c72b2f9b1d8b2bad000003",
      "status": "active"
    },
    "message": "User created successfully."
  }
  ```

### B. List Users
- **Endpoint**: `GET /users`
- **Authentication**: Authenticated | Permission: `employee.view`
- **Query Parameters**: `?status=active` (optional)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "60c72b2f9b1d8b2bad000001",
        "firstName": "John",
        "lastName": "Doe",
        "email": "admin@comp1.com",
        "roleId": {
          "_id": "60c72b2f9b1d8b2bad000002",
          "roleName": "Company Admin"
        },
        "status": "active"
      }
    ],
    "message": "Users list retrieved successfully."
  }
  ```

### C. Get User Details
- **Endpoint**: `GET /users/:id`
- **Authentication**: Authenticated | Permission: `employee.view`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "60c72b2f9b1d8b2bad000005",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@comp1.com",
      "roleId": {
        "_id": "60c72b2f9b1d8b2bad000003",
        "roleName": "HR"
      },
      "status": "active"
    },
    "message": "User details retrieved successfully."
  }
  ```

### D. Update User details
- **Endpoint**: `PUT /users/:id`
- **Authentication**: Authenticated | Permission: `employee.edit`
- **Request Body**:
  ```json
  {
    "firstName": "Jane Updated",
    "status": "inactive"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "60c72b2f9b1d8b2bad000005",
      "firstName": "Jane Updated",
      "lastName": "Smith",
      "email": "jane@comp1.com",
      "roleId": "60c72b2f9b1d8b2bad000003",
      "status": "inactive"
    },
    "message": "User details updated successfully."
  }
  ```

### E. Delete User
- **Endpoint**: `DELETE /users/:id`
- **Authentication**: Authenticated | Permission: `employee.delete`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "60c72b2f9b1d8b2bad000005"
    },
    "message": "User deleted successfully."
  }
  ```

---

## 4. Role Module (`/roles`)

### A. Create Role
- **Endpoint**: `POST /roles`
- **Authentication**: Authenticated | Permission: `role.edit`
- **Request Body**:
  ```json
  {
    "roleName": "Recruiter",
    "description": "Handles employee hiring processes."
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "60c72b2f9b1d8b2bad000020",
      "companyId": "60c72b2f9b1d8b2bad000000",
      "roleName": "Recruiter",
      "description": "Handles employee hiring processes."
    },
    "message": "Role created successfully."
  }
  ```

### B. List Roles
- **Endpoint**: `GET /roles`
- **Authentication**: Authenticated | Permission: `role.view`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "60c72b2f9b1d8b2bad000002",
        "roleName": "Company Admin",
        "description": "Full access"
      }
    ],
    "message": "Roles list retrieved successfully."
  }
  ```

### C. Update Role
- **Endpoint**: `PUT /roles/:id`
- **Authentication**: Authenticated | Permission: `role.edit`
- **Request Body**:
  ```json
  {
    "roleName": "HR Recruiter"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "60c72b2f9b1d8b2bad000020",
      "roleName": "HR Recruiter",
      "description": "Handles employee hiring processes."
    },
    "message": "Role updated successfully."
  }
  ```

### D. Delete Role
- **Endpoint**: `DELETE /roles/:id`
- **Authentication**: Authenticated | Permission: `role.edit`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "60c72b2f9b1d8b2bad000020"
    },
    "message": "Role deleted successfully."
  }
  ```

### E. Assign Permissions to Role (Mapping)
- **Endpoint**: `POST /roles/:id/permissions`
- **Authentication**: Authenticated | Permission: `role.edit`
- **Request Body**:
  ```json
  {
    "permissionIds": [
      "60c72b2f9b1d8b2bad000091",
      "60c72b2f9b1d8b2bad000092"
    ]
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "60c72b2f9b1d8b2bad000030",
        "companyId": "60c72b2f9b1d8b2bad000000",
        "roleId": "60c72b2f9b1d8b2bad000020",
        "permissionId": "60c72b2f9b1d8b2bad000091"
      }
    ],
    "message": "Role permissions updated successfully."
  }
  ```

### F. Get Assigned Role Permissions
- **Endpoint**: `GET /roles/:id/permissions`
- **Authentication**: Authenticated | Permission: `role.view`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "60c72b2f9b1d8b2bad000030",
        "permissionId": {
          "_id": "60c72b2f9b1d8b2bad000091",
          "module": "employee",
          "action": "view",
          "permissionKey": "employee.view"
        }
      }
    ],
    "message": "Role permissions retrieved successfully."
  }
  ```

---

## 5. Permission Module (`/permissions`)

### A. List Global Permissions
- **Endpoint**: `GET /permissions`
- **Authentication**: Authenticated | Permission: `role.view`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "60c72b2f9b1d8b2bad000091",
        "module": "employee",
        "action": "view",
        "permissionKey": "employee.view"
      }
    ],
    "message": "Global permissions retrieved successfully."
  }
  ```

---

## 6. Audit Log Module (`/audit-logs`)

### A. List Audit Logs
- **Endpoint**: `GET /audit-logs`
- **Authentication**: Authenticated | Permission: `audit.view`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "60c72d8a9b1d8b2bad000099",
        "companyId": "60c72b2f9b1d8b2bad000000",
        "userId": {
          "_id": "60c72b2f9b1d8b2bad000001",
          "firstName": "John",
          "lastName": "Doe",
          "email": "admin@comp1.com"
        },
        "module": "user",
        "action": "create",
        "oldData": null,
        "newData": {
          "email": "jane@comp1.com"
        },
        "ipAddress": "127.0.0.1",
        "createdAt": "2026-06-11T12:05:00.000Z"
      }
    ],
    "message": "Audit logs retrieved successfully."
  }
  ```
