import { create } from "zustand";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatState = {
  open: boolean;
  /**
   * Held in the store rather than the component so the conversation survives
   * navigation — the chat head is mounted once at the root, but screens under it
   * remount freely, and a user who asks something on a floor screen then walks
   * to a spot should not come back to an empty thread.
   */
  messages: ChatMessage[];
  /**
   * Id of the assistant message currently being streamed into, or null when
   * nothing is generating. Drives the send/stop button and blocks a second
   * question while the model is mid-answer.
   */
  streamingMessageId: string | null;
  openChat: () => void;
  closeChat: () => void;
  appendMessages: (messages: ChatMessage[], limit: number) => void;
  startAssistantMessage: (id: string, limit: number) => void;
  appendToAssistantMessage: (id: string, chunk: string) => void;
  finishAssistantMessage: (id: string, finalContent?: string) => void;
  resetChat: () => void;
};

export const useChatStore = create<ChatState>((set, get) => ({
  open: false,
  messages: [],
  streamingMessageId: null,
  openChat: () => set({ open: true }),
  closeChat: () => set({ open: false }),
  appendMessages: (messages, limit) =>
    set({ messages: [...get().messages, ...messages].slice(-limit) }),

  /** Opens an empty assistant bubble that tokens then flow into. */
  startAssistantMessage: (id, limit) =>
    set({
      messages: [
        ...get().messages,
        { id, role: "assistant" as const, content: "" },
      ].slice(-limit),
      streamingMessageId: id,
    }),

  appendToAssistantMessage: (id, chunk) =>
    set({
      messages: get().messages.map((message) =>
        message.id === id
          ? { ...message, content: message.content + chunk }
          : message,
      ),
    }),

  /**
   * `finalContent` overwrites what streamed in. The token stream is raw model
   * output; the completed result is the parsed text, and letting the final value
   * win keeps stray template markers out of the bubble.
   */
  finishAssistantMessage: (id, finalContent) =>
    set({
      messages: get().messages.map((message) =>
        message.id === id && finalContent !== undefined
          ? { ...message, content: finalContent }
          : message,
      ),
      streamingMessageId: null,
    }),

  resetChat: () => set({ messages: [], streamingMessageId: null }),
}));
