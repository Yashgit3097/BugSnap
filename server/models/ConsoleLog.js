import mongoose from 'mongoose';

const consoleLogSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    type: {
      type: String,
      enum: ['log', 'error', 'warn', 'info'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    stack: {
      type: String, // Optional stack trace
    },
    time: {
      type: Number, // Time in milliseconds since recording started
      required: true,
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// We add an index for sessionId to quickly fetch all logs for a specific session
consoleLogSchema.index({ sessionId: 1 });

const ConsoleLog = mongoose.model('ConsoleLog', consoleLogSchema);
export default ConsoleLog;
