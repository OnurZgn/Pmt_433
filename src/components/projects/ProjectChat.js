import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, orderBy, getDocs, Timestamp, getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './ProjectChat.css';
import './CollaboratorsList.css';
import './Form.css';

export default function ProjectChat({ projectId, canEdit }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState({});
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Fetch messages periodically
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const q = query(
          collection(db, 'messages'),
          where('projectId', '==', projectId),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const messageList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMessages(messageList);
      } catch (err) {
        console.error('Error fetching messages:', err);
      }
    };

    // Initial fetch
    fetchMessages();

    // Set up polling
    const interval = setInterval(fetchMessages, 5000); // Fetch every 5 seconds
    return () => clearInterval(interval); // Cleanup on unmount
  }, [projectId]);

  // Fetch user data for display names
  useEffect(() => {
    const fetchUserData = async (userId) => {
      if (users[userId]) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          setUsers(prev => ({
            ...prev,
            [userId]: {
              displayName: userDoc.data().displayName,
              email: userDoc.data().email
            }
          }));
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    };

    messages.forEach(message => {
      if (!users[message.userId]) {
        fetchUserData(message.userId);
      }
    });
  }, [messages, users]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !canEdit) return;

    try {
      await addDoc(collection(db, 'messages'), {
        projectId,
        text: newMessage.trim(),
        userId: currentUser.uid,
        createdAt: Timestamp.now()
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatMessageDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const today = new Date();
    
    // If today, show only time
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If this year, show date without year
    if (date.getFullYear() === today.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
             date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Otherwise show full date
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleUserClick = (userId) => {
    navigate(`/user/${userId}`);
  };
  return (
    <>
      <h3 className="project-section-title">Project Chat</h3>
      <div className="project-chat">
        <div className="chat-messages">
          {messages.map(message => (
            <div 
              key={message.id} 
              className={`chat-message ${message.userId === currentUser.uid ? 'own-message' : ''}`}
            >
              <div 
                className="avatar medium clickable"
                onClick={() => handleUserClick(message.userId)}
              >
                {users[message.userId]?.displayName?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="message-content">
                <div className="message-header">
                  <span 
                    className="message-author"
                    onClick={() => handleUserClick(message.userId)}
                  >
                    {users[message.userId]?.displayName || 'Loading...'}
                  </span>
                  <span className="message-time">
                    {formatMessageDate(message.createdAt)}
                  </span>
                </div>
                <p className="message-text">{message.text}</p>
              </div>
            </div>
          ))}
        </div>
        {canEdit && (
          <form onSubmit={handleSubmit} className="chat-input-group">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="form-input"
              required
            />
            <button type="submit" className="form-btn form-btn-primary">Send</button>
          </form>
        )}
      </div>
    </>
  );
}
