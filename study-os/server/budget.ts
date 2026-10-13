import { mkdir, readFile, writeFile, rename, appendFile } from 'node:fs/promises';
import { z } from 'zod';
const ledgerSchema = z.object({
  day: z.string(),
  calls: z.number().int().min(0),
  reservedUSD: z.number().min(0),
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
});
export class Budget {
  private chain: Promise<unknown> = Promise.resolve();
  constructor(
    private dir: string,
    private maxCalls: number,
    private maxUSD: number,
  ) {}
  private serial<T>(f: () => Promise<T>): Promise<T> {
    const p = this.chain.then(f);
    this.chain = p.catch(() => {});
    return p;
  }
  private async read() {
    await mkdir(this.dir, { recursive: true });
    const day = new Date().toISOString().slice(0, 10);
    let value;
    try {
      value = ledgerSchema.parse(JSON.parse(await readFile(this.dir + '/budget.json', 'utf8')));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT')
        throw new Error('Cannot verify cost ledger');
    }
    return value?.day === day
      ? value
      : { day, calls: 0, reservedUSD: 0, inputTokens: 0, outputTokens: 0 };
  }
  private async write(value: z.infer<typeof ledgerSchema>) {
    await writeFile(this.dir + '/budget.tmp', JSON.stringify(value));
    await rename(this.dir + '/budget.tmp', this.dir + '/budget.json');
  }
  reserve(upperCost: number) {
    return this.serial(async () => {
      const v = await this.read();
      if (
        !Number.isFinite(upperCost) ||
        upperCost <= 0 ||
        v.calls >= this.maxCalls ||
        v.reservedUSD + upperCost > this.maxUSD
      )
        throw new Error('Daily AI budget reached');
      v.calls++;
      v.reservedUSD += upperCost;
      await this.write(v);
      return v;
    });
  }
  record(route: string, inputTokens: number, outputTokens: number) {
    return this.serial(async () => {
      const v = await this.read();
      v.inputTokens += inputTokens;
      v.outputTokens += outputTokens;
      await this.write(v);
      await appendFile(
        this.dir + '/usage.jsonl',
        JSON.stringify({ at: new Date().toISOString(), route, inputTokens, outputTokens }) + '\n',
      );
    });
  }
  // Reservations are kept on failure: conservative limits survive process restarts.
}
