const express = require('express')
const router = express.Router()
const {
  getTeacherCourses,
  getOrCreateSession,
  saveSession,
  getSessionHistory,
  getMyAttendance,
} = require('../controllers/attendanceController')
const { authGuard, requireRole } = require('../middleware/authGuard')

router.use(authGuard)

// WHY /my before /:courseId — specific static segments must come
// before dynamic :param segments, otherwise Express matches /my
// as courseId = "my" and calls the wrong handler.
router.get('/my', requireRole('STUDENT'), getMyAttendance)
router.get('/courses', requireRole('TEACHER'), getTeacherCourses)
router.get('/:courseId/session', requireRole('TEACHER'), getOrCreateSession)
router.post('/:courseId/session', requireRole('TEACHER'), saveSession)
router.get('/:courseId/history', requireRole('TEACHER'), getSessionHistory)

module.exports = router
