import { Goal } from '../models/Goal.js';
import { calculateGoalProgress } from '../services/analyticsService.js';

export async function createGoal(req, res, next) {
  try {
    const { sportType, metricType, targetValue, period, startDate, endDate } = req.body;

    if (!metricType || !targetValue) {
      return res.status(400).json({ error: 'metricType and targetValue are required.' });
    }

    let start = startDate ? new Date(startDate) : new Date();
    let end = endDate ? new Date(endDate) : new Date();

    if (!endDate) {
      if (period === 'monthly') {
        end = new Date(start);
        end.setMonth(end.getMonth() + 1);
      } else {
        // default weekly
        end = new Date(start);
        end.setDate(end.getDate() + 7);
      }
    }

    const goal = new Goal({
      user: req.user._id,
      sportType: sportType || 'all',
      metricType,
      targetValue: Number(targetValue),
      period: period || 'weekly',
      startDate: start,
      endDate: end,
    });

    await goal.save();
    const evaluated = await calculateGoalProgress(goal);

    res.status(201).json({ goal: evaluated });
  } catch (err) {
    next(err);
  }
}

export async function getUserGoals(req, res, next) {
  try {
    const goals = await Goal.find({ user: req.user._id }).sort({ createdAt: -1 });
    const evaluatedGoals = await Promise.all(goals.map((g) => calculateGoalProgress(g)));
    res.json({ goals: evaluatedGoals });
  } catch (err) {
    next(err);
  }
}

export async function deleteGoal(req, res, next) {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found.' });
    }
    res.json({ message: 'Goal deleted successfully.' });
  } catch (err) {
    next(err);
  }
}
