import React, { useRef, useState } from 'react';
import EmojiPicker from 'emoji-picker-react';
import './MessageInput.css';

function MessageInput({
  message,
  setMessage,
  sendMessage,
  selectedContact,
  selectedGroup,
  handleFileUpload,
  uploading
}) {
  const [showEmojis, setShowEmojis] = useState(false);
  const inputRef = useRef();

  const handleEmojiClick = (emojiData) => {
    setMessage(message + emojiData.emoji);
    inputRef.current.focus();
  };

  const canSend = (!!selectedContact || !!selectedGroup) && message;

  return (
    <div className="message-input-container" style={{ position: 'relative' }}>
      <label>
        <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
        <span style={{ cursor: 'pointer', marginRight: 8, fontSize: 22 }}>📎</span>
      </label>
      <button
        className="emoji-btn"
        type="button"
        onClick={() => setShowEmojis(v => !v)}
        tabIndex={-1}
        disabled={!selectedContact && !selectedGroup}
        style={{ marginRight: 8, fontSize: 22 }}
      >
        😊
      </button>
      {showEmojis && (
        <div style={{ position: 'absolute', bottom: 56, left: 0, zIndex: 20 }}>
          <EmojiPicker onEmojiClick={handleEmojiClick} />
        </div>
      )}
      <input
        ref={inputRef}
        className="message-input"
        placeholder="Type something..."
        value={message}
        onChange={e => setMessage(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && canSend) sendMessage(); }}
        disabled={!selectedContact && !selectedGroup}
      />
      <button
        className="message-send-btn"
        onClick={sendMessage}
        disabled={!canSend}
      >
        Send
      </button>
    </div>
  );
}

export default MessageInput;