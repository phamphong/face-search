import { createClient } from "@phamphong94/query-client";
import { faceSearchApiDef } from "./face-search.api";

export const client = createClient({
  faceSearch: faceSearchApiDef,
});
