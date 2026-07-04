"use client";
import { useEffect, useState, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { ShieldAlert } from "lucide-react";
import { useSupabaseClient } from "../utils/supabase/useClient";
import ReportButton from "./ReportButton";

interface ChatModalProps {
  helperId: string;  // was providerId
  helperName: string;  // was providerName
  onClose: () => void;
}

export default function ChatModal({ helperId, helperName, onClose }: ChatModalProps) {
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Find or create conversation and fetch messages
  useEffect(() => {
    if (!user?.id || !helperId) return;
    const getOrCreateConversation = async () => {
      // Try to find existing conversation
      let { data: conv, error } = await supabase
        .from("conversations")
        .select("id")
        .or(`and(user1.eq.${user.id},user2.eq.${helperId}),and(user1.eq.${helperId},user2.eq.${user.id})`)
        .limit(1);
      let conversation_id = conv && conv.length > 0 ? conv[0].id : null;
      if (!conversation_id) {
        // Create new conversation
        const { data: newConv, error: createError } = await supabase
          .from("conversations")
          .insert([
            { user1: user.id, user2: helperId }
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
  }, [helperId, user?.id]);

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
          <h2 className="font-bold">Chat with {helperName}</h2>
          <button onClick={onClose} className="btn btn-sm btn-ghost">Close</button>
        </div>
        <div className="flex items-start gap-2 mb-2 px-2 py-1.5 rounded bg-amber-50 border border-amber-100 text-amber-800 text-xs">
          <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span>
            For your protection, keep payments on ZapTasks. Payments made
            outside the platform (e-transfer, cash) aren&apos;t covered by
            escrow or dispute support.
          </span>
        </div>
        {conversationId && (
          <div className="flex justify-end mb-2">
            <ReportButton targetType="message" targetId={conversationId} label="Report conversation" />
          </div>
        )}
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
