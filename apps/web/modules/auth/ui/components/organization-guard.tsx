"use client"

import { useOrganization } from "@clerk/nextjs"
import { AuthLayout } from "../layouts/auth-layout"
import { OrgSelectView } from "./org-select-view"



export const OrganizationGuard = ({ children }: { children: React.ReactNode }) => {

  const { organization } = useOrganization()

  if(!organization){
    return (
      <div className="flex flex-col items-center justify-center min-h-svh">
        <OrgSelectView />
      </div>
    )
  }

  return(
    <>
      {children}
    </>
  )
}



