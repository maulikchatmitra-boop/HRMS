import mongoose from 'mongoose';
import { DOCUMENT_CATEGORIES, DOCUMENT_TYPES } from '../constants/document.constants.js';

const EmployeeDocumentSchema = new mongoose.Schema(
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
      required: function () {
        return !this.isCompanyPolicy;
      },
      index: true,
    },
    category: {
      type: String,
      enum: Object.values(DOCUMENT_CATEGORIES),
      required: true,
    },
    documentType: {
      type: String,
      enum: Object.values(DOCUMENT_TYPES),
      required: true,
      index: true,
    },
    originalFileName: {
      type: String,
      required: true,
      trim: true,
    },
    cloudinaryPublicId: {
      type: String,
      required: true,
      trim: true,
    },
    cloudinaryUrl: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isVisibleToEmployee: {
      type: Boolean,
      default: true,
    },
    isDownloadable: {
      type: Boolean,
      default: true,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    acknowledged: {
      type: Boolean,
      default: false,
    },
    acknowledgedAt: {
      type: Date,
      default: null,
    },
    isCompanyPolicy: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const EmployeeDocument = mongoose.model('EmployeeDocument', EmployeeDocumentSchema, 'employee_documents');
export default EmployeeDocument;
