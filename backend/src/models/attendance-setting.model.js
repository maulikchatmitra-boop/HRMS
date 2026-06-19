import mongoose from 'mongoose';

const AttendanceSettingSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      unique: true,
      index: true,
    },
    fullDayMinutes: {
      type: Number,
      default: 480,
    },
    halfDayMinutes: {
      type: Number,
      default: 240,
    },
    fixedBreakMinutes: {
      type: Number,
      default: 60,
    },
    earlyCheckoutTolerance: {
      type: Number,
      default: 15,
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
  },
  {
    timestamps: true,
  }
);

const AttendanceSetting = mongoose.model('AttendanceSetting', AttendanceSettingSchema, 'attendance_settings');

export default AttendanceSetting;
