import mongoose from 'mongoose';

const PermissionSchema = new mongoose.Schema(
  {
    module: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    permissionKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

const Permission = mongoose.model('Permission', PermissionSchema, 'permissions');

export default Permission;
