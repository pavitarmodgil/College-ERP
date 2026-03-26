const express = require('express')
const router = express.Router()
const {
  getTimetable,
  getSemesters,
  createEntry,
  updateEntry,
  deleteEntry,
} = require('../controllers/timetableController')
const { authGuard, requireRole } = require('../middleware/authGuard')

router.use(authGuard)

// WHY /semesters before / — static segment must come before dynamic routes or
// Express misroutes "semesters" as a param value
router.get('/semesters', requireRole('ADMIN'), getSemesters)
router.get('/', getTimetable)
router.post('/', requireRole('ADMIN'), createEntry)
router.patch('/:id', requireRole('ADMIN'), updateEntry)
router.delete('/:id', requireRole('ADMIN'), deleteEntry)

module.exports = router
