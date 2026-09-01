import { siteUrl } from '../lib/site-content';
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
	return [{ url: siteUrl, lastModified: new Date('2026-08-31'), changeFrequency: 'monthly', priority: 1 }];
}
