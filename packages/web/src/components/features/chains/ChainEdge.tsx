import { BaseEdge, getStraightPath } from "reactflow";
import type { EdgeProps } from "reactflow";

export function ChainEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
}: EdgeProps) {
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });

  return <BaseEdge id={id} path={edgePath} />;
}
