import React from 'react';
import './Sidebar.css';

function Sidebar({
  contacts = [],
  selectedContact,
  setSelectedContact,
  selectedAccount
}) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span>Contacts</span>
      </div>
      <ul className="sidebar-list">
        {contacts.map(addr => (
          <li
            key={addr}
            className={`sidebar-contact${addr === selectedContact ? ' selected' : ''}`}
            onClick={() => setSelectedContact(addr)}
            title={addr}
          >
            <div className="sidebar-avatar">
              {addr === selectedAccount?.address ? 'Y' : addr[0]?.toUpperCase()}
            </div>
            <span className="sidebar-name">
              {addr === selectedAccount?.address ? 'You' : addr.slice(0, 12) + '...'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Sidebar;