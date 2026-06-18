import mongoose from 'mongoose';
import EmployeeDocument from '../models/employee-document.model.js';
import User from '../models/user.model.js';
import { uploadBufferToCloudinary, deleteFromCloudinary, generateSignedUrl } from '../services/cloudinary.service.js';
import { getRoleCategory } from '../utils/user.utils.js';
import { logAction } from '../services/auditLog.service.js';
import '../models/in-app-notification.model.js'; // Ensure the notification model is registered

const getResourceType = (mimeType) => {
  if (!mimeType) return 'image';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'image'; // PDFs are treated as image type in Cloudinary
  return 'raw';
};

// Upload new document
export const uploadDocument = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const { category, documentType, isVisibleToEmployee, isDownloadable, expiryDate, isCompanyPolicy, sendNotification } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File is required.' });
    }

    const companyId = req.user.companyId;
    const isPolicy = isCompanyPolicy === 'true' || isCompanyPolicy === true;
    let targetEmployee = null;

    if (!isPolicy) {
      targetEmployee = await User.findOne({ _id: employeeId, companyId });
      if (!targetEmployee) {
        return res.status(404).json({ success: false, message: 'Employee not found.' });
      }
    }

    const folder = isPolicy 
      ? `hrms/company/${companyId}/employee/policies/documents`
      : `hrms/company/${companyId}/employee/${employeeId}/documents`;

    const cloudRes = await uploadBufferToCloudinary(req.file.buffer, folder, req.file.originalname);

    const doc = new EmployeeDocument({
      companyId,
      employeeId: isPolicy ? null : employeeId,
      category,
      documentType,
      originalFileName: req.file.originalname,
      cloudinaryPublicId: cloudRes.public_id,
      cloudinaryUrl: cloudRes.secure_url,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedBy: req.user.userId,
      isVisibleToEmployee: isVisibleToEmployee !== undefined ? isVisibleToEmployee === 'true' || isVisibleToEmployee === true : true,
      isDownloadable: isDownloadable !== undefined ? isDownloadable === 'true' || isDownloadable === true : true,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      isCompanyPolicy: isPolicy,
    });

    await doc.save();

    // Log Audit
    await logAction({
      companyId,
      userId: req.user.userId,
      module: 'document',
      action: 'create',
      newData: { documentId: doc._id, fileName: doc.originalFileName },
    });

    // In-app Notifications support
    if (!isPolicy && (sendNotification === 'true' || sendNotification === true)) {
      const Notification = mongoose.model('InAppNotification');
      if (Notification) {
        await Notification.create({
          companyId,
          userId: employeeId,
          title: 'New Document Added',
          message: 'A new document has been uploaded to your profile.',
          type: 'document',
          referenceId: doc._id,
        });
      }
    }

    return res.status(201).json({ success: true, data: doc, message: 'Document uploaded successfully.' });
  } catch (error) {
    next(error);
  }
};

// Retrieve dashboard documents with dynamic filters
export const getDashboardDocuments = async (req, res, next) => {
  try {
    const { tab, employeeId, search } = req.query;
    const isEmployee = getRoleCategory(req.user.roleName) === 'Employee';
    const companyId = req.user.companyId;
    const filter = { companyId };

    if (tab === 'my-documents') {
      filter.employeeId = req.user.userId;
      filter.isCompanyPolicy = false;
      if (isEmployee) filter.isVisibleToEmployee = true;
    } else if (tab === 'company-documents') {
      filter.isCompanyPolicy = true;
    } else if (tab === 'employee-documents') {
      filter.isCompanyPolicy = false;
      if (employeeId) filter.employeeId = employeeId;
    } else if (tab === 'pending') {
      filter.verificationStatus = 'pending';
      filter.isCompanyPolicy = false;
      if (isEmployee) {
        filter.employeeId = req.user.userId;
        filter.isVisibleToEmployee = true;
      } else if (employeeId) {
        filter.employeeId = employeeId;
      }
    } else if (tab === 'expiring') {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      filter.expiryDate = { $ne: null, $lte: thirtyDaysFromNow };
      filter.isCompanyPolicy = false;
      if (isEmployee) {
        filter.employeeId = req.user.userId;
        filter.isVisibleToEmployee = true;
      } else if (employeeId) {
        filter.employeeId = employeeId;
      }
    }

    if (search) {
      filter.originalFileName = { $regex: search, $options: 'i' };
    }

    const docs = await EmployeeDocument.find(filter)
      .populate('employeeId', 'firstName lastName email')
      .populate('uploadedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: docs, message: 'Documents retrieved.' });
  } catch (error) {
    next(error);
  }
};

// Get all documents for a specific employee
export const getEmployeeDocuments = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const isEmployee = getRoleCategory(req.user.roleName) === 'Employee';
    const companyId = req.user.companyId;

    // Security check: Employees can only view their own documents
    if (isEmployee && req.user.userId.toString() !== employeeId) {
      return res.status(450 || 403).json({ success: false, message: 'Access denied. You can only view your own documents.' });
    }

    const filter = { companyId, employeeId, isCompanyPolicy: false };
    if (isEmployee) {
      filter.isVisibleToEmployee = true;
    }

    const docs = await EmployeeDocument.find(filter)
      .populate('employeeId', 'firstName lastName email')
      .populate('uploadedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: docs, message: 'Employee documents retrieved.' });
  } catch (error) {
    next(error);
  }
};

