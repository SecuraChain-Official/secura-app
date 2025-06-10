import React, { useEffect, useState, useCallback } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { web3Enable, web3Accounts, web3FromSource } from '@polkadot/extension-dapp';
import { u8aToString } from '@polkadot/util';
import { create } from 'ipfs-http-client';
import './App.css';

const ipfs = create({ url: 'http://127.0.0.1:5001/api/v0' });

const BLOCK_TIME_MS = 6000; // Adjust if your chain uses a different block time
const GENESIS_TIMESTAMP = 1749488148000; // Set to your chain's genesis timestamp in ms if known

function blockToDate(blockNumber) {
  return new Date(GENESIS_TIMESTAMP + blockNumber * BLOCK_TIME_MS).toLocaleString();
}

function getContentCid(content_cid) {
  try {
    return u8aToString(content_cid);
  } catch (e) {
    return '';
  }
}

function arrayPairsToObject(arr) {
  if (!Array.isArray(arr)) return arr;
  const obj = {};
  for (const [key, value] of arr) {
    obj[key] = value;
  }
  return obj;
}

function App() {
  const [api, setApi] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [message, setMessage] = useState('');
  const [allMessages, setAllMessages] = useState([]);
  const [messageCache, setMessageCache] = useState({});
  const [loading, setLoading] = useState(true);

  // Connect to chain and extension
  useEffect(() => {
    const connect = async () => {
      try {
        const wsProvider = new WsProvider('ws://127.0.0.1:9944');
        const api = await ApiPromise.create({ provider: wsProvider });
        const extensions = await web3Enable('Secura Messaging');
        if (!extensions.length) {
          alert('Install Polkadot.js extension');
          setLoading(false);
          return;
        }
        const allAccounts = await web3Accounts();
        if (!allAccounts.length) {
          alert('Create an account in Polkadot.js extension');
          setLoading(false);
          return;
        }
        const injector = await web3FromSource(allAccounts[0].meta.source);
        api.setSigner(injector.signer);
        setApi(api);
        setAccounts(allAccounts);
        setSelectedAccount(allAccounts[0]);
        setLoading(false);
      } catch (e) {
        alert('Failed to connect: ' + e.message);
        setLoading(false);
      }
    };
    connect();
  }, []);

  // Fetch all messages (inbox + outbox)
  const fetchAllMessages = useCallback(async () => {
    if (!api || !selectedAccount) return;
    let messages = [];

    // Inbox
    const inbox = await api.query.messaging.inbox(selectedAccount.address);
    const inboxIds = inbox.toArray ? inbox.toArray() : [];
    for (const id of inboxIds) {
      try {
        const data = await api.query.messaging.messages(id);
        if (data.isSome) {
          const msg = data.unwrap();
          const msgObj = arrayPairsToObject(msg);
          const contentCid = getContentCid(msgObj.contentCid);
          messages.push({
            id: typeof id?.toHex === 'function' ? id.toHex() : id?.toString?.() ?? String(id),
            sender: msgObj.sender?.toString?.() ?? '',
            recipient: msgObj.recipient?.toString?.() ?? '',
            contentCid,
            timestamp: msgObj.timestamp?.toNumber?.() ?? 0,
            read: msgObj.read?.valueOf?.() ?? false,
            direction: 'in'
          });
        }
      } catch (err) {
        console.error('Error processing inbox message:', { id, err });
      }
    }

    // Outbox
    const outbox = await api.query.messaging.outbox(selectedAccount.address);
    const outboxIds = outbox.toArray ? outbox.toArray() : [];
    for (const id of outboxIds) {
      try {
        const data = await api.query.messaging.messages(id);
        if (data.isSome) {
          const msg = data.unwrap();
          const msgObj = arrayPairsToObject(msg);
          const contentCid = getContentCid(msgObj.contentCid);
          messages.push({
            id: typeof id?.toHex === 'function' ? id.toHex() : id?.toString?.() ?? String(id),
            sender: msgObj.sender?.toString?.() ?? '',
            recipient: msgObj.recipient?.toString?.() ?? '',
            contentCid,
            timestamp: msgObj.timestamp?.toNumber?.() ?? 0,
            read: msgObj.read?.valueOf?.() ?? false,
            direction: 'out'
          });
        }
      } catch (err) {
        console.error('Error processing outbox message:', { id, err });
      }
    }

    // Sort by timestamp
    messages.sort((a, b) => a.timestamp - b.timestamp);
    setAllMessages(messages);

    // Build contacts list
    const contactSet = new Set();
    messages.forEach(msg => {
      if (msg.direction === 'in') contactSet.add(msg.sender);
      if (msg.direction === 'out') contactSet.add(msg.recipient);
    });
    setContacts(Array.from(contactSet));

    // Fetch IPFS content
    for (const msg of messages) {
      const cid = msg.contentCid;
      if (cid && !messageCache[cid]) {
        try {
          const content = [];
          for await (const chunk of ipfs.cat(cid)) {
            content.push(chunk);
          }
          const total = content.reduce((acc, curr) => [...acc, ...curr], []);
          const text = new TextDecoder().decode(new Uint8Array(total));
          setMessageCache(prev => ({ ...prev, [cid]: text }));
        } catch (e) {
          setMessageCache(prev => ({ ...prev, [cid]: '[IPFS fetch failed]' }));
        }
      }
    }
  }, [api, selectedAccount, messageCache]);

  useEffect(() => { fetchAllMessages(); }, [fetchAllMessages]);

  // Send message
  const sendMessage = async () => {
    if (!api || !selectedAccount || !selectedContact || !message) return;
    try {
      const content = new TextEncoder().encode(message);
      const { cid } = await ipfs.add(content);
      const cidBytes = Array.from(new TextEncoder().encode(cid.toString()));
      if (cidBytes.length > 64) {
        alert('CID is too long for the chain (max 64 bytes).');
        return;
      }
      const tx = api.tx.messaging.sendMessage(selectedContact, cidBytes);
      await tx.signAndSend(selectedAccount.address, { signer: selectedAccount.signer });
      setMessage('');
      setTimeout(() => { fetchAllMessages(); }, 2000);
    } catch (e) {
      alert('Send failed: ' + e.message);
    }
  };

  if (loading) return <div>Loading...</div>;

  // Filter messages for the selected contact
  const chatMessages = allMessages.filter(
    msg =>
      (msg.sender === selectedContact && msg.recipient === selectedAccount.address) ||
      (msg.recipient === selectedContact && msg.sender === selectedAccount.address)
  );

  return (
    <div className="chat-app" style={{ display: 'flex', height: '90vh' }}>
      <div className="sidebar" style={{ width: 250, borderRight: '1px solid #ccc', padding: 10 }}>
        <h3>Contacts</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {contacts.map(addr => (
            <li
              key={addr}
              title={addr}
              style={{
                padding: '8px',
                background: addr === selectedContact ? '#e0e0e0' : 'transparent',
                cursor: 'pointer'
              }}
              onClick={() => setSelectedContact(addr)}
            >
              {addr === selectedAccount?.address ? 'You' : addr.slice(0, 12) + '...'}
            </li>
          ))}
        </ul>
      </div>
      <div className="chat-window" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
          {/* Show selected contact's full address */}
          {selectedContact && (
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid #ccc',
              background: '#f5f5f5',
              fontWeight: 'bold',
              fontSize: 15
            }}>
              Chatting with: {selectedContact}
            </div>
          )}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: '#fafafa' }}>
            {selectedContact ? (
              chatMessages.length ? (
                chatMessages.map(msg => (
                  <div
                    key={msg.id}
                    style={{
                      margin: '8px 0',
                      textAlign: msg.direction === 'out' ? 'right' : 'left'
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-block',
                        background: msg.direction === 'out' ? '#cce5ff' : '#e2e2e2',
                        borderRadius: 8,
                        padding: '8px 12px',
                        maxWidth: '70%'
                      }}
                    >
                      <div style={{ fontSize: 14 }}>
                        {messageCache[msg.contentCid] || 'Loading...'}
                      </div>
                      <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
                        {blockToDate(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>
                  No messages yet.
                </div>
              )
            ) : (
              <div style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>
                Select a contact to start chatting.
              </div>
            )}
          </div>
          <div style={{ padding: 12, borderTop: '1px solid #ccc', background: '#fff' }}>
            <input
              type="text"
              placeholder="Type your message..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              style={{ width: '80%', padding: 8, fontSize: 16 }}
              onKeyDown={e => {
                if (e.key === 'Enter') sendMessage();
              }}
              disabled={!selectedContact}
            />
            <button
              onClick={sendMessage}
              style={{ marginLeft: 8, padding: '8px 16px', fontSize: 16 }}
              disabled={!selectedContact || !message}
            >
              Send
            </button>
          </div>
        </div>
      </div>
      );
}

      export default App;