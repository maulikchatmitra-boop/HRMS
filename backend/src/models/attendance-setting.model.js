import mongoose from 'mongoose';

const attendanceSettingSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    fullDayMinutes: {
      type: Number,
      required: true,
      default: 480,
    },
    halfDayMinutes: {
      type: Number,
      required: true,
      default: 240,
    },
    fixedBreakMinutes: {
      type: Number,
      required: true,
      default: 60,
    },
    earlyCheckoutTolerance: {
      type: Number,
      required: true,
      default: 15,
    },
    weekOffDays: {
      type: [Number],
      required: true,
      default: [0, 6], // 0 = Sunday, 6 = Saturday
    },
    effectiveFrom: {
      type: Date,
      required: true,
      default: () => {
        const d = new Date();
        d.setUTCHours(0, 0, 0, 0);
        return d;
      },
    },
    effectiveTo: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to support history query and versioning per company
attendanceSettingSchema.index({ companyId: 1, effectiveFrom: 1 }, { unique: false });

const AttendanceSetting = mongoose.model('AttendanceSetting', attendanceSettingSchema);

export default AttendanceSetting;
