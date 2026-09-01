import { siteUrl } from '../lib/site-content';
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
	return { rules: { userAgent: '*', allow: '/' }, sitemap: `${siteUrl}/sitemap.xml` };
}
