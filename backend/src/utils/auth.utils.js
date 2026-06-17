import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 12;
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access_secret_123456';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret_123456';
const JWT_RESET_SECRET = process.env.JWT_RESET_SECRET || 'reset_secret_123456';

/**
 * Hashes a plaintext password using bcrypt.
 * @param {string} password - Raw password text.
 * @returns {Promise<string>} The hashed password string.
 */
export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return await bcrypt.hash(password, salt);
};

/**
 * Compares a plaintext password against a hashed password.
 * @param {string} password - Raw password text.
 * @param {string} hashedPassword - Hashed password to verify against.
 * @returns {Promise<boolean>} Resolves to true if matching.
 */
export const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * Generates a signed Access Token (exp: 15m).
 * @param {Object} payload - User context keys ({ userId, companyId, roleId }).
 * @returns {string} JWT access token.
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: '15m' });
}

/**
 * Generates a signed Refresh Token (exp: 7d).
 * @param {Object} payload - User context keys ({ userId, companyId, roleId }).
 * @returns {string} JWT refresh token.
 */
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

/**
 * Generates a signed Reset Password Token (exp: 30m).
 * @param {Object} payload - Password reset identifiers ({ userId, companyId, email, action: 'reset_password' }).
 * @returns {string} JWT reset token.
 */
export const generateResetToken = (payload) => {
  return jwt.sign(payload, JWT_RESET_SECRET, { expiresIn: '30m' });
};

/**
 * Verifies a JWT token.
 * Supports verifying 'access', 'refresh', or 'reset' token types.
 * @param {string} token - Token to verify.
 * @param {'access'|'refresh'|'reset'} [type='access'] - Secret type to verify against.
 * @returns {Object} Decoded token payload.
 */
export const verifyToken = (token, type = 'access') => {
  let secret = JWT_ACCESS_SECRET;
  if (type === 'refresh') secret = JWT_REFRESH_SECRET;
  if (type === 'reset') secret = JWT_RESET_SECRET;

  return jwt.verify(token, secret);
};
