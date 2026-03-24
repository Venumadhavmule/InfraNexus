"use client";

import type { RelationshipSummary } from "@/types";
import { useNeighborhood } from "@/hooks/useNeighborhood";
import { Badge } from "@/components/ui/badge";
import { isValidSysId } from "@/lib/utils";

interface RelationshipListProps {
  incoming: RelationshipSummary[];
  outgoing: RelationshipSummary[];
}

export function RelationshipList({ incoming, outgoing }: RelationshipListProps) {
  const { loadNeighborhood } = useNeighborhood();

  const handleClick = (ciId: string) => {
    if (isValidSysId(ciId)) {
      loadNeighborhood(ciId);
    }
  };

  return (
    <div className="space-y-3">
      {outgoing.length > 0 && (
        <div>
          <h4 className="mb-1.5 text-xs font-semibold text-muted-foreground">
            Outgoing ({outgoing.length})
          </h4>
          <div className="space-y-1">
            {outgoing.map((rel, i) => (
              <RelRow
                key={`out-${i}`}
                rel={rel}
                direction="→"
                onClick={() => handleClick(rel.ci_id)}
              />
            ))}
          </div>
        </div>
      )}
      {incoming.length > 0 && (
        <div>
          <h4 className="mb-1.5 text-xs font-semibold text-muted-foreground">
            Incoming ({incoming.length})
          </h4>
          <div className="space-y-1">
            {incoming.map((rel, i) => (
              <RelRow
                key={`in-${i}`}
                rel={rel}
                direction="←"
                onClick={() => handleClick(rel.ci_id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RelRow({
  rel,
  direction,
  onClick,
}: {
  rel: RelationshipSummary;
  direction: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs hover:bg-accent"
    >
      <span className="text-muted-foreground">{direction}</span>
      <Badge variant="outline" className="text-[9px] shrink-0">
        {rel.rel_type}
      </Badge>
      <span className="truncate">{rel.ci_name}</span>
      <span className="ml-auto text-[10px] text-muted-foreground/60">
        {rel.ci_class}
      </span>
    </button>
  );
}
