import type { CruxApi, CruxEntity, CruxSerializer, Request } from "./types";

export type OnEffect = (
  id: number,
  effect: CruxEntity,
) => Promise<
  | undefined
  | {
      id: number;
      response: CruxEntity;
    }
>;

export class EventSender<VM, R extends Request> {
  private logs = new Map<string, string>();
  constructor(
    private api: CruxApi,
    private onEffect: OnEffect,
    private serializer: CruxSerializer<VM, R>,
  ) {}

  /**
   * Sends a single event to the worker (and corelogic) and handle the potential effects sent back by corelogic.
   * Resolves once all the effect responses that need to be sent back to the core have been sent
   */
  async sendEvent(event: Uint8Array) {
    return this.exhaust(() => this.api.process_event(event));
  }

  async sendResponse(id: number, response: Uint8Array) {
    return this.exhaust(() => this.api.handle_response(id, response));
  }

  dumpLogs() {
    const logs: [string, string][] = [];
    this.logs.forEach((status, effectId) => {
      logs.push([effectId, status]);
    });
    return logs;
  }

  private async handleEffect(id: number, effect: CruxEntity) {
    const effectLogId = `${effect.constructor.name} ${id}`;
    this.logEffect(effectLogId, "pending");
    const response = await this.onEffect(id, effect);
    this.logEffect(effectLogId, "done");
    if (response) {
      const payload = this.serializer.serialize(response.response);
      await this.sendResponse(id, payload);
    }
  }

  private async exhaust(
    sendPayload: () =>
      | Promise<Uint8Array<ArrayBufferLike>>
      | Uint8Array<ArrayBufferLike>,
  ) {
    const response = sendPayload();

    const effects = this.serializer.deserializeEffects(await response);
    await Promise.all(
      effects.map(({ id, effect }) => this.handleEffect(id, effect)),
    );
  }

  private logEffect(effectId: string, status: "pending" | "done") {
    this.logs.set(effectId, status);
  }
}
