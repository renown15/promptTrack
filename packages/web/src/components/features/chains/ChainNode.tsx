import { memo } from "react";
import { Handle, Position } from "reactflow";
import type { NodeProps } from "reactflow";
import "@/components/features/chains/ChainNode.css";

export type ChainNodeData = {
  label: string;
  promptName: string;
  refType: "link" | "copy";
  promptId: string;
  promptVersionNumber: number;
};

function ChainNodeComponent({ data, selected }: NodeProps<ChainNodeData>) {
  return (
    <div className={`chain-node${selected ? " chain-node--selected" : ""}`}>
      <Handle type="target" position={Position.Top} />
      <div className="chain-node__header">
        <span
          className={`chain-node__badge chain-node__badge--${data.refType}`}
        >
          {data.refType}
        </span>
      </div>
      <div className="chain-node__label">{data.label || data.promptName}</div>
      <div className="chain-node__prompt">{data.promptName}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export const ChainNode = memo(ChainNodeComponent);
