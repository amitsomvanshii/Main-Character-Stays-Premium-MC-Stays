import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useChatSocket } from '../hooks/useChatSocket';
import { Send, X, MessageSquare, Image as ImageIcon, FileText } from 'lucide-react';
import { API_BASE_URL } from '../config';
import './ChatWidget.css';

const ChatWidget = ({ pgId, ownerId, ownerName, pgName, onClose }) => {
  const { user, token } = useAuth();
  const { socket } = useChatSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [activeConvId, setActiveConvId] = useState(null);
  const messageEndRef = useRef(null);

  useEffect(() => {
    initChat();
  }, [pgId, ownerId]);

  useEffect(() => {
    if (!socket || !activeConvId) return;

    const handleNewMessage = ({ message, conversationId }) => {
      if (conversationId === activeConvId) {
        setMessages(prev => [...prev, message]);
      }
    };

    socket.on('new_message', handleNewMessage);
    return () => socket.off('new_message', handleNewMessage);
  }, [socket, activeConvId]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initChat = async () => {
    try {
      // Find or create conversation for this specific PG/Owner
      const res = await fetch(`${API_BASE_URL}/api/chat/message`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ pgId, receiverId: ownerId, text: '' }) // Empty text just to get/create conv
      });
      const data = await res.json();
      // Since sendMessage returns the message, we need to handle if it's a new or existing session
      // For the widget, we'll fetch existing history if we have a convId
      const convRes = await fetch(`${API_BASE_URL}/api/chat/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const convs = await convRes.json();
      const thisConv = convs.find(c => c.pgId === pgId && c.ownerId === ownerId);
      
      if (thisConv) {
        setActiveConvId(thisConv.id);
        const msgRes = await fetch(`${API_BASE_URL}/api/chat/messages/${thisConv.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(await msgRes.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !attachment) return;

    const formData = new FormData();
    if (activeConvId) formData.append('conversationId', activeConvId);
    formData.append('text', newMessage);
    formData.append('pgId', pgId);
    formData.append('receiverId', ownerId);
    if (attachment) formData.append('attachment', attachment);

    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/message`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const sentMsg = await res.json();
      setMessages(prev => [...prev, sentMsg]);
      setNewMessage('');
      setAttachment(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="chat-widget-overlay">
      <div className="chat-widget card glass">
        <div className="chat-widget-header">
          <div className="header-info">
            <MessageSquare size={18} />
            <div>
              <strong>{ownerName}</strong>
              <p>{pgName}</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="chat-widget-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`msg-bubble ${msg.senderId === user.id ? 'sent' : 'received'}`}>
              {msg.text && <div className="text">{msg.text}</div>}
              {msg.attachmentUrl && (
                <div className="attachment">
                  <img src={`${API_BASE_URL}${msg.attachmentUrl}`} alt="attachment" />
                </div>
              )}
            </div>
          ))}
          <div ref={messageEndRef} />
        </div>

        <form className="chat-widget-input" onSubmit={handleSend}>
          <label className="attach-label">
            <ImageIcon size={18} />
            <input type="file" hidden onChange={e => setAttachment(e.target.files[0])} />
          </label>
          <input 
            type="text" 
            placeholder="Ask a question..." 
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
          />
          <button type="submit" className="send-btn" disabled={!newMessage.trim() && !attachment}>
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWidget;
