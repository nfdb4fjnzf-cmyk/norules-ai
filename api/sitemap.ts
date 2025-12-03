import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
    const baseUrl = 'https://norules.ai'; // Should be env var in production
    const pages = [
        '',
        '/login',
        '/register',
        '/pricing',
        '/features',
        '/about',
        '/contact'
    ];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${pages.map(page => `
    <url>
        <loc>${baseUrl}${page}</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>daily</changefreq>
        <priority>${page === '' ? '1.0' : '0.8'}</priority>
    </url>
    `).join('')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(sitemap);
}
