import React, { useState } from 'react';
import WalletConnect from "@walletconnect/client";
import QRCodeModal from "@walletconnect/qrcode-modal";

// TRC-20 USDT Contract Address
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

const App = () => {
  const [connector, setConnector] = useState(null);
  const [account, setAccount] = useState('');

  // Initialize WalletConnect
  const connectWallet = async () => {
    const connector = new WalletConnect({
      bridge: "https://bridge.walletconnect.org",
      qrcodeModal: QRCodeModal,
    });

    // Check if already connected
    if (connector.connected) {
      setAccount(connector.accounts[0]);
      setConnector(connector);
      return;
    }

    // Create new session
    await connector.createSession();

    connector.on("connect", (error, payload) => {
      if (error) throw error;
      setAccount(payload.params[0].accounts[0]);
      setConnector(connector);
    });
  };

  // Send USDT Transaction
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
      
      // 2. Extract critical data
      const data = tx.raw_data.contract[0].parameter.value.data;
      
      // 3. Prepare Ethereum-style payload
      const txPayload = {
        from: account,
        to: USDT_CONTRACT,
        data: data,
        value: "0x0", // Must be hex
        gasPrice: "0x0", // Must be hex
        gas: `0x${tx.raw_data.fee_limit.toString(16)}`, // Convert to hex
        nonce: "0x0", // Must be hex
        chainId: 1 // Use Ethereum mainnet ID
      };

      // 4. Send signing request
      const signedTx = await connector.sendCustomRequest({
        method: "eth_sendTransaction",
        params: [txPayload],
      });

      console.log("✅ Transaction Hash:", signedTx);
      alert("Transaction successful! Hash: " + signedTx);
    } catch (error) {
      console.error("❌ Transaction Error:", error);
      
      // Special handling for Trust Wallet
      if (error.message.includes("Method not supported")) {
        alert("Please enable DApp browser in Trust Wallet:\nSettings → Preferences → DApp Browser → ON");
      } else {
        alert("Error: " + error.message);
      }
    }
  };

  return (
    <div>
      {!account ? (
        <button onClick={connectWallet}>Connect Trust Wallet</button>
      ) : (
        <div>
          <p>Connected: {account}</p>
          <button onClick={sendUSDT}>Send 1 USDT</button>
        </div>
      )}
    </div>
  );
};

export default App;
