import * as React from "react";
import { ChevronDown, Layout, Mic, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Button } from "./button";

export interface AppInfo {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: React.ReactNode;
  port: number;
}

const apps: AppInfo[] = [
  {
    id: "studio",
    name: "Main Studio",
    description: "Canvas-based flow designer",
    url: "http://localhost:5177",
    icon: <Layout className="size-4" />,
    port: 5177,
  },
  {
    id: "voice",
    name: "Voice Studio",
    description: "Real-time voice interactions",
    url: "http://localhost:5179",
    icon: <Mic className="size-4" />,
    port: 5179,
  },
  {
    id: "configurator",
    name: "Agent Configurator",
    description: "Quick configure & test",
    url: "http://localhost:5178",
    icon: <Settings className="size-4" />,
    port: 5178,
  },
];

export interface AppSwitcherProps {
  currentAppId: string;
  /**
   * Optional custom navigation handler. If not provided, uses window.location.href
   */
  onAppSwitch?: (appId: string, url: string) => void;
}

export function AppSwitcher({ currentAppId, onAppSwitch }: AppSwitcherProps) {
  const currentApp = apps.find((app) => app.id === currentAppId);

  const handleSwitch = (app: AppInfo) => {
    if (app.id === currentAppId) return;

    if (onAppSwitch) {
      onAppSwitch(app.id, app.url);
    } else {
      window.location.href = app.url;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          {currentApp?.icon}
          <span className="hidden sm:inline">{currentApp?.name}</span>
          <ChevronDown className="size-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px]">
        <DropdownMenuLabel>Switch Application</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {apps.map((app) => (
          <DropdownMenuItem
            key={app.id}
            onClick={() => handleSwitch(app)}
            disabled={app.id === currentAppId}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-3 w-full">
              {app.icon}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{app.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {app.description}
                </div>
              </div>
              {app.id === currentAppId && (
                <div className="size-2 rounded-full bg-primary" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
