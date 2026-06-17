import mongoose from 'mongoose';

const LeaveAllocationSchema = new mongoose.Schema(
  {
    leaveTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeaveType',
      required: true,
    },
    yearlyAllocation: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const PolicyAssignmentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['company', 'department', 'role'],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null, // null means whole company if type is 'company'
    },
  },
  { _id: false }
);

const LeavePolicySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    policyName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    leaveAllocations: {
      type: [LeaveAllocationSchema],
      required: true,
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'At least one leave allocation is required.',
      },
    },
    assignments: {
      type: [PolicyAssignmentSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexing for quick retrieval of active policies scoped to company
LeavePolicySchema.index({ companyId: 1, status: 1 });

const LeavePolicy = mongoose.model('LeavePolicy', LeavePolicySchema, 'leave_policies');

export default LeavePolicy;
