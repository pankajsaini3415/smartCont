// App.js (React)
import React, { useState } from 'react';
import { SignClient } from '@walletconnect/sign-client';
import TronWeb from 'tronweb';

const PROJECT_ID = "a2cd3f6f2c8dde8024ed901de2d36bc1";

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
    console.log(uri);
    if (uri) {
      window.location.href = "trust://wc?uri=" +`${encodeURIComponent(uri)}`;
    }

    const _session = await approval();
    const _account = _session.namespaces.tron.accounts[0].split(':')[2];

    setClient(_client);
    setSession(_session);
    setAccount(_account);
  };

  const sendUSDT = async () => {
    const res = await fetch("https://smartcontbackend.onrender.com/create-tx", {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: account,
        to: "TFZTMmXP3kKANmPRskXiJHvDoDhEGWiUkB",
        amount: 1000000 // 1 USDT = 1,000,000 (6 decimals)
      })
    });

    const tx = await res.json();
    console.log(tx);
    const signed = await client.request({
      topic: session.topic,
      chainId: "tron:0x2b6653dc",
      request: {
        method: "tron_signTransaction",
        params: [tx],
      },
    });

    const broadcast = await fetch("https://smartcontbackend.onrender.com/broadcast", {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signedTx: signed })
    });

    const result = await broadcast.json();
    console.log(result);
  };

  return (
    <div>
      <button onClick={connectWallet}>Connect Trust Wallet</button>
      <button onClick={sendUSDT}>Send USDT</button>
    </div>
  );
};

export default App;
