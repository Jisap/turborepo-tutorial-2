


interface Props {
  params: Promise<{
    conversationId: string;
  }>;
};


const Page = async({ params }: Props) => {

  const { conversationId } = await params;

  return (
    <div>
      <h1>Conversation {conversationId}</h1>
    </div>
  )
}

export default Page