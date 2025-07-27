import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import io from "socket.io-client";
import { useNavigate } from "react-router-dom";
import "../UserTable.css";
import "../AdminChatPanel.css";

// const API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";
// const SOCKET_SERVER_URL = 'http://localhost:5000';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";

const AdminChatPanel = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const chatMessagesEndRef = useRef(null);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState(null);

  const socketRef = useRef(null);
  const selectedUserRef = useRef(selectedUser);
  const optimisticMessageIds = useRef(new Set());
  const [currentAdminId, setCurrentAdminId] = useState(null);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchConversations = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(
        `${API_BASE_URL}/chat/unread-conversations`,
        config
      );
      const convosWithUnread = response.data.map((c) => ({
        ...c,
        has_unread_messages: true,
      }));
      setConversations(convosWithUnread);
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  const handleReceiveMessage = useCallback((message) => {
    console.log("CLIENT RECEIVED MESSAGE:", JSON.stringify(message, null, 2));

    if (
      selectedUserRef.current &&
      message.user_id === selectedUserRef.current.id
    ) {
      setMessages((prevMessages) => {
        if (
          message.sender_role === "admin" &&
          message.tempId &&
          optimisticMessageIds.current.has(message.tempId)
        ) {
          optimisticMessageIds.current.delete(message.tempId);

          return prevMessages.map((msg) =>
            msg.id === message.tempId || msg.tempId === message.tempId
              ? {
                  id: message.id,
                  sender: message.sender_role,
                  text: message.message_text,
                  timestamp: message.timestamp,
                }
              : msg
          );
        }

        const isDuplicate = prevMessages.some(
          (msg) => msg.id === message.id || msg.tempId === message.tempId
        );

        if (!isDuplicate) {
          return [
            ...prevMessages,
            {
              id: message.id,
              sender: message.sender_role,
              text: message.message_text,
              timestamp: message.timestamp,
            },
          ];
        }

        return prevMessages;
      });
    }
  }, []);

  const handleUnreadUpdate = useCallback(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    const adminData = JSON.parse(localStorage.getItem("user"));
    if (adminData && adminData.role === "admin") {
      setCurrentAdminId(adminData.id);
      fetchConversations();
    } else {
      navigate("/login");
      return;
    }

    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL);

      socketRef.current.on("connect", () => {
        socketRef.current.emit("identifyAdmin", adminData.id);
      });

      socketRef.current.on("receiveMessage", handleReceiveMessage);
      socketRef.current.on("unreadConversationUpdate", handleUnreadUpdate);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [navigate, fetchConversations, handleReceiveMessage, handleUnreadUpdate]);

  const fetchMessagesForUser = async (user) => {
    setSelectedUser(user);
    setLoadingMessages(true);
    setMessages([]);

    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(
        `${API_BASE_URL}/chat/messages/${user.id}`,
        config
      );

      setMessages(
        response.data.map((msg) => ({
          id: msg.id,
          sender: msg.sender_role,
          text: msg.message_text,
          imageUrl: msg.image_url,
          timestamp: msg.timestamp,
        }))
      );

      fetchConversations();
    } catch (err) {
      setError("Failed to load messages.");
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputValue.trim() === "" || !selectedUser || !socketRef.current) return;

    const tempMessageId = `optimistic-admin-${Date.now()}`;
    const messageToSend = {
      userId: selectedUser.id,
      senderId: currentAdminId,
      senderRole: "admin",
      messageText: inputValue.trim(),
      tempId: tempMessageId,
    };

    setMessages((prev) => [
      ...prev,
      {
        id: tempMessageId,
        tempId: tempMessageId,
        sender: "admin",
        text: messageToSend.messageText,
        timestamp: new Date().toISOString(),
      },
    ]);

    optimisticMessageIds.current.add(tempMessageId);
    setInputValue("");
    socketRef.current.emit("sendMessage", messageToSend);
  };

  return (
    <div className="admin-chat-panel-container">
      <h1>Admin Chat</h1>
      <div className="chat-content-wrapper">
        <div className="conversation-list">
          <h2>Conversations</h2>
          {conversations.length > 0 ? (
            <ul>
              {conversations.map((conv) => (
                <li
                  key={conv.id}
                  className={`conversation-item ${
                    selectedUser?.id === conv.id ? "active" : ""
                  }`}
                  onClick={() => fetchMessagesForUser(conv)}
                >
                  {conv.username}
                  {conv.has_unread_messages && (
                    <span className="unread-indicator">New!</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>No active conversations.</p>
          )}
        </div>
        <div className="chat-window">
          {selectedUser ? (
            <>
              <header className="chat-window-header">
                <h2>Chat with {selectedUser.username}</h2>
              </header>
              <main className="chat-messages-area">
                {loadingMessages ? (
                  <div className="loading-message">Loading...</div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`message-container ${
                        message.sender === "admin"
                          ? "admin-message"
                          : "user-message"
                      }`}
                    >
                      <div className="message-bubble">
                        <p>{message.text}</p>
                        <span className="message-timestamp">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="message-bubble">
                        {message.text && <p>{message.text}</p>}
                        {message.imageUrl && (
                          <img
                            src={`${SOCKET_URL}${message.imageUrl}`}
                            alt="User upload"
                            className="chat-image"
                          />
                        )}
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
                  <button type="submit" className="send-button">
                    Send
                  </button>
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
