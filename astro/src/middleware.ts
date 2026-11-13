import { defineMiddleware } from 'astro:middleware';
import responsePolicy from '../../src/middleware';

export const onRequest = defineMiddleware((context, next) => responsePolicy(context.request, async () => {
  const path = context.url.pathname;
  if (['/contact', '/privacy', '/terms'].includes(path)) return context.redirect(`/about#${path.slice(1)}`, 301);
  if (path === '/profile') return context.redirect('/leaderboard', 302);
  return next();
}));
