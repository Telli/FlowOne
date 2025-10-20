import * as React from "react";
import { User } from "lucide-react";
import { Avatar, AvatarFallback } from "./avatar";
import { AppSwitcher } from "./app-switcher";

export interface AppShellProps {
  /**
   * Current app identifier ('studio', 'voice', or 'configurator')
   */
  appId: "studio" | "voice" | "configurator";
  /**
   * Main content to render
   */
  children: React.ReactNode;
  /**
   * Optional additional actions to show in header
   */
  headerActions?: React.ReactNode;
  /**
   * Optional custom navigation handler
   */
  onAppSwitch?: (appId: string, url: string) => void;
}

export function AppShell({
  appId,
  children,
  headerActions,
  onAppSwitch,
}: AppShellProps) {
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-border bg-background px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎙️</span>
            <span className="font-semibold text-lg">FlowOne</span>
          </div>

          {/* App Switcher */}
          <AppSwitcher currentAppId={appId} onAppSwitch={onAppSwitch} />
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          {headerActions}

          {/* User Avatar */}
          <Avatar className="size-9">
            <AvatarFallback className="bg-primary text-primary-foreground">
              <User className="size-4" />
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
