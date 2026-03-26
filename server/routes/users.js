const express = require('express')
const router = express.Router()
const {
  getUsers, getUserById, createUser,
  updateUser, deactivateUser, adminResetPassword,
  getDepartments, getRecentActivity,
} = require('../controllers/userController')
const { authGuard, requireRole } = require('../middleware/authGuard')

// All user routes require: logged in + ADMIN role
// authGuard runs first (checks JWT), then requireRole (checks role)
router.use(authGuard, requireRole('ADMIN'))

// static paths must come before /:id to avoid string segments being treated as an id
router.get('/departments', getDepartments)
router.get('/recent-activity', getRecentActivity)
router.get('/', getUsers)
router.get('/:id', getUserById)
router.post('/', createUser)
router.patch('/:id', updateUser)
router.patch('/:id/deactivate', deactivateUser)
router.post('/:id/reset-password', adminResetPassword)

module.exports = router
