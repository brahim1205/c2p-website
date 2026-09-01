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
    <section className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-slate-50">
      <ChatConversationHeader conversation={props.conversation} onCall={props.onCall} session={session} onBack={props.onBack} />

      <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6">
        <ChatConversationPanelDrawer conversation={props.conversation} session={session} />
        <ChatMessageList currentUserId={props.currentUserId} session={session} />
      </div>

      <ChatComposer session={session} />
    </section>
  );
}
