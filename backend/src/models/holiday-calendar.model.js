import mongoose from 'mongoose';

const HolidayCalendarSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    name: {
      type: String, // e.g., "Independence Day", "Diwali"
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isOptional: {
      type: Boolean,
      default: false,
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
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure holiday uniqueness per tenant on a given date/name, ignoring soft-deleted holidays
HolidayCalendarSchema.index({ companyId: 1, date: 1, name: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

const HolidayCalendar = mongoose.model('HolidayCalendar', HolidayCalendarSchema, 'holiday_calendars');

export default HolidayCalendar;
