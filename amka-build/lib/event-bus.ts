type EventHandler = (payload: unknown) => void;

class EventBus {
  private handlers = new Map<string, EventHandler[]>();

  on(event: string, handler: EventHandler) {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event)!.push(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: EventHandler) {
    const h = this.handlers.get(event);
    if (h) {
      const filtered = h.filter((fn) => fn !== handler);
      if (filtered.length === 0) {
        this.handlers.delete(event);
      } else {
        this.handlers.set(event, filtered);
      }
    }
  }

  emit(event: string, payload: unknown) {
    const h = this.handlers.get(event);
    if (h) h.forEach((fn) => fn(payload));
  }
}

export const eventBus = new EventBus();
