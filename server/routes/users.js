const express = require('express')
const router = express.Router()
const {
  getUsers, getUserById, createUser,
  updateUser, deactivateUser, reactivateUser,
  adminResetPassword, getDepartments,
  createDepartment, updateDepartment, deleteDepartment,
  getStudentProfile,
} = require('../controllers/userController')
const { authGuard, requireRole } = require('../middleware/authGuard')

router.use(authGuard, requireRole('ADMIN'))

// WHY static routes before dynamic :id routes — Express matches
// top-to-bottom. /departments and /:id/profile must come before /:id
// or Express treats "departments" as the id value.

// Department CRUD
router.get('/departments', getDepartments)
router.post('/departments', createDepartment)
router.patch('/departments/:id', updateDepartment)
router.delete('/departments/:id', deleteDepartment)

// User CRUD
router.get('/', getUsers)
router.get('/:id/profile', getStudentProfile)
router.get('/:id', getUserById)
router.post('/', createUser)
router.patch('/:id', updateUser)
router.patch('/:id/deactivate', deactivateUser)
router.patch('/:id/reactivate', reactivateUser)
router.post('/:id/reset-password', adminResetPassword)

module.exports = router
