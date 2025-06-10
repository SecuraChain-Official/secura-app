# Secura Blockchain Messaging App

Secura is a decentralized, end-to-end encrypted messaging app built on a Secura Chain. Messages are stored off-chain on IPFS, and only message CIDs and metadata are stored on-chain for privacy and scalability.

---

## Features

- **Decentralized Messaging:** Send and receive messages using your blockchain account.
- **IPFS Storage:** Message content is stored on IPFS; only CIDs are stored on-chain.
- **Contact List:** Sidebar shows all contacts you've chatted with.
- **Chat UI:** Modern chat interface with message bubbles, timestamps, and contact selection.
- **Polkadot.js Extension:** Sign in and send messages using your Polkadot.js wallet.
- **Local Time Display:** Message timestamps are shown in your system's local time.
- **CID Safety:** CIDs are encoded/decoded safely for Substrate compatibility.

---

## Getting Started

### Prerequisites

- Node.js and npm
- [Polkadot.js browser extension](https://polkadot.js.org/extension/)
- Local Substrate node running with the Secura messaging pallet
- Local IPFS node running (`http://127.0.0.1:5001`)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd secura-app/
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the app:**
   ```bash
   npm start
   ```
   The app will open at [http://localhost:3000](http://localhost:3000).

---

## Usage

- **Select Account:** Choose your blockchain account from the dropdown.
- **Select Contact:** Click a contact in the sidebar to view your chat.
- **Send Message:** Type your message and press Enter or click Send.
- **View Messages:** Messages are loaded from IPFS and shown in the chat window.
- **Hover Contact:** Hover over a contact to see their full address.

---

## Project Structure

- `src/App.js` — Main React component, handles blockchain, IPFS, and UI logic.
- `src/App.css` — Basic styling for the chat interface.
- `pallets/messaging/` — Substrate pallet for on-chain message metadata.

---

## Troubleshooting

- **IPFS Fetch Failed:** Make sure your IPFS daemon is running and accessible at `http://127.0.0.1:5001`.
- **No Accounts:** Install and set up the Polkadot.js browser extension.
- **Wrong Timestamps:** Set the correct `GENESIS_TIMESTAMP` in `App.js` to match your chain's genesis block.

---

## Customization

- **Change Block Time:** Edit `BLOCK_TIME_MS` in `App.js` if your chain uses a different block time.
- **Change Genesis Timestamp:** Edit `GENESIS_TIMESTAMP` in `App.js` to match your chain's genesis block (in ms).

---

## License

MIT

---

## Acknowledgements

- [Substrate](https://substrate.dev/)
- [IPFS](https://ipfs.io/)
- [Polkadot.js](https://polkadot.js.org/)