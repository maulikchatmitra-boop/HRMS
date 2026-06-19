import mongoose from 'mongoose';

const AttendanceRecordSchema = new mongoose.Schema(
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
    attendanceDate: {
      type: String, // format: 'YYYY-MM-DD'
      required: true,
      index: true,
    },
    checkInTime: {
      type: Date,
      default: null,
    },
    checkOutTime: {
      type: Date,
      default: null,
    },
    expectedCheckoutTime: {
      type: Date,
      default: null,
    },
    workingMinutes: {
      type: Number,
      default: 0,
    },
    lateMinutes: {
      type: Number,
      default: 0,
    },
    earlyExitMinutes: {
      type: Number,
      default: 0,
    },
    shortfallMinutes: {
      type: Number,
      default: 0,
    },
    overtimeMinutes: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['checked_in', 'present', 'half_day', 'absent', 'missed_punch', 'pending_regularization'],
      required: true,
    },
    regularizationReason: {
      type: String,
      default: null,
    },
    regularizationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvalRemarks: {
      type: String,
      default: null,
    },
    approvalTimestamp: {
      type: Date,
      default: null,
    },
    previousStatus: {
      type: String,
      default: null,
    },
    
    // Shift Snapshot Fields
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      required: true,
    },
    shiftName: {
      type: String,
      required: true,
    },
    shiftStartTime: {
      type: String,
      required: true,
    },
    shiftEndTime: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure uniqueness per tenant per employee per date
AttendanceRecordSchema.index({ companyId: 1, employeeId: 1, attendanceDate: 1 }, { unique: true });

const AttendanceRecord = mongoose.model('AttendanceRecord', AttendanceRecordSchema, 'attendance_records');

export default AttendanceRecord;
