import {
  ChatComposer,
  ChatConversationHeader,
  ChatConversationPanelDrawer,
} from './ChatConversationSections';
import { ChatMessageList } from './ChatMessageList';
import { useChatConversationSession, type ChatConversationPanelProps } from './useChatConversationSession';

export default function ChatConversationPanel(props: ChatConversationPanelProps) {
  const session = useChatConversationSession(props);

  return (
    <div className="min-h-[28rem] min-w-0 flex-1 rounded-xl border border-gray-200 bg-white shadow-sm">
      <ChatConversationHeader conversation={props.conversation} onCall={props.onCall} session={session} />

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
        <ChatConversationPanelDrawer conversation={props.conversation} session={session} />
        <ChatMessageList currentUserId={props.currentUserId} session={session} />
      </div>

      <ChatComposer session={session} />
    </div>
  );
}
