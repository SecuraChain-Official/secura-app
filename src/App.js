import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { web3Enable, web3Accounts, web3FromSource } from '@polkadot/extension-dapp';
import { u8aToString } from '@polkadot/util';
import { create } from 'ipfs-http-client';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import MessageInput from './components/MessageInput';
import './App.css';

const ipfs = create({ url: 'http://127.0.0.1:5001/api/v0' });



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
  const [uploading, setUploading] = useState(false);
  const [newContact, setNewContact] = useState('');
  const inputRef = useRef();

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

  // Fetch all messages for the account
  const fetchAllMessages = useCallback(async () => {
    if (!api || !selectedAccount) return;
    let messages = [];

    // Fetch all inbox messages
    const inbox = await api.query.messaging.inbox(selectedAccount.address);
    const inboxIds = inbox.toArray ? inbox.toArray() : [];
    for (const id of inboxIds) {
      try {
        const data = await api.query.messaging.messages(id);
        if (data.isSome) {
          const msg = data.unwrap();
          messages.push({
            id: id.toString(),
            sender: msg.sender.toString(),
            recipient: msg.recipient.toString(),
            contentCid: u8aToString(msg.contentCid),
            timestamp: msg.timestamp.toNumber(),
            read: msg.read.valueOf(),
            direction: 'in'
          });
        }
      } catch (err) { }
    }

    // Fetch all outbox messages
    const outbox = await api.query.messaging.outbox(selectedAccount.address);
    const outboxIds = outbox.toArray ? outbox.toArray() : [];
    for (const id of outboxIds) {
      try {
        const data = await api.query.messaging.messages(id);
        if (data.isSome) {
          const msg = data.unwrap();
          messages.push({
            id: id.toString(),
            sender: msg.sender.toString(),
            recipient: msg.recipient.toString(),
            contentCid: u8aToString(msg.contentCid),
            timestamp: msg.timestamp.toNumber(),
            read: msg.read.valueOf(),
            direction: 'out'
          });
        }
      } catch (err) { }
    }

    messages.sort((a, b) => a.timestamp - b.timestamp);
    setAllMessages(messages);

    // Build contacts list from all messages (excluding self)
    const contactSet = new Set();
    messages.forEach(msg => {
      if (msg.sender !== selectedAccount.address) contactSet.add(msg.sender);
      if (msg.recipient !== selectedAccount.address) contactSet.add(msg.recipient);
    });
    setContacts(Array.from(contactSet));
  }, [api, selectedAccount]);

  // Fetch messages at app start and when dependencies change
  useEffect(() => { fetchAllMessages(); }, [fetchAllMessages]);

  // Auto-select first contact if none is selected and contacts exist
  useEffect(() => {
    if (!selectedContact && contacts.length > 0) {
      setSelectedContact(contacts[0]);
    }
    // eslint-disable-next-line
  }, [contacts]);

  // Fetch IPFS content for messages
  useEffect(() => {
    const fetchContent = async () => {
      for (const msg of allMessages) {
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
    };
    fetchContent();
    // eslint-disable-next-line
  }, [allMessages]);

  // Send message (to contact)
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
      await api.tx.messaging.sendMessage(selectedContact, cidBytes)
        .signAndSend(selectedAccount.address, { signer: selectedAccount.signer });
      setMessage('');
      fetchAllMessages();
      setTimeout(fetchAllMessages, 2000);
    } catch (e) {
      alert('Send failed: ' + e.message);
    }
  };

  // File upload handler
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const added = await ipfs.add(file);
      const cid = added.cid.toString();
      setMessage(`[file] ${file.name}: ${cid}`);
    } catch (err) {
      alert('File upload failed: ' + err.message);
    }
    setUploading(false);
  };

  // Add contact handler
  const handleAddContact = () => {
    if (
      newContact &&
      !contacts.includes(newContact) &&
      newContact !== selectedAccount?.address
    ) {
      setContacts(prev => [...prev, newContact]);
      setNewContact('');
      inputRef.current?.focus();
    }
  };

  if (loading) return <div>Loading...</div>;

  // Filter chat messages for UI
  const chatMessages = selectedContact
    ? allMessages.filter(
        msg =>
          (msg.sender === selectedContact && msg.recipient === selectedAccount.address) ||
          (msg.recipient === selectedContact && msg.sender === selectedAccount.address)
      )
    : [];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="app-root">
          <div className="chat-app">
            {/* --- your existing header and chat UI code --- */}
            <header className="app-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 24 }}>
              <span>Secura App</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <label style={{ marginRight: 8, color: '#fff', fontSize: '16px', fontWeight: 300 }}>Active Account:</label>
                <select
                  value={selectedAccount?.address || ''}
                  onChange={e => {
                    const acc = accounts.find(a => a.address === e.target.value);
                    setSelectedAccount(acc);
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid #ccc',
                    fontSize: 15
                  }}
                >
                  {accounts.map(acc => (
                    <option key={acc.address} value={acc.address}>
                      {acc.meta.name || acc.address}
                    </option>
                  ))}
                </select>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Add contact address"
                  value={newContact}
                  onChange={e => setNewContact(e.target.value)}
                  style={{ marginLeft: 12, marginRight: 8, padding: 4, width: 180, borderRadius: 6, border: '1px solid #ccc', fontSize: 15 }}
                />
                <button
                  onClick={handleAddContact}
                  disabled={
                    !newContact ||
                    contacts.includes(newContact) ||
                    newContact === selectedAccount?.address
                  }
                  style={{
                    padding: '6px 16px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#25d366',
                    color: '#fff',
                    fontWeight: 500,
                    fontSize: 15,
                    cursor: (!newContact ||
                      contacts.includes(newContact) ||
                      newContact === selectedAccount?.address) ? 'not-allowed' : 'pointer'
                  }}
                >
                  Add Contact
                </button>
              </div>
            </header>
            <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
              <Sidebar
                contacts={contacts}
                selectedContact={selectedContact}
                setSelectedContact={setSelectedContact}
                selectedAccount={selectedAccount}
              />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <ChatWindow
                  selectedContact={selectedContact}
                  chatMessages={chatMessages}
                  messageCache={messageCache}
                  selectedAccount={selectedAccount}
                />
                <MessageInput
                  message={message}
                  setMessage={setMessage}
                  sendMessage={sendMessage}
                  selectedContact={selectedContact}
                  handleFileUpload={handleFileUpload}
                  uploading={uploading}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={{
        width: '100%',
        textAlign: 'center',
        padding: '16px 0 12px 0',
        color: '#888',
        fontSize: 15,
        letterSpacing: 1,
        background: 'transparent'
      }}>
        Powered by Secura Chain
      </div>
    </div>
  );
}

export default App;