"use client";

import { useCI } from "@/hooks/useCI";
import { RelationshipList } from "./RelationshipList";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  operationalStatusLabel,
  operationalStatusColor,
  formatTimestamp,
} from "@/lib/utils";
import { getNodeColor } from "@/lib/colorMap";

export function CIInspector() {
  const { ci, ciError, ciLoading, syncPaused } = useCI();

  if (syncPaused) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Full reload is refreshing the graph data. Inspector details will resume when the sync finishes.
      </div>
    );
  }

  if (ciLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (ciError) {
    return (
      <div className="p-4 text-sm text-destructive">{ciError}</div>
    );
  }

  if (!ci) return null;

  const color = getNodeColor(ci.class_label);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <h3 className="text-sm font-semibold">{ci.name}</h3>
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge variant="outline" className="text-[10px]">
              {ci.class_label}
            </Badge>
            <Badge
              variant="outline"
              className={`text-[10px] ${operationalStatusColor(ci.operational_status)}`}
            >
              {operationalStatusLabel(ci.operational_status)}
            </Badge>
            {ci.environment && (
              <Badge variant="secondary" className="text-[10px]">
                {ci.environment}
              </Badge>
            )}
          </div>
        </div>

        {ci.short_description && (
          <p className="text-xs text-muted-foreground">{ci.short_description}</p>
        )}

        <Separator />

        {/* Properties */}
        <div className="space-y-2 text-xs">
          <DetailRow label="sys_id" value={ci.sys_id} mono />
          {ci.ip_address && <DetailRow label="IP" value={ci.ip_address} />}
          {ci.fqdn && <DetailRow label="FQDN" value={ci.fqdn} />}
          {ci.os && <DetailRow label="OS" value={`${ci.os} ${ci.os_version ?? ""}`.trim()} />}
          {ci.cpu_count != null && <DetailRow label="CPUs" value={String(ci.cpu_count)} />}
          {ci.ram_mb != null && <DetailRow label="RAM" value={`${ci.ram_mb} MB`} />}
          {ci.disk_space_gb != null && <DetailRow label="Disk" value={`${ci.disk_space_gb} GB`} />}
          {ci.location && <DetailRow label="Location" value={formatDetailValue(ci.location)} />}
          {ci.department && <DetailRow label="Dept" value={ci.department} />}
          {ci.assigned_to && <DetailRow label="Assigned" value={ci.assigned_to} />}
          {ci.support_group && <DetailRow label="Support" value={ci.support_group} />}
          {ci.sys_created_on && (
            <DetailRow label="Created" value={formatTimestamp(ci.sys_created_on)} />
          )}
          {ci.sys_updated_on && (
            <DetailRow label="Updated" value={formatTimestamp(ci.sys_updated_on)} />
          )}
          <DetailRow label="Degree" value={String(ci.degree)} />
          <DetailRow label="Cluster" value={String(ci.cluster_id)} />
        </div>

        {/* Relationships */}
        {(ci.relationships_incoming.length > 0 || ci.relationships_outgoing.length > 0) && (
          <>
            <Separator />
            <RelationshipList
              incoming={ci.relationships_incoming}
              outgoing={ci.relationships_outgoing}
            />
          </>
        )}
      </div>
    </ScrollArea>
  );
}

function formatDetailValue(value: string): string {
  const directValueMatch = value.match(/['\"]value['\"]:\s*['\"]([^'\"]+)['\"]/i);
  if (directValueMatch?.[1]) {
    return directValueMatch[1];
  }

  return value;
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-right ${mono ? "font-mono text-[10px]" : ""}`}>
        {value}
      </span>
    </div>
  );
}
