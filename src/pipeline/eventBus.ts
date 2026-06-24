// src/pipeline/eventBus.ts
// Feature: helppilot

import { EventEmitter } from 'events';
import type { PipelineEventMap } from '../types/events.js';

export class PipelineEventBus extends EventEmitter {
  emit<K extends keyof PipelineEventMap>(event: K, payload: PipelineEventMap[K]): boolean {
    return super.emit(event as string, payload);
  }

  on<K extends keyof PipelineEventMap>(
    event: K,
    listener: (payload: PipelineEventMap[K]) => void,
  ): this {
    return super.on(event as string, listener as (...args: unknown[]) => void);
  }

  once<K extends keyof PipelineEventMap>(
    event: K,
    listener: (payload: PipelineEventMap[K]) => void,
  ): this {
    return super.once(event as string, listener as (...args: unknown[]) => void);
  }

  off<K extends keyof PipelineEventMap>(
    event: K,
    listener: (payload: PipelineEventMap[K]) => void,
  ): this {
    return super.off(event as string, listener as (...args: unknown[]) => void);
  }
}

export const bus = new PipelineEventBus();
bus.setMaxListeners(50);
