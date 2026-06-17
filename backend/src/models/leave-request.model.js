import mongoose from 'mongoose';

const ApprovalHistorySchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: ['apply', 'approve', 'reject', 'send_back', 'cancel'],
      required: true,
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const LeaveRequestSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    
    // Historical snapshots for reporting consistency
    employeeName: {
      type: String,
      required: true,
      trim: true,
    },
    employeeCode: {
      type: String,
      trim: true,
      default: '',
    },
    departmentName: {
      type: String,
      trim: true,
      default: '',
    },

    leaveTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeaveType',
      required: true,
    },
    fromDate: {
      type: Date,
      required: true,
      index: true,
    },
    toDate: {
      type: Date,
      required: true,
      index: true,
    },
    totalDays: {
      type: Number,
      required: true,
      min: 0.5,
    },
    isHalfDay: {
      type: Boolean,
      default: false,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    attachment: {
      type: String, // URL or local path
      default: null,
    },
    status: {
      type: String,
      enum: ['pending_manager', 'pending_hr', 'approved', 'rejected', 'sent_back', 'cancelled'],
      default: 'pending_manager',
      index: true,
    },
    approvalHistory: {
      type: [ApprovalHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes to speed up queries, tenant isolation, and overlap checks
LeaveRequestSchema.index({ companyId: 1, employeeId: 1, status: 1 });
LeaveRequestSchema.index({ companyId: 1, fromDate: 1, toDate: 1 });

const LeaveRequest = mongoose.model('LeaveRequest', LeaveRequestSchema, 'leave_requests');

export default LeaveRequest;
