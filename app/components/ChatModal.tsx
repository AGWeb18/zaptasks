"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "../utils/supabase/client";
import { useUser } from "@clerk/nextjs";

interface ChatModalProps {
  providerId: string;
  providerName: string;
  onClose: () => void;
}

export default function ChatModal({ providerId, providerName, onClose }: ChatModalProps) {
  const { user } = useUser();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const supabase = createClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Find or create conversation and fetch messages
  useEffect(() => {
    if (!user?.id || !providerId) return;
    const getOrCreateConversation = async () => {
      // Try to find existing conversation
      let { data: conv, error } = await supabase
        .from("conversations")
        .select("id")
        .or(`user1.eq.${user.id},user2.eq.${user.id}`)
        .or(`user1.eq.${providerId},user2.eq.${providerId}`)
        .limit(1);
      let conversation_id = conv && conv.length > 0 ? conv[0].id : null;
      if (!conversation_id) {
        // Create new conversation
        const { data: newConv, error: createError } = await supabase
          .from("conversations")
          .insert([
            { user1: user.id, user2: providerId }
          ])
          .select();
        conversation_id = newConv && newConv.length > 0 ? newConv[0].id : null;
      }
      setConversationId(conversation_id);
      if (conversation_id) {
        // Fetch messages
        const { data: msgs } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversation_id)
          .order("created_at", { ascending: true });
        setMessages(msgs || []);
        // Subscribe to new messages
        supabase
          .channel(`messages:${conversation_id}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversation_id}` }, payload => {
            setMessages(prev => [...prev, payload.new]);
          })
          .subscribe();
      }
    };
    getOrCreateConversation();
    // eslint-disable-next-line
  }, [providerId, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !conversationId || !user?.id) return;
    await supabase.from("messages").insert([
      {
        conversation_id: conversationId,
        sender: user.id,
        content: input.trim(),
      },
    ]);
    setInput("");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-4 flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-bold">Chat with {providerName}</h2>
          <button onClick={onClose} className="btn btn-sm btn-ghost">Close</button>
        </div>
        <div className="flex-1 overflow-y-auto mb-2" style={{ maxHeight: 300 }}>
          {messages.map((msg, i) => (
            <div key={i} className={`mb-1 ${msg.sender === user?.id ? "text-right" : "text-left"}`}>
              <span className={`inline-block px-2 py-1 rounded ${msg.sender === user?.id ? "bg-blue-200" : "bg-gray-100"}`}>{msg.content}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="flex gap-2">
          <input
            className="input input-bordered flex-1"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
          />
          <button className="btn btn-primary" onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
}
