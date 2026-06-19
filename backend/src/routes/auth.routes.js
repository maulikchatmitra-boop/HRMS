import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import upload from '../middlewares/upload.middleware.js';
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
} from '../validators/auth.validator.js';

const router = Router();

// Public routes
router.post('/login',          validate(loginSchema),          authController.login);
router.post('/refresh-token',                                   authController.refreshToken);
router.post('/forgot-password',validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema),  authController.resetPassword);

// Protected routes (requires authentication)
router.post('/logout',          authenticate,                                    authController.logout);
router.post('/change-password', authenticate, validate(changePasswordSchema),   authController.changePassword);
router.get('/me',               authenticate,                                    authController.me);

// Self profile update — Har user apni profile update kar sakta hai
router.put('/profile',          authenticate, validate(updateProfileSchema),    authController.updateProfile);
router.post('/avatar',          authenticate, upload.single('avatar'),          authController.uploadAvatar);

export default router;
