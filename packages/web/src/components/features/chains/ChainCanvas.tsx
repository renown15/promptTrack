import { useState, useCallback, useEffect } from "react";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
} from "reactflow";
import type { Connection, Edge, Node } from "reactflow";
import "reactflow/dist/style.css";
import { ChainNode } from "@/components/features/chains/ChainNode";
import type { ChainNodeData } from "@/components/features/chains/ChainNode";
import { ChainEdge } from "@/components/features/chains/ChainEdge";
import { AddNodeModal } from "@/components/features/chains/AddNodeModal";
import { wouldCreateCycle } from "@/lib/dagValidator";
import { usePrompts } from "@/hooks/usePrompts";
import { useCreateChainVersion } from "@/hooks/useChain";
import type { ChainVersionDTO } from "@prompttrack/shared";
import "@/components/features/chains/ChainCanvas.css";

const NODE_TYPES = { chainNode: ChainNode };
const EDGE_TYPES = { chainEdge: ChainEdge };

function versionToNodes(version: ChainVersionDTO): Node<ChainNodeData>[] {
  return version.nodes.map((n) => ({
    id: n.nodeId,
    type: "chainNode",
    position: { x: n.positionX, y: n.positionY },
    data: {
      label: n.label ?? "",
      promptName: "",
      refType: n.refType,
      promptId: n.promptId,
      promptVersionNumber: n.promptVersionNumber,
    },
  }));
}

function versionToEdges(version: ChainVersionDTO): Edge[] {
  return version.edges.map((e) => ({
    id: e.edgeId,
    source: e.sourceNodeId,
    target: e.targetNodeId,
    type: "chainEdge",
    ...(e.label !== null && e.label !== undefined ? { label: e.label } : {}),
  }));
}

type Props = {
  chainId: string;
  initialVersion: ChainVersionDTO | null;
  onSaved?: () => void;
};

export function ChainCanvas({ chainId, initialVersion, onSaved }: Props) {
  const { data: prompts } = usePrompts();
  const createVersion = useCreateChainVersion(chainId);
  const [showAddModal, setShowAddModal] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<ChainNodeData>(
    initialVersion ? versionToNodes(initialVersion) : []
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialVersion ? versionToEdges(initialVersion) : []
  );

  useEffect(() => {
    if (!prompts) return;
    setNodes((prev) =>
      prev.map((n) => {
        const prompt = prompts.find((p) => p.id === n.data.promptId);
        if (!prompt || n.data.promptName === prompt.name) return n;
        return { ...n, data: { ...n.data, promptName: prompt.name } };
      })
    );
  }, [prompts, setNodes]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (wouldCreateCycle(edges, connection.source, connection.target)) return;
      setEdges((prev) => addEdge({ ...connection, type: "chainEdge" }, prev));
    },
    [edges, setEdges]
  );

  const handleAddNode = useCallback(
    (promptId: string, refType: "link" | "copy") => {
      const prompt = prompts?.find((p) => p.id === promptId);
      if (!prompt) return;
      const nodeId = `node-${crypto.randomUUID()}`;
      const newNode: Node<ChainNodeData> = {
        id: nodeId,
        type: "chainNode",
        position: { x: 100 + nodes.length * 20, y: 100 + nodes.length * 20 },
        data: {
          label: "",
          promptName: prompt.name,
          refType,
          promptId,
          promptVersionNumber: prompt.currentVersion,
        },
      };
      setNodes((prev) => [...prev, newNode]);
    },
    [prompts, nodes.length, setNodes]
  );

  const handleSave = () => {
    if (nodes.length === 0) return;
    createVersion.mutate(
      {
        nodes: nodes.map((n) => ({
          nodeId: n.id,
          promptId: n.data.promptId,
          promptVersionNumber: n.data.promptVersionNumber,
          refType: n.data.refType,
          ...(n.data.label ? { label: n.data.label } : {}),
          positionX: n.position.x,
          positionY: n.position.y,
        })),
        edges: edges.map((e) => ({
          edgeId: e.id,
          sourceNodeId: e.source,
          targetNodeId: e.target,
          ...(typeof e.label === "string" ? { label: e.label } : {}),
        })),
      },
      { ...(onSaved !== undefined && { onSuccess: onSaved }) }
    );
  };

  return (
    <div className="chain-canvas">
      <div className="chain-canvas__toolbar">
        <button
          className="chain-canvas__btn"
          onClick={() => setShowAddModal(true)}
        >
          + Add Node
        </button>
        <button
          className="chain-canvas__btn chain-canvas__btn--save"
          onClick={handleSave}
          disabled={nodes.length === 0 || createVersion.isPending}
        >
          {createVersion.isPending ? "Saving…" : "Save version"}
        </button>
      </div>
      <div className="chain-canvas__flow">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
      {showAddModal && (
        <AddNodeModal
          onAdd={handleAddNode}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
