/**
 * News Store — cross-island reactive state for news articles.
 *
 * Published by NewsTab once the news fetch resolves (always — empty
 * arrays included, so consumers can distinguish "no news yet" (null)
 * from "fetched, no results" ([])). Consumed by CoMentionsTab.
 */

import { atom } from 'nanostores';
import type { NewsArticle } from '../lib/types';

export const $newsArticles = atom<NewsArticle[] | null>(null);
