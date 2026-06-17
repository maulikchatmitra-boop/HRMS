import mongoose from 'mongoose';

const EmployeeTypeSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    name: {
      type: String, // e.g., Permanent, Contract, Intern, Temporary
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

// Compound index to ensure employee-type name uniqueness per tenant, ignoring soft-deleted employee-types
EmployeeTypeSchema.index({ companyId: 1, name: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

const EmployeeType = mongoose.model('EmployeeType', EmployeeTypeSchema, 'employee_types');

export default EmployeeType;
