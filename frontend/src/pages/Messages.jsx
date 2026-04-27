import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useChatSocket } from '../hooks/useChatSocket';
import { API_BASE_URL } from '../config';
import { Send, Image, FileText, User, MapPin, Search, X } from 'lucide-react';
import './Messages.css';

const MessageSkeleton = () => (
  <div className="messages-page container">
    <div className="messages-layout card glass skeleton" style={{ height: '600px', display: 'flex' }}>
      <div className="conv-sidebar" style={{ borderRight: '1px solid var(--border)', width: '300px' }}>
        <div className="sidebar-header skeleton" style={{ height: '60px', marginBottom: '10px' }} />
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="conv-item skeleton" style={{ height: '80px', margin: '10px', borderRadius: '12px' }} />
        ))}
      </div>
      <div className="chat-window" style={{ flex: 1 }}>
        <div className="chat-header skeleton" style={{ height: '70px' }} />
        <div className="message-list" style={{ padding: '20px' }}>
          <div className="skeleton" style={{ width: '60%', height: '40px', borderRadius: '18px', marginBottom: '16px' }} />
          <div className="skeleton" style={{ width: '40%', height: '40px', borderRadius: '18px', marginLeft: 'auto', marginBottom: '16px' }} />
          <div className="skeleton" style={{ width: '70%', height: '40px', borderRadius: '18px', marginBottom: '16px' }} />
        </div>
      </div>
    </div>
  </div>
);

const Messages = () => {
  const { user, token } = useAuth();
  const { socket } = useChatSocket();
  const pageRef = useRef(null);
  const listRef = useRef(null);
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  // Smart Page Scroll (On load)
  useEffect(() => {
    if (!loading && pageRef.current) {
      const offset = 100;
      const elementPosition = pageRef.current.offsetTop;
      window.scrollTo({
        top: elementPosition - offset,
        behavior: 'smooth'
      });
    }
  }, [loading]);

  // Reset scroll state on conversation change
  useEffect(() => {
    if (listRef.current) delete listRef.current.dataset.hasScrolled;
  }, [activeConv]);

  // Robust Message List Scroll
  useEffect(() => {
    if (listRef.current && messages.length > 0) {
      const isFirstLoad = !listRef.current.dataset.hasScrolled;
      const scrollToBottom = () => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight;
          if (isFirstLoad) listRef.current.dataset.hasScrolled = 'true';
        }
      };

      if (isFirstLoad) {
        scrollToBottom();
      } else {
        setTimeout(scrollToBottom, 50);
      }
    }
  }, [messages]);

  useEffect(() => {
    if (activeConv) {
      fetchMessages(activeConv.id);
    }
  }, [activeConv]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMsg = ({ message, conversationId }) => {
      if (activeConv && activeConv.id === conversationId) {
        setMessages(prev => [...prev, message]);
      }
      setConversations(prev => {
        return prev.map(c => {
          if (c.id === conversationId) {
            return { ...c, messages: [message], updatedAt: new Date().toISOString() };
          }
          return c;
        }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });
    };

    socket.on('new_message', handleNewMsg);
    return () => socket.off('new_message', handleNewMsg);
  }, [socket, activeConv]);

  const fetchConversations = async () => {
    try {
      const res = await fetch('${API_BASE_URL}/api/chat/conversations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setConversations(data);
      if (data.length > 0) setActiveConv(data[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/messages/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !attachment) return;

    const formData = new FormData();
    formData.append('conversationId', activeConv.id);
    formData.append('text', newMessage);
    if (attachment) formData.append('attachment', attachment);

    try {
      const res = await fetch('${API_BASE_URL}/api/chat/message', {
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
      alert('Failed to send message/file');
    }
  };

  const removeAttachment = () => setAttachment(null);

  if (loading) return <MessageSkeleton />;

  return (
    <div className="messages-page container">
      <div className="messages-layout card glass" ref={pageRef}>
        {/* Sidebar */}
        <div className="conv-sidebar">
          <div className="sidebar-header">
            <h3>Messages</h3>
          </div>
          <div className="conv-list">
            {conversations.length === 0 ? (
              <p className="no-conv">No conversations yet</p>
            ) : (
              conversations.map(conv => {
                const otherUser = user.role === 'STUDENT' ? conv.owner : conv.student;
                const lastMsg = conv.messages?.[0];
                return (
                  <div 
                    key={conv.id} 
                    className={`conv-item ${activeConv?.id === conv.id ? 'active' : ''}`}
                    onClick={() => setActiveConv(conv)}
                  >
                    <div className="avatar">
                      {otherUser.profileImage ? (
                        <img 
                          src={`${API_BASE_URL}${otherUser.profileImage}`} 
                          alt={otherUser.name} 
                          className="avatar-img"
                        />
                      ) : (
                        <User size={20} />
                      )}
                    </div>
                    <div className="conv-info">
                      <div className="conv-name">{otherUser.name}</div>
                      <div className="conv-meta">
                        {conv.pg?.name && <span><MapPin size={12} /> {conv.pg.name}</span>}
                      </div>
                      <div className="last-msg">
                        {lastMsg ? (lastMsg.text || 'Shared a file') : 'No messages yet'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className="chat-window">
          {activeConv ? (
            <>
              <div className="chat-header">
                <div className="header-info">
                  <h4>{user.role === 'STUDENT' ? activeConv.owner.name : activeConv.student.name}</h4>
                  <p>{activeConv.pg?.name || 'General Inquiry'}</p>
                </div>
              </div>

              <div className="message-list" ref={listRef}>
                {messages.map((msg, i) => (
                  <div key={i} className={`msg-bubble ${msg.senderId === user.id ? 'sent' : 'received'}`}>
                    {msg.text && <div className="text">{msg.text}</div>}
                    {msg.attachmentUrl && (
                      <div className="attachment">
                        {msg.attachmentUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                          <img src={`${API_BASE_URL}${msg.attachmentUrl}`} alt="attachment" />
                        ) : (
                          <a href={`${API_BASE_URL}${msg.attachmentUrl}`} target="_blank" rel="noreferrer">
                            <FileText size={16} /> View Attachment
                          </a>
                        )}
                      </div>
                    )}
                    <div className="time">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                ))}
              </div>

              <form className="msg-input-area" onSubmit={handleSend}>
                {attachment && (
                  <div className="attachment-preview fade-in">
                    {attachment.type.startsWith('image/') ? (
                      <img src={URL.createObjectURL(attachment)} alt="preview" />
                    ) : (
                      <div className="file-icon-preview"><FileText size={20} /> {attachment.name}</div>
                    )}
                    <button type="button" className="remove-attach" onClick={removeAttachment}><X size={14} /></button>
                  </div>
                )}
                <div className="input-row">
                  <label className="attachment-btn">
                    <Image size={22} />
                    <input 
                      type="file" 
                      hidden 
                      onChange={(e) => setAttachment(e.target.files[0])} 
                    />
                  </label>
                  <input 
                    type="text" 
                    placeholder="Type a message..." 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <button type="submit" className="send-btn btn-primary" disabled={!newMessage.trim() && !attachment}>
                    <Send size={18} />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="no-active-chat">
              <Search size={48} />
              <h3>Select a conversation to start chatting</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
