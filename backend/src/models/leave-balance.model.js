import mongoose from 'mongoose';

const LeaveBalanceSchema = new mongoose.Schema(
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
    leaveTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeaveType',
      required: true,
    },
    allocated: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    used: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    remaining: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Composite index to ensure unique balance per employee and leave type
LeaveBalanceSchema.index({ companyId: 1, employeeId: 1, leaveTypeId: 1 }, { unique: true });

const LeaveBalance = mongoose.model('LeaveBalance', LeaveBalanceSchema, 'leave_balances');

export default LeaveBalance;