// Get document stats summary counters
export const getDashboardSummary = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const isEmployee = getRoleCategory(req.user.roleName) === 'Employee';
    const userId = req.user.userId;
    const query = { companyId };

    if (isEmployee) {
      query.employeeId = userId;
      query.isVisibleToEmployee = true;
    }

    const allDocs = await EmployeeDocument.find(query).lean();
    const total = allDocs.length;
    const pending = allDocs.filter(d => d.verificationStatus === 'pending' && !d.isCompanyPolicy).length;
    
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiring = allDocs.filter(d => d.expiryDate && new Date(d.expiryDate) <= thirtyDaysFromNow && !d.isCompanyPolicy).length;
    const unacknowledged = allDocs.filter(d => d.employeeId && d.employeeId.toString() === userId.toString() && !d.acknowledged && !d.isCompanyPolicy).length;

    return res.status(200).json({
      success: true,
      data: { total, pending, expiring, unacknowledged },
    });
  } catch (error) {
    next(error);
  }
};

// Verify/Accept/Reject document
export const verifyDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { verificationStatus } = req.body;

    if (!['verified', 'rejected'].includes(verificationStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid verification status.' });
    }

    const doc = await EmployeeDocument.findById(documentId);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });

    if (!req.user.isSuperAdmin && doc.companyId.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ success: false, message: 'Access forbidden.' });
    }

    doc.verificationStatus = verificationStatus;
    await doc.save();

    await logAction({
      companyId: doc.companyId,
      userId: req.user.userId,
      module: 'document',
      action: 'verify',
      newData: { documentId: doc._id, status: verificationStatus },
    });

    return res.status(200).json({ success: true, data: doc, message: `Document has been marked as ${verificationStatus}.` });
  } catch (error) {
    next(error);
  }
};

// Acknowledge document
export const acknowledgeDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const doc = await EmployeeDocument.findById(documentId);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });

    if (doc.employeeId.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ success: false, message: 'You can only acknowledge your own documents.' });
    }

    doc.acknowledged = true;
    doc.acknowledgedAt = new Date();
    await doc.save();

    return res.status(200).json({ success: true, data: doc, message: 'Document acknowledged.' });
  } catch (error) {
    next(error);
  }
};

// Secure Document Download
export const downloadDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const isEmployee = getRoleCategory(req.user.roleName) === 'Employee';
    const document = await EmployeeDocument.findById(documentId);
    if (!document) return res.status(404).json({ success: false, message: 'Document not found.' });

    if (!req.user.isSuperAdmin && req.user.companyId.toString() !== document.companyId.toString()) {
      return res.status(403).json({ success: false, message: 'Access forbidden.' });
    }

    if (isEmployee) {
      if (!document.isCompanyPolicy && document.employeeId.toString() !== req.user.userId.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied. You can only download your own documents.' });
      }
      if (!document.isDownloadable) {
        return res.status(403).json({ success: false, message: 'Download is restricted for this document.' });
      }
    }

    // Log Audit
    await logAction({
      companyId: document.companyId,
      userId: req.user.userId,
      module: 'document',
      action: 'download',
      newData: { documentId: document._id },
    });

    const resourceType = getResourceType(document.mimeType);
    const secureDownloadUrl = generateSignedUrl(document.cloudinaryPublicId, resourceType, document.originalFileName);

    return res.status(200).json({
      success: true,
      data: { downloadUrl: secureDownloadUrl, originalFileName: document.originalFileName },
    });
  } catch (error) {
    next(error);
  }
};

// Delete Document
export const deleteDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const doc = await EmployeeDocument.findById(documentId);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });

    if (!req.user.isSuperAdmin && doc.companyId.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ success: false, message: 'Access forbidden.' });
    }

    const resourceType = getResourceType(doc.mimeType);
    await deleteFromCloudinary(doc.cloudinaryPublicId, resourceType);
    await doc.deleteOne();

    await logAction({
      companyId: doc.companyId,
      userId: req.user.userId,
      module: 'document',
      action: 'delete',
      newData: { documentId: doc._id },
    });

    return res.status(200).json({ success: true, message: 'Document deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
