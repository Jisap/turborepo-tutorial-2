import { ConversationIdView } from "@/modules/dashboard/views/conversation-id-view";
import { Id } from "@workspace/backend/_generated/dataModel";



interface Props {
  params: Promise<{
    conversationId: string;
  }>;
};


const Page = async({ params }: Props) => {

  const { conversationId } = await params;

  return (
    <div>
      <ConversationIdView conversationId={conversationId as Id<"conversations">} />
    </div>
  )
}

export default Page