const express = require('express')
const router = express.Router()
const {
  getTeacherCourses,
  getCourseStudents,
  upsertGrade,
  getMyGrades,
} = require('../controllers/gradeController')
const { authGuard, requireRole } = require('../middleware/authGuard')

router.use(authGuard)

// WHY /my and /courses before /:courseId — static segments
// must come before dynamic :param segments or Express matches
// "my" and "courses" as courseId values
router.get('/my', requireRole('STUDENT'), getMyGrades)
router.get('/courses', requireRole('TEACHER'), getTeacherCourses)
router.get('/:courseId/students', requireRole('TEACHER'), getCourseStudents)
router.post('/:courseId/students/:enrollmentId', requireRole('TEACHER'), upsertGrade)

module.exports = router
