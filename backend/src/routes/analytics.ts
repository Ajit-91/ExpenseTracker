import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { Expense } from '../models/Expense';

const router = Router();

router.use(authenticateToken);

// Get summary for a month
router.get('/summary', async (req: AuthRequest, res: Response) => {
  try {
    const { month } = req.query;
    const query: any = { userId: req.userId };

    if (month && typeof month === 'string') {
      const start = new Date(`${month}-01T00:00:00.000Z`);
      const parts = month.split('-');
      const year = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const end = new Date(year, m, 0, 23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    const expenses = await Expense.find(query);

    let totalSpent = 0;
    const categoryTotals: { [key: string]: number } = {};

    expenses.forEach((exp) => {
      totalSpent += exp.amount;
      const category = exp.category || 'Other';
      categoryTotals[category] = (categoryTotals[category] || 0) + exp.amount;
    });

    let topCategory = 'None';
    let maxSpent = 0;
    Object.entries(categoryTotals).forEach(([cat, amt]) => {
      if (amt > maxSpent) {
        maxSpent = amt;
        topCategory = cat;
      }
    });

    return res.status(200).json({
      totalSpent,
      topCategory,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error fetching summary' });
  }
});

// Get category breakdown
router.get('/breakdown', async (req: AuthRequest, res: Response) => {
  try {
    const { month } = req.query;
    const query: any = { userId: req.userId };

    if (month && typeof month === 'string') {
      const start = new Date(`${month}-01T00:00:00.000Z`);
      const parts = month.split('-');
      const year = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const end = new Date(year, m, 0, 23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    const expenses = await Expense.find(query);

    const breakdown: { [key: string]: number } = {};
    expenses.forEach((exp) => {
      const cat = exp.category || 'Other';
      breakdown[cat] = (breakdown[cat] || 0) + exp.amount;
    });

    return res.status(200).json(breakdown);
  } catch (error) {
    return res.status(500).json({ message: 'Server error fetching breakdown' });
  }
});

export default router;
