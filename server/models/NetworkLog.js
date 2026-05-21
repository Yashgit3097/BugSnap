import mongoose from 'mongoose';

const networkLogSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    method: {
      type: String,
      required: true,
    },
    status: {
      type: Number,
    },
    requestHeaders: {
      type: mongoose.Schema.Types.Mixed,
    },
    requestBody: {
      type: String,
    },
    responseHeaders: {
      type: mongoose.Schema.Types.Mixed,
    },
    responseBody: {
      type: String,
    },
    duration: {
      type: Number,
    },
    time: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

networkLogSchema.index({ sessionId: 1 });

const NetworkLog = mongoose.model('NetworkLog', networkLogSchema);
export default NetworkLog;
