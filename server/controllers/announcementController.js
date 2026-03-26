const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const VALID_TARGETS = ['ALL', 'ADMIN', 'TEACHER', 'STUDENT']

// GET /api/announcements?limit=&page=
// Returns announcements visible to the requesting user's role
async function listAnnouncements(req, res, next) {
  try {
    const role = req.user.role
    const limit = Math.min(parseInt(req.query.limit) || 20, 100)
    const page  = Math.max(parseInt(req.query.page) || 1, 1)
    const skip  = (page - 1) * limit

    const where = { targetRole: { in: ['ALL', role] } }

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { author: { select: { email: true, role: true } } },
      }),
      prisma.announcement.count({ where }),
    ])

    res.json({ announcements, total, page, limit })
  } catch (err) {
    next(err)
  }
}

// GET /api/announcements/:id
async function getAnnouncementById(req, res, next) {
  try {
    const role = req.user.role
    const announcement = await prisma.announcement.findFirst({
      where: {
        id: parseInt(req.params.id),
        targetRole: { in: ['ALL', role] },
      },
      include: { author: { select: { email: true, role: true } } },
    })

    if (!announcement) return res.status(404).json({ error: 'Announcement not found' })
    res.json(announcement)
  } catch (err) {
    next(err)
  }
}

// POST /api/announcements  (ADMIN only)
async function createAnnouncement(req, res, next) {
  try {
    const { title, body, targetRole } = req.body

    if (!title?.trim() || !body?.trim()) {
      return res.status(400).json({ error: 'title and body are required' })
    }
    if (!VALID_TARGETS.includes(targetRole)) {
      return res.status(400).json({ error: `targetRole must be one of: ${VALID_TARGETS.join(', ')}` })
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: title.trim(),
        body:  body.trim(),
        targetRole,
        authorId: req.user.id,
      },
      include: { author: { select: { email: true, role: true } } },
    })

    res.status(201).json(announcement)
  } catch (err) {
    next(err)
  }
}

// PATCH /api/announcements/:id  (ADMIN only)
async function updateAnnouncement(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    const { title, body, targetRole } = req.body

    if (targetRole && !VALID_TARGETS.includes(targetRole)) {
      return res.status(400).json({ error: `targetRole must be one of: ${VALID_TARGETS.join(', ')}` })
    }

    const data = {}
    if (title !== undefined) data.title = title.trim()
    if (body  !== undefined) data.body  = body.trim()
    if (targetRole !== undefined) data.targetRole = targetRole

    const announcement = await prisma.announcement.update({
      where: { id },
      data,
      include: { author: { select: { email: true, role: true } } },
    })

    res.json(announcement)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Announcement not found' })
    next(err)
  }
}

// DELETE /api/announcements/:id  (ADMIN only)
async function deleteAnnouncement(req, res, next) {
  try {
    await prisma.announcement.delete({ where: { id: parseInt(req.params.id) } })
    res.status(204).end()
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Announcement not found' })
    next(err)
  }
}

module.exports = {
  listAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
}
