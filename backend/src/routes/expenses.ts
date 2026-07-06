import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { Expense } from '../models/Expense';
import { categorizeExpenseWithAI } from '../services/gemini';

const router = Router();

// Zod schemas for validation
const createExpenseSchema = z.object({
  amount: z.number().positive(),
  category: z.string().min(1),
  description: z.string().min(1),
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
    const validated = createExpenseSchema.parse(req.body);
    const { amount, category, description, date } = validated;

    const expense = new Expense({
      userId: req.userId,
      amount,
      category,
      description,
      date: date ? new Date(date) : new Date(),
    });

    await expense.save();
    return res.status(201).json({ success: true, expenseId: expense._id, expense });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
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

// AI Categorize Expense based on a custom user note
router.post('/:id/ai-categorize', async (req: AuthRequest, res: Response) => {
  try {
    const expenseId = req.params.id;
    const { note } = req.body;
    console.log(`[AI-Categorize] Request received for ID: ${expenseId}, Note: "${note}"`);

    if (!note || typeof note !== 'string') {
      console.warn(`[AI-Categorize] Validation failed. Note is missing or not a string:`, note);
      return res.status(400).json({ message: 'Note is required' });
    }

    console.log(`[AI-Categorize] Querying database for expense with ID: ${expenseId} and User ID: ${req.userId}`);
    const expense = await Expense.findOne({ _id: expenseId, userId: req.userId });
    if (!expense) {
      console.warn(`[AI-Categorize] Expense not found or unauthorized for ID: ${expenseId}`);
      return res.status(404).json({ message: 'Expense not found' });
    }

    console.log(`[AI-Categorize] Expense found. Amount: ${expense.amount}, Current Desc: "${expense.description}". Calling Gemini...`);
    const aiResult = await categorizeExpenseWithAI(expense.amount, expense.description, note);
    console.log(`[AI-Categorize] Gemini returned result:`, aiResult);

    expense.category = aiResult.category;
    expense.description = aiResult.description;
    await expense.save();
    console.log(`[AI-Categorize] Successfully updated and saved expense details:`, expense);

    return res.status(200).json({ success: true, expense });
  } catch (error: any) {
    console.error('AI categorization route error:', error);
    return res.status(500).json({ message: 'Server error categorizing expense with AI' });
  }
});

export default router;
