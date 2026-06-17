import mongoose from 'mongoose';

const WorkLocationSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    name: {
      type: String, // e.g., Office, Remote, Hybrid
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

// Compound index to ensure work-location name uniqueness per tenant, ignoring soft-deleted work-locations
WorkLocationSchema.index({ companyId: 1, name: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

const WorkLocation = mongoose.model('WorkLocation', WorkLocationSchema, 'work_locations');

export default WorkLocation;
