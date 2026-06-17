import * as userService from '../services/user.service.js';

/**
 * Creates a new employee inside the active tenant.
 */
export const createEmployee = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const savedEmployee = await userService.createUser(companyId, req.body, userId);
    return res.status(201).json({ success: true, data: savedEmployee, message: 'Employee created successfully.' });
  } catch (error) { next(error); }
};

/**
 * Retrieves employee profile details by ID.
 */
export const getEmployeeProfile = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const employee = await userService.getUserById(companyId, req.params.id);
    return res.status(200).json({ success: true, data: employee, message: 'Employee profile retrieved successfully.' });
  } catch (error) { next(error); }
};

/**
 * Lists all employees inside the active tenant.
 */
export const getEmployees = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const employees = await userService.getUsers(companyId, req.query);
    return res.status(200).json({ success: true, data: employees, message: 'Employees list retrieved successfully.' });
  } catch (error) { next(error); }
};

/**
 * Updates employee details inside the active tenant.
 */
export const updateEmployee = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const updatedEmployee = await userService.updateUser(companyId, req.params.id, req.body, userId);
    return res.status(200).json({ success: true, data: updatedEmployee, message: 'Employee details updated successfully.' });
  } catch (error) { next(error); }
};

/**
 * Deletes an employee from the active tenant.
 */
export const deleteEmployee = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const deletedEmployee = await userService.deleteUser(companyId, req.params.id, userId);
    return res.status(200).json({ success: true, data: deletedEmployee, message: 'Employee deleted successfully.' });
  } catch (error) { next(error); }
};

/**
 * Terminates an employee — logic moved to service layer.
 */
export const terminateEmployee = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const terminated = await userService.terminateUser(companyId, req.params.id, userId);
    return res.status(200).json({ success: true, data: terminated, message: 'Employee terminated successfully.' });
  } catch (error) { next(error); }
};
