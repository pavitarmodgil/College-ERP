const express = require('express')
const router = express.Router()
const {
  listAssessments,
  createAssessment,
  updateAssessment,
  deleteAssessment,
} = require('../controllers/assessmentController')
const { authGuard, requireRole } = require('../middleware/authGuard')

router.use(authGuard)

// All authenticated roles can read (results are role-scoped in the controller)
router.get('/', listAssessments)

// Only teachers (own courses) and admins can mutate
router.post('/', requireRole('TEACHER', 'ADMIN'), createAssessment)
router.patch('/:id', requireRole('TEACHER', 'ADMIN'), updateAssessment)
router.delete('/:id', requireRole('TEACHER', 'ADMIN'), deleteAssessment)

module.exports = router
