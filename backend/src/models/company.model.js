import mongoose from 'mongoose';

const CompanySchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    companyCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    subscriptionStatus: {
      type: String,
      required: true,
      enum: ['active', 'trial', 'expired'],
      default: 'trial',
    },
    plan: {
      type: String,
      required: true,
      enum: ['basic', 'standard', 'enterprise'],
      default: 'basic',
    },
  },
  {
    timestamps: true,
  }
);

const Company = mongoose.model('Company', CompanySchema, 'companies');

export default Company;
