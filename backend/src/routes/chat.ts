import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { ChatSession } from '../models/ChatSession';
import { processChatMessage } from '../services/gemini';

const router = Router();

router.use(authenticateToken);

// Send chat message
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ message: 'Message is required' });
    }

    const userId = req.userId!;
    
    // Find or create Chat Session
    let chatSession = await ChatSession.findOne({ userId });
    if (!chatSession) {
      chatSession = new ChatSession({ userId, messages: [] });
    }

    // Format chat history for processing
    const history = chatSession.messages.map((m) => ({
      sender: m.sender as 'user' | 'model',
      text: m.text,
    }));

    // Extract authorization token from headers to pass to MCP tool executions
    const authHeader = req.headers['authorization'] || '';

    // Process using Gemini or fallback
    const botReply = await processChatMessage(userId, message, history, authHeader.replace('Bearer ', ''));

    // Save both messages to history
    chatSession.messages.push({ sender: 'user', text: message });
    chatSession.messages.push({ sender: 'model', text: botReply });
    
    // Cap chat history to last 50 messages to keep DB and memory usage optimized
    if (chatSession.messages.length > 50) {
      chatSession.messages.splice(0, chatSession.messages.length - 50);
    }

    await chatSession.save();

    return res.status(200).json({ message: botReply });
  } catch (error: any) {
    console.error('Error in chat route:', error);
    return res.status(500).json({ message: 'Server error processing message' });
  }
});

// Fetch chat history
router.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const chatSession = await ChatSession.findOne({ userId });
    if (!chatSession) {
      return res.status(200).json({ messages: [] });
    }
    return res.status(200).json({ messages: chatSession.messages });
  } catch (error) {
    return res.status(500).json({ message: 'Server error fetching chat history' });
  }
});

// Clear chat history
router.delete('/history', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    await ChatSession.deleteOne({ userId });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: 'Server error clearing chat history' });
  }
});

export default router;
