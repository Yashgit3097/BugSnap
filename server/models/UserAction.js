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
      type: String,
    },
    value: {
      type: String,
    },
    page: {
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

userActionSchema.index({ sessionId: 1 });

const UserAction = mongoose.model('UserAction', userActionSchema);
export default UserAction;
