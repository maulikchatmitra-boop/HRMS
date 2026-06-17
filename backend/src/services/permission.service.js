import Permission from '../models/permission.model.js';

/**
 * Gets all global permissions.
 * @returns {Promise<Array>} List of global permissions.
 */
export const getPermissions = async () => {
  return await Permission.find({});
};

/**
 * Seeds permissions in the database. Checks for duplicate permissionKeys before inserting.
 * Primarily used by admin bootstrap scripts.
 * @param {Array<Object>} permissionsList - List of permissions to seed.
 * @returns {Promise<Object>} Summary of operations (inserted count, skipped count).
 */
export const bootstrapPermissions = async (permissionsList) => {
  let insertedCount = 0;
  let skippedCount = 0;

  for (const perm of permissionsList) {
    const existing = await Permission.findOne({ permissionKey: perm.permissionKey });
    if (!existing) {
      const newPerm = new Permission({
        module: perm.module,
        action: perm.action,
        permissionKey: perm.permissionKey,
      });
      await newPerm.save();
      insertedCount++;
    } else {
      skippedCount++;
    }
  }

  return { insertedCount, skippedCount };
};
