const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const auth = require('../middleware/auth')
const Task = require('../models/Task')

// GET tasks (with optional search q)
router.get('/', auth, async (req, res) => {
  try {
    const q = req.query.q || ''
    const filter = { owner: req.user.id }
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ]
    }
    const tasks = await Task.find(filter).sort({ createdAt: -1 })
    res.json(tasks)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// POST create task
router.post(
  '/',
  auth,
  [ body('title').trim().notEmpty().withMessage('Title required') ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    try {
      const task = new Task({
        title: req.body.title,
        description: req.body.description || '',
        owner: req.user.id
      })
      await task.save()
      res.status(201).json(task)
    } catch (err) {
      console.error(err)
      res.status(500).json({ message: 'Server error' })
    }
  }
)

// PUT update task
router.put('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
    if (!task) return res.status(404).json({ message: 'Task not found' })
    if (task.owner.toString() !== req.user.id) return res.status(403).json({ message: 'Forbidden' })

    const updates = {}
    if (req.body.title !== undefined) updates.title = req.body.title
    if (req.body.description !== undefined) updates.description = req.body.description
    if (req.body.completed !== undefined) updates.completed = req.body.completed

    const updated = await Task.findByIdAndUpdate(req.params.id, updates, { new: true })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// DELETE task
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
    if (!task) return res.status(404).json({ message: 'Task not found' })
    if (task.owner.toString() !== req.user.id) return res.status(403).json({ message: 'Forbidden' })

    await task.deleteOne()
    res.json({ message: 'Deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
