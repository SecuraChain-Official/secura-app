import React, { useEffect, useRef, useState } from 'react';
import './ChatWindow.css';

const BLOCK_TIME_MS = 6000; // Adjust if your chain uses a different block time
const GENESIS_TIMESTAMP = 1749488148000; // Set to your chain's genesis timestamp in ms if known

function blockToDate(blockNumber) {
  return new Date(GENESIS_TIMESTAMP + blockNumber * BLOCK_TIME_MS).toLocaleString();
}

function ChatWindow({ selectedContact, selectedGroup, chatMessages, messageCache, selectedAccount }) {
  const messagesEndRef = useRef(null);
  const [fileUrls, setFileUrls] = useState({});

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Fetch file content from IPFS for file messages
  useEffect(() => {
    chatMessages.forEach(async msg => {
      const content = messageCache[msg.contentCid];
      if (content && content.startsWith('[file]')) {
        const match = content.match(/^\[file\]\s*(.+?):\s*([a-zA-Z0-9]+)/);
        if (match) {
          const [, filename, cid] = match;
          if (!fileUrls[cid]) {
            try {
              const response = await fetch(`http://127.0.0.1:8080/ipfs/${cid}`);
              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
              setFileUrls(prev => ({ ...prev, [cid]: { url, filename, type: blob.type } }));
            } catch (e) {
              setFileUrls(prev => ({ ...prev, [cid]: { url: null, filename, type: null, error: true } }));
            }
          }
        }
      }
    });
    // eslint-disable-next-line
  }, [chatMessages, messageCache]);

  if (!selectedContact && !selectedGroup) {
    return (
      <div className="chat-window">
        <div className="cw-header">Select a contact or group to start chatting</div>
      </div>
    );
  }

  const headerTitle = selectedGroup
    ? `Group: ${selectedGroup}`
    : selectedContact === selectedAccount?.address
      ? 'You'
      : selectedContact;

  return (
    <div className="chat-window">
      <div className="cw-header">
        <div className="cw-header-avatar">
          {selectedGroup ? '👥' : (selectedContact === selectedAccount?.address ? 'Y' : selectedContact?.[0]?.toUpperCase())}
        </div>
        <span>{headerTitle}</span>
      </div>
      <div className="cw-messages" style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {chatMessages.length === 0 && (
          <div style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>No messages yet.</div>
        )}
        {chatMessages.map(msg => {
          const isOut = msg.sender === selectedAccount?.address;
          return (
            <div
              key={msg.id}
              className={`cw-bubble ${isOut ? 'cw-bubble-out' : 'cw-bubble-in'}`}
              style={{ alignSelf: isOut ? 'flex-end' : 'flex-start', marginBottom: 16, maxWidth: 400 }}
            >
              <div className="cw-content">
                {(() => {
                  const content = messageCache[msg.contentCid];
                  if (!content) return <span style={{ color: '#aaa' }}>Loading...</span>;
                  // Detect file message
                  if (content.startsWith('[file]')) {
                    const match = content.match(/^\[file\]\s*(.+?):\s*([a-zA-Z0-9]+)/);
                    if (match) {
                      const [, filename, cid] = match;
                      const file = fileUrls[cid];
                      if (file && file.url) {
                        if (file.type && file.type.startsWith('image/')) {
                          return (
                            <div>
                              <img src={file.url} alt={filename} style={{ maxWidth: 200, maxHeight: 200, borderRadius: 8 }} />
                              <div>
                                <a href={file.url} download={filename} style={{ color: '#6c63ff', textDecoration: 'underline' }}>
                                  {filename}
                                </a>
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div>
                              <a href={file.url} download={filename} style={{ color: '#6c63ff', textDecoration: 'underline' }}>
                                📎 {filename}
                              </a>
                            </div>
                          );
                        }
                      } else if (file && file.error) {
                        return <span style={{ color: 'red' }}>Failed to load file</span>;
                      } else {
                        return <span style={{ color: '#aaa' }}>Fetching file...</span>;
                      }
                    }
                  }
                  // Normal text
                  return content;
                })()}
              </div>
              <div style={{ fontSize: 12, color: '#343232', marginTop: 6 }}>
                {isOut ? 'You' : msg.sender?.slice(0, 8) + '...'}
                {' · '}
                {blockToDate(msg.timestamp)}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

export default ChatWindow;