declare module "*dist/server/server.js" {
  export function handleRequest(request: Request, options?: { event?: { locals: { cloudflare: { env: Env; ctx: ExecutionContext } } } }): Promise<Response>;
}
