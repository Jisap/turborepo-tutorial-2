"use client"

import { OrganizationList } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";

export const OrgSelectView = () => {
  const { resolvedTheme } = useTheme()

  return (
    <OrganizationList 
      afterCreateOrganizationUrl="/"
      afterSelectOrganizationUrl="/"
      hidePersonal
      skipInvitationScreen
      appearance={{
        baseTheme: resolvedTheme === 'dark' ? dark : undefined
      }}
    />
  )
}