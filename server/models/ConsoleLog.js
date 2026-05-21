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
      type: String,
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

consoleLogSchema.index({ sessionId: 1 });

const ConsoleLog = mongoose.model('ConsoleLog', consoleLogSchema);
export default ConsoleLog;
