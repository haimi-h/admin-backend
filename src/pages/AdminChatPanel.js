import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import '../UserTable.css'; // Assuming some shared styles
import '../AdminChatPanel.css'; // Specific styles for admin chat

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const AdminChatPanel = () => {
    const navigate = useNavigate();
    const [conversations, setConversations] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const chatMessagesEndRef = useRef(null);
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [error, setError] = useState(null);

    const socketRef = useRef(null);
    const selectedUserRef = useRef(selectedUser); // Ref to keep track of selectedUser in socket callbacks
    const optimisticMessageIds = useRef(new Set());
    
    // Get current admin info from localStorage
    const currentAdmin = JSON.parse(localStorage.getItem('user'));
    const currentAdminId = currentAdmin ? currentAdmin.id : null;
    const token = localStorage.getItem('token'); // Get the token here

    const scrollToBottom = () => {
        chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Function to fetch conversations (users with unread messages)
    const fetchConversations = useCallback(async () => {
        if (!token) {
            setError('Authentication token missing. Please log in as admin.');
            return;
        }
        setLoadingConversations(true);
        setError(null);
        try {
            const response = await axios.get(`${API_BASE_URL}/chat/unread-conversations`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setConversations(response.data);
        } catch (error) {
            console.error('Error fetching unread conversations:', error);
            setError('Failed to load conversations. Ensure you are logged in as an admin.');
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setError('Session expired or unauthorized. Please log in again.');
                navigate('/admin/login'); // Redirect to admin login page
            }
        } finally {
            setLoadingConversations(false);
        }
    }, [token, navigate]);

    // Function to fetch messages for a selected user
    const fetchMessagesForUser = useCallback(async (userId) => {
        if (!token) {
            setError('Authentication token missing. Please log in as admin.');
            return;
        }
        setLoadingMessages(true);
        setError(null);
        try {
            const response = await axios.get(`${API_BASE_URL}/chat/messages/${userId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setMessages(response.data.map(msg => ({
                id: msg.id,
                sender: msg.sender_role, // 'user' or 'admin'
                text: msg.message_text,
                timestamp: msg.timestamp,
            })));
        } catch (error) {
            console.error(`Error fetching messages for user ${userId}:`, error);
            setError('Failed to load messages for this conversation.');
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setError('Session expired or unauthorized. Please log in again.');
                navigate('/admin/login'); // Redirect to admin login page
            }
        } finally {
            setLoadingMessages(false);
        }
    }, [token, navigate]);

    // Effect for Socket.IO connection and initial data fetch
    useEffect(() => {
        if (!currentAdminId || !token) {
            console.log("No admin ID or token found, skipping socket connection and data fetch.");
            setError('Please log in as an administrator.');
            return;
        }

        // Initialize Socket.IO connection
        if (!socketRef.current) {
            console.log('Attempting to connect Socket.IO...');
            socketRef.current = io(SOCKET_URL, {
                auth: {
                    token: token, // Pass the current token
                },
                transports: ['websocket', 'polling'],
            });

            socketRef.current.on('connect', () => {
                console.log('Socket connected:', socketRef.current.id);
                socketRef.current.emit('identifyAdmin', currentAdminId); // Admin identifies itself
            });

            socketRef.current.on('connect_error', (err) => {
                console.error('Socket connection error:', err.message);
                setError(`Connection error: ${err.message}. Please try refreshing.`);
                if (err.message.includes('Authentication error')) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setError('Authentication failed. Please log in again.');
                    navigate('/admin/login');
                }
            });

            socketRef.current.on('disconnect', (reason) => {
                console.log('Socket disconnected:', reason);
                // If disconnected due to unauthorized, trigger logout
                if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'ping timeout') {
                    // Consider if you want to aggressively log out or just show a message
                    // For admin panel, a logout is often appropriate for security
                    // localStorage.removeItem('token');
                    // localStorage.removeItem('user');
                    // setError('Disconnected. Please log in again.');
                    // navigate('/admin/login');
                }
            });

            socketRef.current.on('receiveMessage', (newMessage) => {
                console.log('Received new message:', newMessage);
                // Update selected conversation's messages if it's the active one
                if (selectedUserRef.current && newMessage.user_id === selectedUserRef.current.id) {
                    // Check if it's an optimistic update being confirmed
                    if (optimisticMessageIds.current.has(newMessage.tempId)) {
                        setMessages((prevMessages) => prevMessages.map(msg =>
                            msg.id === newMessage.tempId ? { // Assuming tempId is used as a placeholder ID
                                id: newMessage.id,
                                sender: newMessage.sender_role,
                                text: newMessage.message_text,
                                timestamp: newMessage.timestamp,
                            } : msg
                        ));
                        optimisticMessageIds.current.delete(newMessage.tempId);
                    } else {
                        // Add new message
                        setMessages((prevMessages) => [
                            ...prevMessages,
                            {
                                id: newMessage.id,
                                sender: newMessage.sender_role,
                                text: newMessage.message_text,
                                timestamp: newMessage.timestamp,
                            },
                        ]);
                    }
                }
                // Also re-fetch conversations to update unread counts/status
                fetchConversations();
            });

            socketRef.current.on('unreadConversationUpdate', (data) => {
                console.log('Unread conversation update received:', data);
                // Re-fetch conversations to update the list and unread indicators
                fetchConversations();
            });
        }

        // Initial fetch of conversations
        fetchConversations();

        // Cleanup on unmount
        return () => {
            if (socketRef.current) {
                console.log('Disconnecting Socket.IO on cleanup.');
                socketRef.current.off('connect');
                socketRef.current.off('connect_error');
                socketRef.current.off('disconnect');
                socketRef.current.off('receiveMessage');
                socketRef.current.off('unreadConversationUpdate');
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [currentAdminId, token, fetchConversations, fetchMessagesForUser, navigate]); // Re-run effect if currentAdminId or token changes

    // Update selectedUserRef whenever selectedUser state changes
    useEffect(() => {
        selectedUserRef.current = selectedUser;
    }, [selectedUser]);

    // Scroll to bottom whenever messages update
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSelectUser = (user) => {
        setSelectedUser(user);
        fetchMessagesForUser(user.id);
        if (socketRef.current) {
            // Leave previous room if any
            if (selectedUserRef.current) {
                socketRef.current.emit('leaveRoom', `user-${selectedUserRef.current.id}`);
            }
            // Join the new user's room
            socketRef.current.emit('joinRoom', `user-${user.id}`);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim() || !selectedUser || !currentAdminId || !token) {
            // showMessageBox('Message cannot be empty and a user must be selected.');
            return;
        }

        const tempId = Date.now(); // Unique ID for optimistic update
        optimisticMessageIds.current.add(tempId);

        // Optimistic UI update
        setMessages((prevMessages) => [
            ...prevMessages,
            {
                id: tempId, // Use tempId as a placeholder
                sender: 'admin',
                text: inputValue,
                timestamp: new Date().toISOString(),
            },
        ]);
        setInputValue(''); // Clear input immediately
        scrollToBottom();

        try {
            // Emit message via Socket.IO
            socketRef.current.emit('sendMessage', {
                userId: selectedUser.id,
                senderId: currentAdminId,
                senderRole: 'admin',
                messageText: inputValue,
                tempId: tempId, // Pass tempId for server confirmation
            });

            // No need for axios.post here if Socket.IO handles persistence
        } catch (error) {
            console.error('Error sending message:', error);
            setError('Failed to send message.');
            // Revert optimistic update if sending fails
            setMessages((prevMessages) => prevMessages.filter(msg => msg.id !== tempId));
            optimisticMessageIds.current.delete(tempId);
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setError('Session expired or unauthorized. Please log in again.');
                navigate('/admin/login');
            }
        }
    };

    return (
        <div className="admin-chat-panel">
            <header className="admin-chat-header">
                <button className="back-button" onClick={() => navigate(-1)}>← Back</button>
                <h2>Admin Chat Panel</h2>
            </header>

            {error && <div className="message-box error">{error}</div>}

            <div className="chat-content">
                <aside className="conversation-list">
                    <h3>Conversations</h3>
                    {loadingConversations ? (
                        <p>Loading conversations...</p>
                    ) : conversations.length === 0 ? (
                        <p>No active conversations.</p>
                    ) : (
                        <ul>
                            {conversations.map((user) => (
                                <li
                                    key={user.id}
                                    className={`conversation-item ${selectedUser && selectedUser.id === user.id ? 'selected' : ''} ${user.hasUnread ? 'has-unread' : ''}`}
                                    onClick={() => handleSelectUser(user)}
                                >
                                    {user.username} ({user.phone}) {user.hasUnread && <span className="unread-indicator">●</span>}
                                </li>
                            ))}
                        </ul>
                    )}
                </aside>

                <div className="chat-window">
                    {selectedUser ? (
                        <>
                            <header className="chat-window-header">
                                <h3>Chat with {selectedUser.username}</h3>
                            </header>
                            <main className="chat-messages-area">
                                {loadingMessages ? (
                                    <p>Loading messages...</p>
                                ) : messages.length === 0 ? (
                                    <p>No messages in this conversation yet.</p>
                                ) : (
                                    messages.map((message) => (
                                        <div
                                            key={message.id}
                                            className={`message-container ${message.sender === 'user' ? 'user-message' : 'admin-message'}`}
                                        >
                                            <div className="message-bubble">
                                                <p>{message.text}</p>
                                                <span className="message-timestamp">
                                                    {new Date(message.timestamp).toLocaleTimeString()}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={chatMessagesEndRef} />
                            </main>
                            <footer className="chat-footer">
                                <form onSubmit={handleSendMessage} className="message-form">
                                    <input
                                        type="text"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        placeholder="Type your reply..."
                                        className="message-input"
                                    />
                                    <button type="submit" className="send-button">Send</button>
                                </form>
                            </footer>
                        </>
                    ) : (
                        <div className="no-conversation-selected">
                            <p>Select a conversation to start chatting.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminChatPanel;
