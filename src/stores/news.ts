/**
 * News Store — cross-island reactive state for news articles
 *
 * Published by NewsTab after fetching. Consumed by CoMentionsTab.
 * Also publishes to the legacy setPageData('news') for unconverted consumers.
 */

import { atom } from 'nanostores';
import type { NewsArticle } from '../lib/types';

export const $newsArticles = atom<NewsArticle[]>([]);
