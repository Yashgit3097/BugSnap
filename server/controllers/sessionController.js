import asyncHandler from 'express-async-handler';
import { v4 as uuidv4 } from 'uuid';
import { v2 as cloudinary } from 'cloudinary';
import Session from '../models/Session.js';
import ConsoleLog from '../models/ConsoleLog.js';
import NetworkLog from '../models/NetworkLog.js';
import UserAction from '../models/UserAction.js';
import { broadcastToUser } from '../config/socket.js';

// @desc    Create a new bug recording session
// @route   POST /api/sessions/create
// @access  Private
export const createSession = asyncHandler(async (req, res) => {
  const { title, browserInfo } = req.body;

  // Create a unique public ID for sharing the session later
  const publicId = uuidv4();

  const session = await Session.create({
    userId: req.user._id, // Set by the protect middleware
    title: title || 'Bug Recording',
    publicId,
    browserInfo,
    status: 'recording',
    startedAt: Date.now(),
  });

  res.status(201).json(session);
  broadcastToUser(req.user._id, 'SESSION_CREATED', session);
});

// @desc    Complete a session and save all recorded data
// @route   POST /api/sessions/:id/complete
// @access  Private
export const completeSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { duration, videoUrl, videoPublicId, logs, networkRequests, actions } = req.body;

  // Find the session belonging to this user
  const session = await Session.findOne({ _id: id, userId: req.user._id });

  if (!session) {
    res.status(404);
    throw new Error('Session not found');
  }

  if (session.status === 'completed') {
    res.status(400);
    throw new Error('Session is already completed');
  }

  // Update session details
  session.status = 'completed';
  session.endedAt = Date.now();
  session.duration = duration;
  session.videoUrl = videoUrl;
  session.videoPublicId = videoPublicId;
  await session.save();

  // Save all logs in bulk if they exist
  if (logs && logs.length > 0) {
    const logsToInsert = logs.map(log => ({ ...log, sessionId: session._id }));
    await ConsoleLog.insertMany(logsToInsert);
  }

  // Save network requests in bulk if they exist
  if (networkRequests && networkRequests.length > 0) {
    const networkToInsert = networkRequests.map(req => ({ ...req, sessionId: session._id }));
    await NetworkLog.insertMany(networkToInsert);
  }

  // Save user actions in bulk if they exist
  if (actions && actions.length > 0) {
    const actionsToInsert = actions.map(act => ({ ...act, sessionId: session._id }));
    await UserAction.insertMany(actionsToInsert);
  }

  res.json({
    message: 'Session completed successfully',
    publicId: session.publicId, // Return the shareable link ID
  });
  broadcastToUser(req.user._id, 'SESSION_COMPLETED', session);
});

// @desc    Get all sessions for the logged in user
// @route   GET /api/sessions/my
// @access  Private
export const getMySessions = asyncHandler(async (req, res) => {
  // Sort by created date descending (newest first)
  const sessions = await Session.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json(sessions);
});

// @desc    Get a public session with all its data by publicId
// @route   GET /api/sessions/public/:publicId
// @access  Public
export const getPublicSession = asyncHandler(async (req, res) => {
  const { publicId } = req.params;

  // 1. Find the session
  const session = await Session.findOne({ publicId }).populate('userId', 'username name');
  
  if (!session) {
    res.status(404);
    throw new Error('Session not found');
  }

  // 2. Fetch all related data in parallel for speed
  const [logs, networkRequests, actions] = await Promise.all([
    ConsoleLog.find({ sessionId: session._id }).sort({ time: 1 }), // Sort chronologically
    NetworkLog.find({ sessionId: session._id }).sort({ time: 1 }),
    UserAction.find({ sessionId: session._id }).sort({ time: 1 })
  ]);

  // 3. Return everything structured for the frontend replay player
  res.json({
    session,
    logs,
    networkRequests,
    actions
  });
});

// @desc    Delete a recording session and its logs
// @route   DELETE /api/sessions/:id
// @access  Private
export const deleteSession = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find the session belonging to this user
  const session = await Session.findOne({ _id: id, userId: req.user._id });

  if (!session) {
    res.status(404);
    throw new Error('Session not found or unauthorized');
  }

  // Lazily configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  // If there is a Cloudinary video, delete it
  if (session.videoPublicId) {
    try {
      await cloudinary.uploader.destroy(session.videoPublicId, { resource_type: 'video' });
    } catch (err) {
      console.error('Cloudinary deletion failed:', err);
    }
  }

  // Delete all related logs in parallel
  await Promise.all([
    ConsoleLog.deleteMany({ sessionId: session._id }),
    NetworkLog.deleteMany({ sessionId: session._id }),
    UserAction.deleteMany({ sessionId: session._id }),
    Session.deleteOne({ _id: session._id })
  ]);

  res.json({ message: 'Session deleted successfully' });
  broadcastToUser(req.user._id, 'SESSION_DELETED', { sessionId: session._id });
});
