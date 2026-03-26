const express = require('express')
const router = express.Router()
const { authGuard, requireRole } = require('../middleware/authGuard')
const {
  listCourses,
  getAvailableCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deactivateCourse,
  assignTeacher,
  removeTeacher,
  enrollSelf,
  adminEnrollStudent,
  adminRemoveStudent,
} = require('../controllers/courseController')

// All routes require authentication
router.use(authGuard)

// Student: browse available courses to enroll
router.get('/available', requireRole('STUDENT'), getAvailableCourses)

// All roles: list courses (role-scoped in controller)
router.get('/', listCourses)

// All roles: get course detail
router.get('/:id', getCourseById)

// Admin only: create / edit / deactivate
router.post('/', requireRole('ADMIN'), createCourse)
router.patch('/:id', requireRole('ADMIN'), updateCourse)
router.patch('/:id/deactivate', requireRole('ADMIN'), deactivateCourse)

// Admin only: manage teachers
router.post('/:id/teachers', requireRole('ADMIN'), assignTeacher)
router.delete('/:id/teachers/:userId', requireRole('ADMIN'), removeTeacher)

// Student: self-enroll
router.post('/:id/enroll', requireRole('STUDENT'), enrollSelf)

// Admin: manage student enrollments
router.post('/:id/enrollments', requireRole('ADMIN'), adminEnrollStudent)
router.delete('/:id/enrollments/:userId', requireRole('ADMIN'), adminRemoveStudent)

module.exports = router
