import { Club, ClubMember } from '../models/Club.js';
import { Activity } from '../models/Activity.js';

export async function createClub(req, res, next) {
  try {
    const { name, description, sportType, city, country, coverPhoto, avatar, isPrivate } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Club name is required.' });
    }

    const existing = await Club.findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({ error: 'A club with this name already exists.' });
    }

    const club = new Club({
      name: name.trim(),
      description: description || '',
      sportType: sportType || 'all',
      city: city || '',
      country: country || '',
      coverPhoto: coverPhoto || '',
      avatar: avatar || '',
      isPrivate: isPrivate === true,
      owner: req.user._id,
      memberCount: 1,
    });

    await club.save();

    await ClubMember.create({
      club: club._id,
      user: req.user._id,
      role: 'owner',
    });

    res.status(201).json({ club });
  } catch (err) {
    next(err);
  }
}

export async function getClubs(req, res, next) {
  try {
    const { search, sportType } = req.query;
    const query = {};

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    if (sportType && sportType !== 'all') {
      query.sportType = sportType;
    }

    const clubs = await Club.find(query).sort({ memberCount: -1 }).limit(50);
    res.json({ clubs });
  } catch (err) {
    next(err);
  }
}

export async function getClubById(req, res, next) {
  try {
    const club = await Club.findById(req.params.id).populate('owner', 'name username');
    if (!club) {
      return res.status(404).json({ error: 'Club not found.' });
    }

    let isMember = false;
    let memberRole = null;

    if (req.user) {
      const membership = await ClubMember.findOne({
        club: club._id,
        user: req.user._id,
      });
      if (membership) {
        isMember = true;
        memberRole = membership.role;
      }
    }

    res.json({
      club,
      isMember,
      memberRole,
    });
  } catch (err) {
    next(err);
  }
}

export async function joinClub(req, res, next) {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({ error: 'Club not found.' });
    }

    const existing = await ClubMember.findOne({
      club: club._id,
      user: req.user._id,
    });

    if (existing) {
      return res.json({ message: 'Already a member of this club.' });
    }

    await ClubMember.create({
      club: club._id,
      user: req.user._id,
      role: 'member',
    });

    const count = await ClubMember.countDocuments({ club: club._id });
    club.memberCount = count;
    await club.save();

    res.json({ message: 'Successfully joined club.', isMember: true });
  } catch (err) {
    next(err);
  }
}

export async function leaveClub(req, res, next) {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({ error: 'Club not found.' });
    }

    const membership = await ClubMember.findOne({
      club: club._id,
      user: req.user._id,
    });

    if (!membership) {
      return res.status(400).json({ error: 'You are not a member of this club.' });
    }

    if (membership.role === 'owner') {
      return res.status(400).json({ error: 'Club owner cannot leave without transferring ownership.' });
    }

    await ClubMember.findByIdAndDelete(membership._id);

    const count = await ClubMember.countDocuments({ club: club._id });
    club.memberCount = count;
    await club.save();

    res.json({ message: 'Successfully left club.', isMember: false });
  } catch (err) {
    next(err);
  }
}

export async function getClubLeaderboard(req, res, next) {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({ error: 'Club not found.' });
    }

    // Members of this club
    const members = await ClubMember.find({ club: club._id });
    const userIds = members.map((m) => m.user);

    // Filter activities in the last 7 days
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const activityQuery = {
      user: { $in: userIds },
      startDate: { $gte: oneWeekAgo },
      visibility: { $in: ['public', 'followers'] },
    };

    if (club.sportType !== 'all') {
      activityQuery.sportType = club.sportType;
    }

    const aggregated = await Activity.aggregate([
      { $match: activityQuery },
      {
        $group: {
          _id: '$user',
          totalDistance: { $sum: '$metrics.distance' },
          totalMovingTime: { $sum: '$metrics.movingTime' },
          totalElevation: { $sum: '$metrics.elevationGain' },
          activityCount: { $sum: 1 },
        },
      },
      { $sort: { totalDistance: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 1,
          totalDistance: 1,
          totalMovingTime: 1,
          totalElevation: 1,
          activityCount: 1,
          user: {
            _id: '$user._id',
            name: '$user.name',
            username: '$user.username',
            avatarUrl: '$user.avatarUrl',
          },
        },
      },
    ]);

    const ranked = aggregated.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));

    res.json({ leaderboard: ranked });
  } catch (err) {
    next(err);
  }
}

export async function getClubMembers(req, res, next) {
  try {
    const members = await ClubMember.find({ club: req.params.id })
      .populate('user', 'name username avatarUrl city country')
      .sort({ createdAt: 1 });

    res.json({ members });
  } catch (err) {
    next(err);
  }
}
