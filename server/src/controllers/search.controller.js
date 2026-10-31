import { User } from '../models/User.js';
import { Club } from '../models/Club.js';
import { Segment } from '../models/Segment.js';

export async function globalSearch(req, res, next) {
  try {
    const { q, type } = req.query; // type: 'all', 'athletes', 'clubs', 'segments'

    if (!q || q.trim().length === 0) {
      return res.json({ athletes: [], clubs: [], segments: [] });
    }

    const regex = new RegExp(q.trim(), 'i');
    const results = {};

    if (!type || type === 'all' || type === 'athletes') {
      results.athletes = await User.find({
        $or: [{ name: regex }, { username: regex }, { city: regex }],
      })
        .select('name username avatarUrl city country stats')
        .limit(10);
    }

    if (!type || type === 'all' || type === 'clubs') {
      results.clubs = await Club.find({
        $or: [{ name: regex }, { city: regex }, { description: regex }],
      })
        .select('name description sportType city country memberCount avatar')
        .limit(10);
    }

    if (!type || type === 'all' || type === 'segments') {
      results.segments = await Segment.find({
        name: regex,
      })
        .select('name sportType distance elevationDiff effortCount')
        .limit(10);
    }

    res.json(results);
  } catch (err) {
    next(err);
  }
}
