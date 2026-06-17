import * as auditLogService from '../services/auditLog.service.js';

/**
 * Gets audit logs for the authenticated user's company.
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const requesterRole = req.user.roleName || null;

    const result = await auditLogService.getAuditLogs(companyId, req.query, requesterRole);

    return res.status(200).json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
      message: 'Audit logs retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};
