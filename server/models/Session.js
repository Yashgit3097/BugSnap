import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      default: 'Bug Recording',
    },
    publicId: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['recording', 'completed', 'failed'],
      default: 'recording',
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
    },
    duration: {
      type: Number, 
    },
    videoUrl: {
      type: String,
    },
    videoPublicId: {
      type: String,
    },
    originalVideoUrl: {
      type: String,
    },
    replayVideoUrl: {
      type: String,
    },
    videoMetadata: {
      width: Number,
      height: Number,
      format: String,
      bytes: Number,
      bitrate: Number
    },
    browserInfo: {
      browser: String,
      os: String,
      screenResolution: String,
      userAgent: String,
    },
  },
  {
    timestamps: true,
  }
);

const Session = mongoose.model('Session', sessionSchema);
export default Session;
