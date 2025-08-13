"use client"

import { dark } from "@clerk/themes"
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs"
import {
  CreditCardIcon,
  InboxIcon,
  LayoutDashboardIcon,
  LibraryBigIcon,
  Mic,
  PaletteIcon
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarFooter,
  SidebarGroup,
  SidebarContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarGroupContent,
} from "@workspace/ui/components/sidebar";
import { cn } from "@workspace/ui/lib/utils";


const customerSupportItems = [
  {
    title: "Conversations",
    url: "/conversations",
    icon: InboxIcon
  },
  {
    title: "Knowledge Base",
    url: "/files",
    icon: LibraryBigIcon
  }
]

const configurationItems = [
  {
    title: "Widget Customization",
    url: "/customization",
    icon: PaletteIcon
  },
  {
    title: "Integrations",
    url: "/integrations",
    icon: LayoutDashboardIcon
  },
  {
    title: "Voice Assistant",
    url: "/plugins/vapi",
    icon: Mic
  } 
];

const accountItems = [
  {
    title: "Plans & Billing",
    url: "/billing",
    icon: CreditCardIcon
  },
]

export const DashboardSidebar = () => {

  const pathname = usePathname();
  const { resolvedTheme } = useTheme();

  const isActive = (url: string) => {
   
    if(url === "/"){
      return pathname === "/"
    }
    return pathname.startsWith(url)
  }

  return (
    <Sidebar className="group" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <OrganizationSwitcher 
                hidePersonal 
                skipInvitationScreen
                appearance={{
                  baseTheme: resolvedTheme === 'dark' ? dark : undefined
                }}/>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Customer Support */}
        <SidebarGroup>
          <SidebarGroupLabel>
            Customer Support
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {customerSupportItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}  
                  >
                    <Link href={item.url}>
                      <item.icon className="size-4"/>
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Configuration */}
        <SidebarGroup>
          <SidebarGroupLabel>
            Configuration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {configurationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Account */}
        <SidebarGroup>
          <SidebarGroupLabel>
            Account
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
