import mongoose from 'mongoose';

const ShiftSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    startTime: {
      type: String, // format "HH:MM" e.g., "09:00"
      required: true,
      trim: true,
    },
    endTime: {
      type: String, // format "HH:MM" e.g., "18:00"
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
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

// Compound index to ensure shift name uniqueness per tenant, ignoring soft-deleted shifts
ShiftSchema.index({ companyId: 1, name: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

const Shift = mongoose.model('Shift', ShiftSchema, 'shifts');

export default Shift;
