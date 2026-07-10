import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Plus, Trash2, Menu, X } from 'lucide-react';
import { api } from '../services/api';
import './Chatbot.css';

export function Chatbot({ user }) {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef(null);

  // Load conversations on mount
  useEffect(() => {
    if (user.token) {
      loadConversations();
    }
  }, [user.token]);

  // Ensure api client has the latest token
  useEffect(() => {
    if (user.token) {
      api.setToken(user.token);
    }
  }, [user.token]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const response = await api.get('/chat/conversations');
      setConversations(response.data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const createNewConversation = async () => {
    try {
      const response = await api.post('/chat/conversations', {});
      const newConv = response.data;
      setCurrentConversation(newConv.conversationId);
      setMessages([]);
      setConversations([newConv, ...conversations]);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const loadConversation = async (conversationId) => {
    try {
      const response = await api.get(`/chat/conversations/${conversationId}`);
      setCurrentConversation(conversationId);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    try {
      // Add user message to UI immediately
      setMessages((prev) => [
        ...prev,
        {
          role: 'user',
          content: userMessage,
          timestamp: new Date(),
        },
      ]);

      const response = await api.post('/chat/message', {
        message: userMessage,
        conversationId: currentConversation,
      });

      // Update messages with assistant response
      setMessages(response.data.messages);
      setCurrentConversation(response.data.conversationId);

      // Refresh conversations list
      loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, there was an error processing your message. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (conversationId, e) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;

    try {
      await api.delete(`/chat/conversations/${conversationId}`);
      setConversations(conversations.filter((c) => c.conversationId !== conversationId));
      if (currentConversation === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  if (!user.token) {
    return (
      <div className="chatbot-container login-required">
        <div className="login-message">
          <MessageCircle size={48} />
          <p>Sign in to use the AI Chatbot</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chatbot-container">
      {/* Sidebar */}
      <div className={`chatbot-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>Conversations</h2>
          <button
            className="new-conv-btn"
            onClick={createNewConversation}
            title="New conversation"
          >
            <Plus size={20} />
          </button>
          <button
            className="sidebar-toggle mobile-only"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="conversations-list">
          {conversations.length === 0 ? (
            <div className="no-conversations">
              <p>No conversations yet</p>
              <button onClick={createNewConversation} className="start-btn">
                Start Chatting
              </button>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.conversationId}
                className={`conversation-item ${
                  currentConversation === conv.conversationId ? 'active' : ''
                }`}
                onClick={() => loadConversation(conv.conversationId)}
              >
                <div className="conv-content">
                  <p className="conv-title">{conv.title}</p>
                  <span className="conv-date">
                    {new Date(conv.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <button
                  className="delete-btn"
                  onClick={(e) => deleteConversation(conv.conversationId, e)}
                  title="Delete conversation"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="chatbot-main">
        <div className="chat-header">
          <button
            className="sidebar-toggle desktop-only"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={20} />
          </button>
          <h1>AI Assistant</h1>
          {currentConversation && (
            <button
              className="new-chat-btn"
              onClick={createNewConversation}
              title="New conversation"
            >
              <Plus size={20} /> New Chat
            </button>
          )}
        </div>

        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="welcome-message">
              <MessageCircle size={48} />
              <h2>Welcome to AI Assistant</h2>
              <p>Start a conversation by asking me anything about your files or how to use the platform!</p>
              <div className="suggested-topics">
                <button
                  onClick={() => setInput('How do I upload files?')}
                  className="topic-btn"
                >
                  How do I upload files?
                </button>
                <button
                  onClick={() => setInput('How do I share files?')}
                  className="topic-btn"
                >
                  How do I share files?
                </button>
                <button onClick={() => setInput('Tell me about security')} className="topic-btn">
                  Tell me about security
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}`}>
                <div className="message-content">
                  <p>{msg.content}</p>
                  <span className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-form" onSubmit={sendMessage}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            disabled={loading}
            className="chat-input"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="send-btn"
            title="Send message"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
