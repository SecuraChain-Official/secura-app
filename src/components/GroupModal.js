import React, { useState } from 'react';

function GroupModal({ contacts, onCreate, onClose }) {
  const [groupName, setGroupName] = useState('');
  const [selected, setSelected] = useState([]);

  const toggleContact = addr => {
    setSelected(selected =>
      selected.includes(addr)
        ? selected.filter(a => a !== addr)
        : [...selected, addr]
    );
  };

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
    }}>
      <div className="modal" style={{
        background: '#fff', borderRadius: 12, padding: 24, minWidth: 320, boxShadow: '0 2px 16px rgba(0,0,0,0.15)'
      }}>
        <h3>Create Group</h3>
        <input
          placeholder="Group name"
          value={groupName}
          onChange={e => setGroupName(e.target.value)}
          style={{ width: '100%', marginBottom: 12, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
        />
        <div style={{ maxHeight: 180, overflowY: 'auto', marginBottom: 12 }}>
          {contacts.map(addr => (
            <label key={addr} style={{ display: 'block', marginBottom: 4 }}>
              <input
                type="checkbox"
                checked={selected.includes(addr)}
                onChange={() => toggleContact(addr)}
              />
              <span style={{ marginLeft: 8 }}>{addr}</span>
            </label>
          ))}
        </div>
        <button
          style={{ marginRight: 8, background: '#25d366', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', fontWeight: 500 }}
          onClick={() => {
            if (groupName && selected.length > 0) {
              onCreate({ name: groupName, members: selected });
            }
          }}
        >
          Create
        </button>
        <button
          style={{ background: '#eee', border: 'none', borderRadius: 6, padding: '6px 16px' }}
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default GroupModal;