import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { buildAdapter } from "./configure-app";

// Asks a built adapter's raw Fastify instance what it thinks the client IP is for a request
// carrying a two-hop X-Forwarded-For header. Fastify's own `initialConfig` doesn't echo
// `trustProxy` back (verified: it's `undefined` there whatever the option was), so the only
// reliable way to observe the resolved setting is to ask Fastify to resolve an actual request.
async function resolvedIp(adapter: ReturnType<typeof buildAdapter>): Promise<string> {
  const instance = adapter.getInstance();
  instance.get("/__ip", async (req) => ({ ip: req.ip }));
  await instance.ready();
  const res = await instance.inject({
    method: "GET",
    url: "/__ip",
    headers: { "x-forwarded-for": "10.0.0.1, 203.0.113.7" },
  });
  await instance.close();
  return (JSON.parse(res.payload) as { ip: string }).ip;
}

describe("buildAdapter()", () => {
  const ORIGINAL_TRUST_PROXY = process.env.TRUST_PROXY;

  afterEach(() => {
    if (ORIGINAL_TRUST_PROXY === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = ORIGINAL_TRUST_PROXY;
  });

  it("trusts nothing by default: resolves to the socket address, ignoring X-Forwarded-For", async () => {
    delete process.env.TRUST_PROXY;
    const ip = await resolvedIp(buildAdapter());
    expect(ip).not.toBe("203.0.113.7");
  });

  it("TRUST_PROXY=1 in process.env resolves to the rightmost (trusted) hop", async () => {
    process.env.TRUST_PROXY = "1";
    const ip = await resolvedIp(buildAdapter());
    expect(ip).toBe("203.0.113.7");
  });

  // Fix round 2, finding 1 / fix round 3: buildAdapter() is called as an ARGUMENT to
  // NestFactory.create() in main.ts — before ConfigModule.forRoot() ever loads apps/api/.env —
  // so TRUST_PROXY set only in that file was silently ignored, and buildAdapter() fell back to
  // "trust nothing". buildAdapter() now calls loadBootEnv() as its own first statement
  // (configure-app.ts), specifically so this doesn't depend on a separate call surviving in
  // main.ts.
  //
  // This test does NOT call loadBootEnv()/dotenv.config() itself — round 2's version did, and
  // that made it prove the MECHANISM (dotenv can load a file) while proving nothing about the
  // WIRING (buildAdapter() actually calls it). Confirmed directly: deleting the loadBootEnv()
  // call from main.ts left the whole suite, including that version of this test, at 81/81
  // green.
  //
  // Instead: TRUST_PROXY starts genuinely absent from process.env, a temp directory holds a
  // file literally named ".env", the test chdirs INTO that directory, and calls buildAdapter()
  // ALONE — nothing else. loadBootEnv() (configure-app.ts) takes no path argument here and
  // resolves dotenv's normal default (a ".env" file in process.cwd()), which is exactly what
  // main.ts's own call does in production; chdir is what points that default resolution at an
  // isolated file instead of the real apps/api/.env, without changing what buildAdapter() or
  // loadBootEnv() are called with. Removing the loadBootEnv() call from inside buildAdapter()
  // reproduces the bug here: TRUST_PROXY stays absent and this resolves to the socket address.
  it("resolves TRUST_PROXY from a .env file in the working directory via buildAdapter()'s own internal load, with no dotenv call in this test", async () => {
    delete process.env.TRUST_PROXY;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-trust-proxy-"));
    fs.writeFileSync(path.join(dir, ".env"), "TRUST_PROXY=1\n");
    const originalCwd = process.cwd();
    try {
      process.chdir(dir);
      expect(process.env.TRUST_PROXY).toBeUndefined();

      const ip = await resolvedIp(buildAdapter());

      expect(ip).toBe("203.0.113.7");
    } finally {
      process.chdir(originalCwd);
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
