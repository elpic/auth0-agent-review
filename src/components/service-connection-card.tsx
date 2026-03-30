"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, XCircle } from "lucide-react";

interface ServiceConnectionCardProps {
  name: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
  scopes?: string;
  connectedAt?: string;
  connectHref: string;
}

export function ServiceConnectionCard({
  name,
  description,
  icon,
  connected,
  scopes,
  connectedAt,
  connectHref,
}: ServiceConnectionCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              {icon}
            </div>
            <div>
              <CardTitle className="text-base">{name}</CardTitle>
              <CardDescription className="mt-0.5 text-xs">
                {description}
              </CardDescription>
            </div>
          </div>
          {connected ? (
            <Badge variant="success" className="shrink-0">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary" className="shrink-0">
              <XCircle className="mr-1 h-3 w-3" />
              Disconnected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {connected && scopes ? (
          <div className="mb-4 space-y-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Granted scopes
            </p>
            <div className="flex flex-wrap gap-1">
              {scopes.split(",").map((scope) => (
                <Badge key={scope.trim()} variant="outline" className="text-xs">
                  {scope.trim()}
                </Badge>
              ))}
            </div>
            {connectedAt && (
              <p className="pt-1 text-xs text-slate-400 dark:text-slate-500">
                Connected on {connectedAt}
              </p>
            )}
          </div>
        ) : null}
        <Button
          variant={connected ? "outline" : "default"}
          size="sm"
          className="w-full"
          asChild
        >
          <a href={connectHref}>
            {connected ? `Reconnect ${name}` : `Connect ${name}`}
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
