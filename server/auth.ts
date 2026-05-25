import { env } from "./config";

type Handler = (req: Request) => Response | Promise<Response>;

function timingSafeCompare(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  // Pad shorter to same length so timingSafeEqual doesn't throw
  const len = Math.max(ab.length, bb.length);
  const af = Buffer.concat([ab, Buffer.alloc(len - ab.length)]);
  const bf = Buffer.concat([bb, Buffer.alloc(len - bb.length)]);
  return (
    ab.length === bb.length &&
    // @ts-ignore — crypto is global in Bun
    crypto.timingSafeEqual(af, bf)
  );
}

export function withApiKey(h: Handler): Handler {
  return async (req) => {
    const provided =
      req.headers.get("x-api-key") ??
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!provided || !timingSafeCompare(provided, env.API_SECRET_KEY)) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    return h(req);
  };
}
