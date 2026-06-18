import mongoose from 'mongoose';

const InAppNotificationSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['leave_applied', 'leave_approved', 'leave_rejected', 'leave_cancelled', 'leave_sent_back', 'document'],
      required: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for getting unread notifications of a user scoped by tenant
InAppNotificationSchema.index({ companyId: 1, userId: 1, isRead: 1 });

const InAppNotification = mongoose.model('InAppNotification', InAppNotificationSchema, 'in_app_notifications');

export default InAppNotification;
