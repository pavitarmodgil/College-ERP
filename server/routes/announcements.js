const express = require('express')
const router  = express.Router()
const { authGuard, requireRole } = require('../middleware/authGuard')
const {
  listAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} = require('../controllers/announcementController')

// All authenticated users can read
router.get('/',    authGuard, listAnnouncements)
router.get('/:id', authGuard, getAnnouncementById)

// Only admins can write
router.post('/',    authGuard, requireRole('ADMIN'), createAnnouncement)
router.patch('/:id', authGuard, requireRole('ADMIN'), updateAnnouncement)
router.delete('/:id', authGuard, requireRole('ADMIN'), deleteAnnouncement)

module.exports = router
