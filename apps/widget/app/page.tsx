"use client"

import { WidgetView } from "@/modules/widget/ui/views/widget-view";
import { use } from "react";

interface Props {
  searchParams: Promise<{
    organizationId: string
  }>
}



const Page = ({ searchParams }: Props) => {

  const { organizationId } = use(searchParams); // use permite leer el valor de una Promise o un Context. Pausa el renderizado hasta que la promise se resuelva

  return (
    <div>
      <WidgetView  organizationId={organizationId} />
    </div>
  )
}

export default Page
