const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const authMiddleware = require('../middleware/auth')

// Register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars')
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { name, email, password } = req.body
    try {
      const existing = await User.findOne({ email })
      if (existing) return res.status(400).json({ message: 'Email already in use' })

      const salt = await bcrypt.genSalt(10)
      const passwordHash = await bcrypt.hash(password, salt)

      const user = new User({ name, email, passwordHash })
      await user.save()

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' })

      res.json({ token, user: user.toJSON() })
    } catch (err) {
      console.error(err)
      res.status(500).json({ message: 'Server error' })
    }
  }
)

// Login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').exists().withMessage('Password required')
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { email, password } = req.body
    try {
      const user = await User.findOne({ email })
      if (!user) return res.status(400).json({ message: 'Invalid credentials' })

      const match = await bcrypt.compare(password, user.passwordHash)
      if (!match) return res.status(400).json({ message: 'Invalid credentials' })

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' })
      res.json({ token, user: user.toJSON() })
    } catch (err) {
      console.error(err)
      res.status(500).json({ message: 'Server error' })
    }
  }
)

// Get profile
router.get('/me', authMiddleware, async (req, res) => {
  if (!req.currentUser) return res.status(404).json({ message: 'User not found' })
  res.json(req.currentUser)
})

// Update profile
router.put(
  '/me',
  authMiddleware,
  [
    body('name').optional().trim().notEmpty(),
    body('email').optional().isEmail()
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    try {
      const updates = {}
      if (req.body.name) updates.name = req.body.name
      if (req.body.email) updates.email = req.body.email

      const updated = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-passwordHash')
      res.json(updated)
    } catch (err) {
      console.error(err)
      res.status(500).json({ message: 'Server error' })
    }
  }
)

module.exports = router
