import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null, // null = Super Admin (kisi company ka nahi)
      index: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      default: null, // Super Admin ka koi role nahi hota
      index: true,
    },

    // ─── Super Admin Flag ───────────────────────────────────────
    isSuperAdmin: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      required: true,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    // New HRMS reference fields
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
      index: true,
    },
    designationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Designation',
      default: null,
      index: true,
    },
    reportingManagerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      default: null,
      index: true,
    },
    employeeTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeType',
      default: null,
      index: true,
    },
    workLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkLocation',
      default: null,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    joiningDate: {
      type: Date,
      default: null,
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },

    // ─── Self-updatable Profile Fields ──────────────────────────
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    address: {
      type: String,
      trim: true,
      default: null,
    },
    city: {
      type: String,
      trim: true,
      default: null,
    },
    avatar: {
      type: String,   // URL or base64
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Company users ke liye: companyId + email unique
UserSchema.index({ companyId: 1, email: 1 }, { unique: true, sparse: true });

const User = mongoose.model('User', UserSchema, 'users');

export default User;
