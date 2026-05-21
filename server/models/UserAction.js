import mongoose from 'mongoose';

const userActionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    type: {
      type: String,
      enum: ['click', 'input', 'scroll', 'route_change'],
      required: true,
    },
    element: {
      type: String, // CSS Selector or descriptive name of the element
    },
    value: {
      type: String, // e.g. text entered in an input
    },
    page: {
      type: String, // The URL of the page where action occurred
    },
    time: {
      type: Number, // Time in milliseconds since recording started
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

userActionSchema.index({ sessionId: 1 });

const UserAction = mongoose.model('UserAction', userActionSchema);
export default UserAction;
