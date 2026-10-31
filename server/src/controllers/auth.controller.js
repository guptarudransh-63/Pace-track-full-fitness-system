import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { signToken } from '../middleware/auth.js';

export async function register(req, res, next) {
  try {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ error: 'Name, username, email, and password are required.' });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Username or email already in use.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      passwordHash,
    });

    const token = signToken(user);

    // Set secure HttpOnly cookie
    res.cookie('pacetrack_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.status(201).json({
      user: user.toSafeObject(),
      token,
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: 'Email/username and password are required.' });
    }

    const user = await User.findOne({
      $or: [
        { email: emailOrUsername.toLowerCase() },
        { username: emailOrUsername.toLowerCase() },
      ],
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = signToken(user);

    res.cookie('pacetrack_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: user.toSafeObject(),
      token,
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res) {
  res.clearCookie('pacetrack_token');
  res.json({ message: 'Logged out successfully.' });
}

export async function getCurrentUser(req, res) {
  res.json({ user: req.user.toSafeObject() });
}

export async function updateProfile(req, res, next) {
  try {
    const allowedFields = ['name', 'bio', 'city', 'country', 'avatarUrl'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        req.user[field] = req.body[field];
      }
    }
    await req.user.save();
    res.json({ user: req.user.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

export async function updatePreferences(req, res, next) {
  try {
    const { unitPreference, privacyPreferences, notificationPreferences } = req.body;

    if (unitPreference && ['metric', 'imperial'].includes(unitPreference)) {
      req.user.unitPreference = unitPreference;
    }

    if (privacyPreferences) {
      if (['public', 'followers', 'private'].includes(privacyPreferences.defaultActivityVisibility)) {
        req.user.privacyPreferences.defaultActivityVisibility = privacyPreferences.defaultActivityVisibility;
      }
      if (privacyPreferences.hideHomeRadiusMeters !== undefined) {
        req.user.privacyPreferences.hideHomeRadiusMeters = Number(privacyPreferences.hideHomeRadiusMeters);
      }
      if (privacyPreferences.homeLatitude !== undefined) {
        req.user.privacyPreferences.homeLatitude =
          privacyPreferences.homeLatitude !== null &&
          privacyPreferences.homeLatitude !== '' &&
          !isNaN(Number(privacyPreferences.homeLatitude))
            ? Number(privacyPreferences.homeLatitude)
            : null;
      }
      if (privacyPreferences.homeLongitude !== undefined) {
        req.user.privacyPreferences.homeLongitude =
          privacyPreferences.homeLongitude !== null &&
          privacyPreferences.homeLongitude !== '' &&
          !isNaN(Number(privacyPreferences.homeLongitude))
            ? Number(privacyPreferences.homeLongitude)
            : null;
      }
    }

    if (notificationPreferences) {
      req.user.notificationPreferences = {
        ...req.user.notificationPreferences,
        ...notificationPreferences,
      };
    }

    await req.user.save();
    res.json({ user: req.user.toSafeObject() });
  } catch (err) {
    next(err);
  }
}
