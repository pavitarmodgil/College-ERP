const express = require('express')
const router = express.Router()
const {
  getTimetable,
  getSemesters,
  getInsights,
  createEntry,
  updateEntry,
  deleteEntry,
} = require('../controllers/timetableController')
const { authGuard, requireRole } = require('../middleware/authGuard')

router.use(authGuard)

// WHY static segments before / and /:id — static routes must come first or
// Express misroutes "semesters"/"insights" as a param value
router.get('/semesters', requireRole('ADMIN'), getSemesters)
router.get('/insights', requireRole('STUDENT'), getInsights)
router.get('/', getTimetable)
router.post('/', requireRole('ADMIN'), createEntry)
router.patch('/:id', requireRole('ADMIN'), updateEntry)
router.delete('/:id', requireRole('ADMIN'), deleteEntry)

module.exports = router
