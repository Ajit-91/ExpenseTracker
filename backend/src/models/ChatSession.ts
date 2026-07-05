import { Schema, model } from 'mongoose';

const MessageSchema = new Schema(
  {
    sender: {
      type: String,
      enum: ['user', 'model'],
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const ChatSessionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    messages: [MessageSchema],
  },
  { timestamps: true }
);

export const ChatSession = model('ChatSession', ChatSessionSchema);
export default ChatSession;
