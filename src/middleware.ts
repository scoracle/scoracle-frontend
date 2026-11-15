import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { cacheDocument } from './lib/document-cache';
import responsePolicy from './lib/response-policy';

export const onRequest = defineMiddleware((context, next) => cacheDocument(context.request, env.CF_VERSION_METADATA?.id, (caches as CacheStorage & { default: Cache }).default, task => context.locals.cfContext.waitUntil(task), () => responsePolicy(context.request, async () => {
  const path = context.url.pathname;
  if (['/contact', '/privacy', '/terms'].includes(path)) return context.redirect(`/about#${path.slice(1)}`, 301);
  if (path === '/profile') return context.redirect('/leaderboard', 302);
  return next();
})));
