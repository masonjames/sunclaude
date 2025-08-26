"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { TabbedIntegrationPanel } from "./integrations/TabbedIntegrationPanel"

export const IntegrationsSidebar = () => {
  const { isIntegrationsOpen, setIsIntegrationsOpen } = useSidebar()

  return (
    <div className={cn(
      "fixed top-0 right-0 z-10 flex h-screen flex-col border-l bg-background transition-all duration-300",
      isIntegrationsOpen ? "w-[420px]" : "w-[60px]"
    )}>
      <div className="flex h-14 items-center justify-between border-b px-4">
        {isIntegrationsOpen ? (
          <>
            <h2 className="text-lg font-semibold">Integrations</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsIntegrationsOpen(false)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="mx-auto"
            onClick={() => setIsIntegrationsOpen(true)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isIntegrationsOpen && (
        <div className="flex-1">
          <TabbedIntegrationPanel />
        </div>
      )}
    </div>
  )
}