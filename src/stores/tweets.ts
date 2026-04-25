/**
 * Tweets Store — cross-island reactive state for the X (Twitter) feed.
 *
 * Published by XTab after fetching journalist tweets for the current entity.
 * Consumed by CoMentionsTab so co-mention scanning covers both news and X posts.
 */

import { atom } from 'nanostores';

export interface Tweet {
  id: string;
  text: string;
  author: string;
  author_username: string;
  created_at: string;
  metrics?: {
    like_count?: number;
    retweet_count?: number;
    reply_count?: number;
  };
}

export const $tweets = atom<Tweet[]>([]);
