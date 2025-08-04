
// Updated Frontend (App.js)
import React, { useState } from 'react';
import { SignClient } from '@walletconnect/sign-client';
import { Web3Modal } from '@web3modal/standalone';

const PROJECT_ID = "a2cd3f6f2c8dde8024ed901de2d36bc1";
const modal = new Web3Modal({
  projectId: PROJECT_ID,
});

const App = () => {
  const [client, setClient] = useState(null);
  const [session, setSession] = useState(null);
  const [account, setAccount] = useState('');

  const connectWallet = async () => {
    const _client = await SignClient.init({
      projectId: PROJECT_ID,
      metadata: {
        name: "TRX DApp",
        description: "Sign USDT TX",
        url: "https://smartcont.netlify.app",
        icons: ["https://smartcont.netlify.app/icon.png"],
      },
    });

    const { uri, approval } = await _client.connect({
      requiredNamespaces: {
        tron: {
          methods: ["tron_signTransaction"],
          chains: ["tron:0x2b6653dc"],
          events: [],
        },
      },
    });

    if (uri) {
      modal.openModal({ uri });
    }

    const _session = await approval();
    const _account = _session.namespaces.tron.accounts[0].split(':')[2];

    setClient(_client);
    setSession(_session);
    setAccount(_account);
  };

const sendUSDT = async () => {
    try {
        // Step 1: Get raw transaction from backend
        const res = await fetch("https://smartcontbackend.onrender.com/create-tx", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from: account,
                to: "TFZTMmXP3kKANmPRskXiJHvDoDhEGWiUkB",
                amount: 1 // 1 USDT
            })
        });
        const tx = await res.json();

        // Step 2: Prepare payload for Trust Wallet
        const txPayload = {
            transaction: tx,
            method: "tron_signTransaction", // Some wallets need this explicitly
        };

        // Step 3: Request signature via WalletConnect
        const signed = await client.request({
            topic: session.topic,
            chainId: "tron:0x2b6653dc",
            request: {
                method: "tron_signTransaction",
                params: [txPayload], // Send as object, not raw tx
            },
        });

        // Step 4: Broadcast signed transaction
        const broadcast = await fetch("https://smartcontbackend.onrender.com/broadcast", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ signedTx: signed })
        });

        const result = await broadcast.json();
        console.log("Broadcast Result:", result);
    } catch (err) {
        console.error("Error in sendUSDT:", err);
    }
};

  return (
    <div>
      <button onClick={connectWallet}>Connect Trust Wallet</button>
      <button onClick={sendUSDT}>Send USDT</button>
    </div>
  );
};

export default App;
