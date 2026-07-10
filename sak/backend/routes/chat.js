const express = require('express');
const { Configuration, OpenAIApi } = require('openai');
const router = express.Router();
const auth = require('../middlewares/auth');
const Chat = require('../models/Chat');

const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }))
  : null;

// Get all conversations for user
router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await Chat.find({ userId: req.user.id })
      .select('conversationId title createdAt messages')
      .sort({ updatedAt: -1 })
      .limit(50);

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching conversations', error: error.message });
  }
});

// Get single conversation
router.get('/conversations/:conversationId', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      userId: req.user.id,
      conversationId: req.params.conversationId,
    });

    if (!chat) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching conversation', error: error.message });
  }
});

// Send message and get AI response
router.post('/message', auth, async (req, res) => {
  try {
    const { message, conversationId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    let chat = await Chat.findOne({
      userId: req.user.id,
      conversationId: conversationId || undefined,
    });

    if (!chat) {
      chat = new Chat({
        userId: req.user.id,
        conversationId: conversationId || undefined,
        messages: [],
      });
    }

    // Add user message
    chat.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    // Generate AI response
    const aiResponse = await generateAIResponse(message, chat.messages);

    // Add assistant message
    chat.messages.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date(),
    });

    // Update title if first message
    if (chat.messages.length === 2) {
      chat.title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
    }

    chat.updatedAt = new Date();
    await chat.save();

    res.json({
      conversationId: chat.conversationId,
      userMessage: message,
      assistantMessage: aiResponse,
      messages: chat.messages,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error processing message', error: error.message });
  }
});

// Create new conversation
router.post('/conversations', auth, async (req, res) => {
  try {
    const chat = new Chat({
      userId: req.user.id,
      title: 'New Conversation',
    });

    await chat.save();
    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: 'Error creating conversation', error: error.message });
  }
});

// Delete conversation
router.delete('/conversations/:conversationId', auth, async (req, res) => {
  try {
    const result = await Chat.deleteOne({
      userId: req.user.id,
      conversationId: req.params.conversationId,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    res.json({ message: 'Conversation deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting conversation', error: error.message });
  }
});

// AI response generator with optional OpenAI support and advanced fallback logic
async function generateAIResponse(userMessage, messageHistory) {
  if (openaiClient) {
    try {
      const systemPrompt = `You are a smart and helpful AI assistant for a cloud file storage app. Answer clearly and directly, focusing on file upload, sharing, folder management, user accounts, and security. Keep responses helpful and concise.`;
      const historyMessages = messageHistory.slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content
      }));
      const completion = await openaiClient.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          ...historyMessages,
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 250
      });
      const aiText = completion.data.choices?.[0]?.message?.content?.trim();
      if (aiText) {
        return aiText;
      }
    } catch (error) {
      console.error('OpenAI chat completion failed:', error.message || error);
      // Fall back to local answer generation when OpenAI fails
    }
  }

  const context = messageHistory
    .slice(-10)
    .map((msg) => `${msg.role === 'user' ? 'You' : 'Assistant'}: ${msg.content}`)
    .join('\n');

  const categories = {
    greeting: [
      "Hi there! I'm your AI assistant for Cloud File Storage. How can I help you today?",
      "Hello! I can help you upload files, share them, and manage your cloud storage. What do you want to do?"
    ],
    help: [
      'I can help with file upload, sharing, folder management, search, and account actions. What would you like to know?',
      'Ask me about uploading, sharing, renaming, deleting files, or how to manage folders and the AI assistant.'
    ],
    upload: [
      'To upload a file, use the upload area and drag files in or click to select them. You can choose private or public storage before uploading.',
      'Use the upload panel to add files. After uploading, your files appear in your list and can be shared, renamed, or organized.'
    ],
    share: [
      'You can share files by setting visibility to public. Public files are visible in the public gallery and can be accessed by others.',
      'Files are shared by selecting public visibility at upload or afterward. Private files remain accessible only to your account.'
    ],
    fileDefinition: [
      'A file is any document or media item you upload to cloud storage. It can be managed, renamed, organized into folders, or shared.',
      'In this app, a file is a digital object you store in the cloud. It is protected by your account and can be managed from your dashboard.'
    ],
    folder: [
      'Folders let you organize uploads by category, project, or type. Create a folder and then upload files into it or move files there.',
      'Use folders to group related files. Create a new folder, then drag files into it or select the folder on upload.'
    ],
    security: [
      'Your files are secured with authentication and stored privately unless you mark them public. Only logged-in users can manage private content.',
      'Security is enforced via JWT authentication. Public files are shared only when you explicitly choose public visibility.'
    ],
    account: [
      'Register or log in to use the app. Your account gives you control over private uploads, file management, and AI conversations.',
      'Your account stores your files and chat history. Use your login to access private files, upload documents, and ask the AI assistant questions.'
    ],
    fallback: [
      `I understand you're asking: "${userMessage}". I can help with uploading, sharing, organizing, or securing your files. What exactly would you like to do?`,
      `That sounds like a good question. I can assist with file uploads, sharing options, folder organization, and account settings. Please tell me more.`
    ]
  };

  const lowerMessage = userMessage.toLowerCase();
  const matches = {
    greeting: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
    upload: ['upload', 'uploading', 'drag', 'click to upload', 'upload files', 'file upload'],
    share: ['share', 'shared', 'public', 'visibility', 'link', 'sharing', 'share file'],
    fileDefinition: ['what is a file', 'what is file', 'define file', 'file means', 'file is'],
    folder: ['folder', 'directory', 'organize', 'organising', 'organize files', 'group files'],
    security: ['secure', 'security', 'encrypted', 'token', 'jwt', 'privacy', 'private', 'safe'],
    account: ['login', 'log in', 'register', 'sign up', 'account', 'credentials', 'signup'],
    help: ['help', 'what can you', 'assist', 'support', 'what should i do']
  };

  const findCategory = () => {
    for (const [category, triggers] of Object.entries(matches)) {
      if (triggers.some((trigger) => lowerMessage.includes(trigger))) {
        return category;
      }
    }
    if (lowerMessage.endsWith('?')) {
      return 'help';
    }
    return 'fallback';
  };

  const category = findCategory();
  const options = categories[category] || categories.fallback;
  const repeatCount = messageHistory.filter(
    (msg) => msg.role === 'user' && msg.content.toLowerCase().trim() === lowerMessage.trim()
  ).length;
  const index = repeatCount % options.length;
  return options[index];
}

module.exports = router;
