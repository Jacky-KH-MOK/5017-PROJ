import ForceGraph2D, { ForceGraphMethods } from "react-force-graph-2d";
import { useEffect, useRef } from "react";
import { useElementSize } from "../hooks/useElementSize";

export interface GraphNode {
  id: string;
  label: string;
  type: "actor" | "counterparty";
  risk: number;
}

export interface GraphLink {
  source: string;
  target: string;
  amount: number;
  transferId: number;
}

interface Props {
  nodes: GraphNode[];
  links: GraphLink[];
  highlightCaseId?: number | null;
  highlightNodes?: Set<string> | null;
}

export function NetworkGraph({ nodes, links, highlightCaseId, highlightNodes }: Props) {
  const fgRef = useRef<ForceGraphMethods>();
  const [containerRef, { width, height }] = useElementSize<HTMLDivElement>();

  useEffect(() => {
    fgRef.current?.zoomToFit(400);
  }, [nodes.length, links.length, highlightCaseId, highlightNodes]);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Network Traces</p>
          <h3 className="text-xl font-semibold text-white">Actor ↔ Counterparty Graph</h3>
        </div>
        <span className="text-xs text-slate-500">
          {nodes.length} nodes / {links.length} edges
        </span>
      </div>
      <div ref={containerRef} className="mt-4 h-96">
        <ForceGraph2D
          ref={fgRef}
          graphData={{ nodes, links }}
          width={Math.max(width, 320)}
          height={Math.max(height, 320)}
          nodeAutoColorBy="type"
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const label = node.label ?? node.id;
            const fontSize = 12 / globalScale;
            const dimmed = highlightNodes && !highlightNodes.has(node.id);
            ctx.globalAlpha = dimmed ? 0.25 : 1;
            ctx.fillStyle = node.type === "actor" ? "#38bdf8" : "#f472b6";
            ctx.beginPath();
            ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.font = `${fontSize}px Inter`;
            ctx.fillStyle = dimmed ? "rgba(203,213,245,0.4)" : "#cbd5f5";
            ctx.textAlign = "center";
            ctx.fillText(label, node.x, (node.y || 0) + 12 / globalScale);
            ctx.globalAlpha = 1;
          }}
          linkWidth={(link: any) => Math.max(1, Math.log10((link.amount || 1) + 1))}
          linkColor={(link: any) =>
            highlightCaseId && link.transferId !== highlightCaseId
              ? "rgba(100,116,139,0.2)"
              : "rgba(148, 163, 184, 0.8)"
          }
          linkCanvasObjectMode={() => "after"}
          linkCanvasObject={(link: any, ctx) => {
            if (!link.source || !link.target) return;
            const start = link.source;
            const end = link.target;
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;
            ctx.font = "5px Inter";
            ctx.fillStyle = "#f8fafc";
            ctx.textAlign = "center";
            ctx.fillText(`$${Number(link.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, midX, midY);
          }}
        />
      </div>
    </div>
  );
}

