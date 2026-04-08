import { useState, useRef, useEffect } from 'react';
import AppNav from '../components/AppNav';
import api from '../api/client';

export default function Chat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m Agence. Ask me anything about your finances.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      // Send history excluding the initial greeting
      const history = nextMessages.slice(1, -1); // skip system greeting + current msg
      const { data } = await api.post('/chat', { message: text, history });
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <AppNav />
      <main className="container">
        <h1>Ask Agence</h1>
        <div className="chat-thread">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-bubble chat-bubble--${msg.role}`}>
              <span className="chat-label">{msg.role === 'user' ? 'You' : 'Agence'}</span>
              <p>{msg.content}</p>
            </div>
          ))}
          {loading && (
            <div className="chat-bubble chat-bubble--assistant">
              <span className="chat-label">Agence</span>
              <p className="chat-typing">Analyzing<span className="dots">...</span></p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <form className="chat-form" onSubmit={sendMessage}>
          <input
            className="chat-input"
            type="text"
            placeholder="Ask about your finances..."
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
          />
          <button className="btn btn-primary" type="submit" disabled={loading || !input.trim()}>
            Send
          </button>
        </form>
      </main>
    </div>
  );
}
