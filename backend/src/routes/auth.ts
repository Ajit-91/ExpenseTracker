import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_for_expense_tracker_app';

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Register route
router.post('/register', async (req: Request, res: Response) => {
  try {
    const validated = authSchema.parse(req.body);
    const { email, password } = validated;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();

    const token = jwt.sign({ userId: newUser._id }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(201).json({ token, userId: newUser._id, email });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    return res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login route
router.post('/login', async (req: Request, res: Response) => {
  try {
    const validated = authSchema.parse(req.body);
    const { email, password } = validated;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(200).json({ token, userId: user._id, email });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    return res.status(500).json({ message: 'Server error during login' });
  }
});

export default router;
