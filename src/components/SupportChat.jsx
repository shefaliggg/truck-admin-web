import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FiMessageCircle, FiArrowLeft, FiSend } from 'react-icons/fi';
import { getConversations, getChatUnreadCount, getTripMessages, sendTripMessage } from '../services/chat';
import { socket } from '../services/socket';
import './SupportChat.css';

const POLL_MS = 25000;

const formatTime = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

const SupportChat = () => {
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTrip, setActiveTrip] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const panelRef = useRef(null);
  const listRef = useRef(null);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await getChatUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to fetch chat unread count:', err);
    }
  }, []);

  useEffect(() => {
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, POLL_MS);
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await getConversations();
      setConversations(data);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const togglePanel = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setActiveTrip(null);
      loadConversations();
    }
  };

  const openConversation = async (conversation) => {
    setActiveTrip(conversation);
    setLoadingThread(true);
    try {
      const data = await getTripMessages(conversation.tripId);
      setMessages(data);
      socket.emit('join-trip', conversation.tripId);
      refreshUnreadCount();
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoadingThread(false);
    }
  };

  const backToList = () => {
    setActiveTrip(null);
    loadConversations();
  };

  useEffect(() => {
    if (!activeTrip) return undefined;
    const onMessage = (message) => {
      if (String(message.tripId) !== String(activeTrip.tripId)) return;
      setMessages((prev) => (prev.some((m) => m._id === message._id) ? prev : [...prev, message]));
    };
    socket.on('chat-message', onMessage);
    return () => socket.off('chat-message', onMessage);
  }, [activeTrip]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const value = text.trim();
    if (!value || sending || !activeTrip) return;
    setSending(true);
    setText('');
    try {
      const message = await sendTripMessage(activeTrip.tripId, value);
      setMessages((prev) => (prev.some((m) => m._id === message._id) ? prev : [...prev, message]));
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="support-chat" ref={panelRef}>
      <button className="header-icon-btn" onClick={togglePanel} aria-label="Support chat">
        <FiMessageCircle />
        {unreadCount > 0 && (
          <span className="header-icon-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="header-dropdown support-chat-dropdown">
          {!activeTrip ? (
            <>
              <div className="header-dropdown-title-row">
                <h3>Support Chat</h3>
              </div>
              <div className="header-dropdown-list">
                {loadingList ? (
                  <div className="header-dropdown-empty">Loading...</div>
                ) : conversations.length === 0 ? (
                  <div className="header-dropdown-empty">
                    <FiMessageCircle size={22} />
                    <span>No active conversations</span>
                  </div>
                ) : (
                  conversations.map((c) => (
                    <button
                      key={c.tripId}
                      className={`conversation-item ${c.unreadCount > 0 ? 'unread' : ''}`}
                      onClick={() => openConversation(c)}
                    >
                      <span className="conversation-item-body">
                        <span className="conversation-item-title">
                          {c.otherPartyName} · {c.loadNumber}
                        </span>
                        {c.lastMessage && (
                          <span className="conversation-item-text">{c.lastMessage}</span>
                        )}
                      </span>
                      {c.unreadCount > 0 && (
                        <span className="conversation-item-badge">{c.unreadCount}</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="chat-thread">
              <div className="chat-thread-header">
                <button className="chat-thread-back" onClick={backToList} aria-label="Back">
                  <FiArrowLeft />
                </button>
                <span className="chat-thread-title">
                  {activeTrip.otherPartyName} · {activeTrip.loadNumber}
                </span>
              </div>

              <div className="chat-thread-messages" ref={listRef}>
                {loadingThread ? (
                  <div className="header-dropdown-empty">Loading...</div>
                ) : messages.length === 0 ? (
                  <div className="header-dropdown-empty">
                    <FiMessageCircle size={22} />
                    <span>No messages yet</span>
                  </div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m._id}
                      className={`chat-bubble-row ${m.senderRole === 'admin' ? 'mine' : 'theirs'}`}
                    >
                      <div className="chat-bubble">
                        {m.senderRole !== 'admin' && <span className="chat-bubble-sender">{m.senderName}</span>}
                        <span>{m.text}</span>
                      </div>
                      <span className="chat-bubble-time">{formatTime(m.createdAt)}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="chat-thread-input-row">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  rows={1}
                />
                <button
                  className="chat-thread-send"
                  onClick={handleSend}
                  disabled={!text.trim() || sending}
                  aria-label="Send"
                >
                  <FiSend />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SupportChat;
