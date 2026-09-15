"use client"

import * as React from "react"
import Link from "next/link"

import { NAV } from "@/lib/nav"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

/** Ghostly247 app icon — full colour, works on light and dark surfaces. */
export function BrandMark({ className = "size-5" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.png" alt="Ghostly247" className={`${className} object-contain`} />
  )
}

export function AppSidebar({
  email,
  onLogout,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  email: string
  onLogout: () => void
}) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/">
                <BrandMark className="size-7!" />
                <span className="text-base font-semibold">Ghostly247</span>
                <span className="ml-auto text-xs text-muted-foreground">Admin</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={NAV} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser email={email} onLogout={onLogout} />
      </SidebarFooter>
    </Sidebar>
  )
}
