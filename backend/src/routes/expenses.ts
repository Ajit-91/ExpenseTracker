import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { Expense } from '../models/Expense';
import { categorizeExpenseWithAI } from '../services/gemini';

const router = Router();

// Zod schemas for validation
const createExpenseSchema = z.object({
  amount: z.number().positive(),
  category: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  note: z.string().optional(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format, must be YYYY-MM-DD",
  }).optional(),
});

const updateExpenseSchema = z.object({
  amount: z.number().positive().optional(),
  category: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format, must be YYYY-MM-DD",
  }).optional(),
});

// Apply JWT authentication to all routes here
router.use(authenticateToken);

// Create Expense
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    console.log({ body: req.body });
    const validated = createExpenseSchema.parse(req.body);
    const { amount, category, description, note, date } = validated;
    console.log({ validated })
    let finalCategory = category || 'Other';
    let finalDescription = description || 'SMS Expense';

    if (note) {
      console.log(`[Create-Expense] Note provided: "${note}". Calling Gemini for categorization...`);
      const aiResult = await categorizeExpenseWithAI(amount, finalDescription, note);
      finalCategory = aiResult.category;
      finalDescription = aiResult.description;
      console.log(`[Create-Expense] Gemini resolved. Category: ${finalCategory}, Desc: ${finalDescription}`);
    } else {
      if (!category || !description) {
        return res.status(400).json({ message: 'Category and Description are required when note is not provided' });
      }
    }

    const expense = new Expense({
      userId: req.userId,
      amount,
      category: finalCategory,
      description: finalDescription,
      date: date ? new Date(date) : new Date(),
    });

    await expense.save();
    console.log(`[Create-Expense] Saved expense:`, expense);
    return res.status(201).json({ success: true, expenseId: expense._id, expense });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error('Create expense error:', error);
    return res.status(500).json({ message: 'Server error creating expense' });
  }
});

// Get Expenses (with monthly filtering)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { month, category } = req.query;
    const query: any = { userId: req.userId };

    if (month && typeof month === 'string') {
      // month is in YYYY-MM format
      const start = new Date(`${month}-01T00:00:00.000Z`);
      // Find last day of the month
      const parts = month.split('-');
      const year = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const end = new Date(year, m, 0, 23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    if (category && typeof category === 'string') {
      query.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }

    const expenses = await Expense.find(query).sort({ date: -1 });
    return res.status(200).json({ expenses });
  } catch (error) {
    return res.status(500).json({ message: 'Server error fetching expenses' });
  }
});

// Update Expense
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const validated = updateExpenseSchema.parse(req.body);
    const expenseId = req.params.id;

    const expense = await Expense.findOne({ _id: expenseId, userId: req.userId });
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (validated.amount !== undefined) expense.amount = validated.amount;
    if (validated.category !== undefined) expense.category = validated.category;
    if (validated.description !== undefined) expense.description = validated.description;
    if (validated.date !== undefined) expense.date = new Date(validated.date);

    await expense.save();
    return res.status(200).json({ success: true, expense });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    return res.status(500).json({ message: 'Server error updating expense' });
  }
});

// Delete Expense
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const expenseId = req.params.id;
    const result = await Expense.deleteOne({ _id: expenseId, userId: req.userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: 'Server error deleting expense' });
  }
});

export default router;
