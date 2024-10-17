import { useState, useEffect } from 'react';

export default function Index() {
  const [prompt, setPrompt] = useState(''); 
  const [loading, setLoading] = useState(false); 
  const [messages, setMessages] = useState([]); 
  const [token, setToken] = useState(null); 
  const [chatId, setChatId] = useState(null);

  useEffect(() => {
    const fetchToken = async () => {
      const response = await fetch('http://161.97.126.31/api/token/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@test.com',
          password: '123456',
        }),
      });

      const data = await response.json();
      setToken(data.access); 
    };

    fetchToken();
  }, []);


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token || !prompt) return; 
    setLoading(true);


    const requestBody = {
      question: prompt,
      ...(chatId && { chat_id: chatId }),
    };

    const endpoint = 'http://161.97.126.31/conversations';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody), 
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: prompt },
      { role: 'bot', content: '' }, 
    ]);

 
    reader.read().then(function processText({ done, value }) {
      if (done) {
        setLoading(false);
        return;
      }

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      lines.forEach(line => {
        if (line.startsWith('data: ')) {
          const jsonData = line.substring(6); 
          if (jsonData) {
            try {
              const parsedData = JSON.parse(jsonData); 


              setMessages((prev) => {
                const updatedMessages = [...prev];
                updatedMessages[updatedMessages.length - 1] = {
                  role: 'bot',
                  content: parsedData.text, 
                };
                return updatedMessages;
              });

              if (!chatId) {
                setChatId(parsedData.chat_id);
                window.history.pushState(null, '', `/chat/${parsedData.chat_id}`);
              }
            } catch (e) {
              console.error('Failed to parse JSON:', e);
            }
          }
        }
      });

      reader.read().then(processText);
    });

    setPrompt(''); 
  };

  return (
    <div className="chat-interface">
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={msg.role === 'user' ? 'message user' : 'message bot'}>
            {msg.content}
          </div>
        ))}
      </div>


      <form onSubmit={handleSubmit} className="inputs-wrapper">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your question..."
          className="chat-input"
          disabled={loading} 
        />
        <button type="submit" disabled={loading || !prompt}>
          {loading ? 'Loading...' : 'Submit'}
        </button>
      </form>
    </div>
    
  );

}
