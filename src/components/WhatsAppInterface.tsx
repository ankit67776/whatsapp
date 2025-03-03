'use client';

import { JSX, useState, useRef, useEffect } from "react";
import { MessageSquareMore } from "lucide-react";
import { Button } from "./ui/button";
import { readExcel } from "@/lib/readExcel";
import pLimit from 'p-limit';

interface Message {
  content: string;
  isSent: boolean;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
  file?: File | null;
}

export default function SendMessagePage(): JSX.Element {
  const [phone, setPhone] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [responseMessage, setResponseMessage] = useState<{
    success: boolean;
    message: string
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    async function fetchMessages() {
      try {
        const res = await fetch("/api/messages");
        if (!res.ok) {
          throw new Error("Failed to fetch messages");
        }
        const data: { messages: { flow_token: string }[] } = await res.json();
        console.log("Fetched messages:", data.messages);

        // Extract unique phone numbers
        const numbers = [...new Set(data.messages.map((msg: any) => String(msg.flow_token)))];
        setPhoneNumbers(numbers);

        console.log("Extracted phone numbers:", numbers);
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchMessages();
  }, []);

  const sendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!phone || !message) return;

    const newMessage: Message = {
      content: message,
      isSent: true,
      timestamp: new Date(),
      status: 'sent',
      file
    };
    setMessages(prev => [...prev, newMessage]);

    try {
      const formData = new FormData();
      formData.append("phone", phone);
      formData.append("message", message);
      if (file) formData.append("file", file);

      const res = await fetch("/api/send-message", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      setResponseMessage(res.ok ?
        { success: true, message: `Message sent to ${phone}` } :
        { success: false, message: result.error || "Failed to send message" }
      );

      setMessages(prev => prev.map(msg =>
        msg === newMessage ? { ...msg, status: res.ok ? 'delivered' : 'sent' } : msg
      ));

    } catch (error) {
      setResponseMessage({
        success: false,
        message: "Failed to connect to server"
      });
    }

    setMessage("");
    setFile(null);
  };

  const broadcastMessages = async () => {
    if (isBroadcasting) return;
    setIsBroadcasting(true);

    const limit = pLimit(10);

    const requests = phoneNumbers.map((number) => {
      const newMessage: Message = {
        content: `Broadcast message to ${number}`,
        isSent: true,
        timestamp: new Date(),
        status: 'sent',
        file: null
      };
      setMessages(prev => [...prev, newMessage]);

      const formData = new FormData();
      formData.append("phone", number);
      formData.append("message", message);
      if (file) formData.append("file", file);

      return limit(async () => {
        const response = await fetch("/api/send-message", { method: "POST", body: formData });

        setMessages(prev => prev.map(msg =>
          msg === newMessage ? { ...msg, status: response.ok ? 'delivered' : 'sent' } : msg
        ));

        return response;
      });
    });

    const results = await Promise.allSettled(requests);

    const failedNumbers = results
      .map((result, index) => (result.status === "rejected" ? phoneNumbers[index] : null))
      .filter(Boolean);

    setResponseMessage({
      success: true,
      message: `Broadcasted to ${phoneNumbers.length - failedNumbers.length} contacts. Failed: ${failedNumbers.length}`
    });

    if (failedNumbers.length > 0) {
      console.warn("Failed to send messages to:", failedNumbers);
    }
    setIsBroadcasting(false);
  };

  const sendInteractiveMessage = async () => {
    if (!phone) return;

    try {
      const formData = new FormData();
      formData.append("phone", phone);

      const response = await fetch("/api/send-interactive", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to send interactive message");
      }
    } catch (error) {
      console.error("Error sending interactive message:", error);
    }
  };

  const sendTemplateMessage = async () => {
    if (!phone) return;

    const newMessage: Message = {
      content: `Registration Form`,
      isSent: true,
      timestamp: new Date(),
      status: 'sent',
      file: null
    };
    setMessages(prev => [...prev, newMessage]);

    const formData = new FormData();
    formData.append("phone", phone);

    console.log(`Sending to: ${phone}`);

    try {
      const response = await fetch("/api/sendMessage", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      console.log(`Response for ${phone}:`, result);

      setMessages(prev => prev.map(msg =>
        msg === newMessage ? { ...msg, status: response.ok ? 'delivered' : 'sent' } : msg
      ));

      setResponseMessage(response.ok ?
        { success: true, message: `Template message sent to ${phone}` } :
        { success: false, message: result.error || "Failed to send template message" }
      );

    } catch (error) {
      console.error(`Error sending to ${phone}:`, error);
      setResponseMessage({
        success: false,
        message: "Failed to connect to server"
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  return (
    <div className="h-full flex flex-col bg-[#ece5dd]">
      {/* Chat Header */}
      <div className="bg-[#075e54] p-4 flex items-center justify-between">
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Enter phone number (+1234567890)"
          className="bg-transparent text-white placeholder-gray-300 focus:outline-none w-full"
        />
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#efeae2]">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.isSent ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`p-3 rounded-lg max-w-[80%] shadow ${msg.isSent ? 'bg-[#dcf8c6]' : 'bg-white'
              }`}>
              {msg.file && (
                <div className="mb-2 text-sm text-gray-500 flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  {msg.file.name}
                </div>
              )}
              <p className="text-gray-800">{msg.content}</p>
              <div className="flex items-center justify-end gap-2 mt-2">
                <span className="text-xs text-gray-500">
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                {msg.isSent && (
                  <span className="text-xs text-gray-500">
                    {msg.status === 'read' ? '✓✓' :
                      msg.status === 'delivered' ? '✓' : '◷'}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white p-4 border-t border-gray-200">
        <div className="flex items-center gap-2"> {/* Flex container to align form and button */}
          <form onSubmit={sendMessage} className="flex gap-2 items-center flex-1">
            <div className="relative flex-1">
              <button
                type="button"
                onClick={triggerFileInput}
                className="absolute left-2 top-2 text-[#075e54] hover:text-[#128c7e]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
              </button>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message"
                className="w-full border rounded-2xl py-2 px-4 pl-12 pr-4 resize-none focus:outline-none focus:border-[#075e54]"
                rows={1}
                required
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              {file && (
                <div className="absolute bottom-12 left-0 bg-white p-2 rounded-lg shadow flex items-center">
                  <span className="text-sm text-gray-600 mr-2">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            {/* Send Button */}
            <button
              type="submit"
              className="bg-[#075e54] text-white p-2 rounded-full w-10 h-10 flex items-center justify-center hover:bg-[#054d43]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </form>

          {/* Interactive Message Button (Now outside the form) */}
          <Button onClick={sendTemplateMessage} className="bg-[#075e54] text-white p-2 rounded-full w-10 h-10 flex items-center justify-center hover:bg-[#054d43]">
            <MessageSquareMore />
          </Button>
        </div>

        <button
          onClick={broadcastMessages}
          disabled={isBroadcasting}
          className={`mt-2 w-full text-center text-sm ${isBroadcasting ? "text-gray-400 cursor-not-allowed" : "text-[#075e54] hover:text-[#054d43]"
            }`}
        >
          {isBroadcasting ? "Broadcasting..." : "Broadcast Message"}
        </button>

      </div>




      {/* Status Messages */}
      {/* {responseMessage && (
        <div className={`p-2 text-center text-sm ${responseMessage.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
          {responseMessage.message}
        </div>
      )} */}
    </div>
  );
}