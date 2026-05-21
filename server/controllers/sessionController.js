import asyncHandler from 'express-async-handler';
import { v4 as uuidv4 } from 'uuid';
import { v2 as cloudinary } from 'cloudinary';
import Session from '../models/Session.js';
import ConsoleLog from '../models/ConsoleLog.js';
import NetworkLog from '../models/NetworkLog.js';
import UserAction from '../models/UserAction.js';
import { broadcastToUser } from '../config/socket.js';

//Create a new bug recording session
export const createSession = asyncHandler(async (req, res) => {
  const { title, browserInfo } = req.body;

  const publicId = uuidv4();

  const session = await Session.create({
    userId: req.user._id, 
    title: title || 'Bug Recording',
    publicId,
    browserInfo,
    status: 'recording',
    startedAt: Date.now(),
  });

  res.status(201).json(session);
  broadcastToUser(req.user._id, 'SESSION_CREATED', session);
});

//Complete a session and save all recorded data
export const completeSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { duration, videoUrl, videoPublicId, logs, networkRequests, actions } = req.body;

  const session = await Session.findOne({ _id: id, userId: req.user._id });

  if (!session) {
    res.status(404);
    throw new Error('Session not found');
  }

  if (session.status === 'completed') {
    res.status(400);
    throw new Error('Session is already completed');
  }

  session.status = 'completed';
  session.endedAt = Date.now();
  session.duration = duration;
  session.videoUrl = videoUrl;
  session.videoPublicId = videoPublicId;
  await session.save();

 
  if (logs && logs.length > 0) {
    const logsToInsert = logs.map(log => ({ ...log, sessionId: session._id }));
    await ConsoleLog.insertMany(logsToInsert);
  }

  if (networkRequests && networkRequests.length > 0) {
    const networkToInsert = networkRequests.map(req => ({ ...req, sessionId: session._id }));
    await NetworkLog.insertMany(networkToInsert);
  }

  if (actions && actions.length > 0) {
    const actionsToInsert = actions.map(act => ({ ...act, sessionId: session._id }));
    await UserAction.insertMany(actionsToInsert);
  }

  res.json({
    message: 'Session completed successfully',
    publicId: session.publicId,
  });
  broadcastToUser(req.user._id, 'SESSION_COMPLETED', session);
});

//Get all sessions for the logged in user
export const getMySessions = asyncHandler(async (req, res) => {
  const sessions = await Session.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.status(200).json(sessions);
});

//Get a public session with all its data by publicId
export const getPublicSession = asyncHandler(async (req, res) => {
  const { publicId } = req.params;

  const session = await Session.findOne({ publicId }).populate('userId', 'username name');
  
  if (!session) {
    res.status(404);
    throw new Error('Session not found');
  }

  const [logs, networkRequests, actions] = await Promise.all([
    ConsoleLog.find({ sessionId: session._id }).sort({ time: 1 }), 
    NetworkLog.find({ sessionId: session._id }).sort({ time: 1 }),
    UserAction.find({ sessionId: session._id }).sort({ time: 1 })
  ]);

  res.json({
    session,
    logs,
    networkRequests,
    actions
  });
});

//Delete a recording session and its logs
export const deleteSession = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await Session.findOne({ _id: id, userId: req.user._id });

  if (!session) {
    res.status(404);
    throw new Error('Session not found or unauthorized');
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  if (session.videoPublicId) {
    try {
      await cloudinary.uploader.destroy(session.videoPublicId, { resource_type: 'video' });
    } catch (err) {
      console.error('Cloudinary deletion failed:', err);
    }
  }

  await Promise.all([
    ConsoleLog.deleteMany({ sessionId: session._id }),
    NetworkLog.deleteMany({ sessionId: session._id }),
    UserAction.deleteMany({ sessionId: session._id }),
    Session.deleteOne({ _id: session._id })
  ]);

  res.json({ message: 'Session deleted successfully' });
  broadcastToUser(req.user._id, 'SESSION_DELETED', { sessionId: session._id });
});
