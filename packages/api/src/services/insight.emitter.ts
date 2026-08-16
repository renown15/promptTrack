import { EventEmitter } from "events";

// Events emitted:
//   file_updated:<collectionId>  → serialised FileSnapshot
//   scan_complete:<collectionId> → { fileCount: number; timestamp: string }
export const insightEmitter = new EventEmitter();
insightEmitter.setMaxListeners(100); // one per open SSE connection per collection
