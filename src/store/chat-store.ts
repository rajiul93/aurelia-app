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
  openChat: () => void;
  closeChat: () => void;
  appendMessages: (messages: ChatMessage[], limit: number) => void;
  resetChat: () => void;
};

export const useChatStore = create<ChatState>((set, get) => ({
  open: false,
  messages: [],
  openChat: () => set({ open: true }),
  closeChat: () => set({ open: false }),
  appendMessages: (messages, limit) =>
    set({ messages: [...get().messages, ...messages].slice(-limit) }),
  resetChat: () => set({ messages: [] }),
}));
