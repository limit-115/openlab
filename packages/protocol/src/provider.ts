import type { ModelRequest, ModelResponse } from "./schemas.js";

export interface ModelProvider {
  readonly id: string;
  readonly model: string;
  generate(request: ModelRequest, signal?: AbortSignal): Promise<ModelResponse>;
}

