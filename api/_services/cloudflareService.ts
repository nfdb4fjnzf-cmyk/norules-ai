import { AppError, ErrorCodes } from '../_utils/errorHandler.js';

const CF_API_URL = 'https://api.cloudflare.com/client/v4';

class CloudflareService {
    private apiToken: string;
    private accountId: string;

    constructor() {
        this.apiToken = process.env.CLOUDFLARE_API_TOKEN || '';
        this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
    }

    private get headers() {
        return {
            'Authorization': `Bearer ${this.apiToken}`,
        };
    }

    async createProject(projectName: string) {
        if (!this.apiToken || !this.accountId) {
            throw new AppError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Cloudflare credentials missing', 500);
        }

        // Check if project exists first
        try {
            const checkRes = await fetch(`${CF_API_URL}/accounts/${this.accountId}/pages/projects/${projectName}`, {
                headers: this.headers
            });
            if (checkRes.ok) {
                return; // Project exists
            }
        } catch (e) {
            // Ignore error, proceed to create
        }

        // Create project
        const res = await fetch(`${CF_API_URL}/accounts/${this.accountId}/pages/projects`, {
            method: 'POST',
            headers: {
                ...this.headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: projectName,
                production_branch: 'main'
            })
        });

        const data = await res.json();
        if (!data.success) {
            // If error is "Project already exists", ignore it
            if (data.errors?.[0]?.code === 8000009) return;
            throw new AppError(ErrorCodes.INTERNAL_SERVER_ERROR, `Failed to create CF project: ${data.errors?.[0]?.message}`, 500);
        }
    }

    async deployPage(projectName: string, htmlContent: string) {
        if (!this.apiToken || !this.accountId) {
            throw new AppError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Cloudflare credentials missing', 500);
        }

        // We need to use FormData to upload files
        // In Node.js environment, we might need a polyfill or specific handling if native FormData isn't fully compatible with file uploads in the way CF expects
        // But let's try standard FormData first.

        const formData = new FormData();

        // Create a Blob/File from the HTML content
        const blob = new Blob([htmlContent], { type: 'text/html' });
        formData.append('files', blob, 'index.html');

        // Cloudflare Pages Direct Upload requires a specific manifest if doing multiple files, 
        // but for a single file, we might need to follow their specific API for direct uploads which is complex.
        // ALTERNATIVE: Use Cloudflare Workers KV to serve the page? No, user wants "Landing Page".

        // Actually, the "Direct Upload" API for Pages is:
        // POST /accounts/:account_id/pages/projects/:project_name/deployments
        // Content-Type: multipart/form-data

        // We need to append the file with a specific path.
        // formData.append("files", file, "/index.html"); <--- Key is "files", filename is path

        // NOTE: In standard FormData, the third argument is filename.
        // Cloudflare expects the key to be the file path if using a manifest, OR just upload files.
        // Let's try the standard approach.

        const res = await fetch(`${CF_API_URL}/accounts/${this.accountId}/pages/projects/${projectName}/deployments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiToken}`,
                // Do NOT set Content-Type here, let fetch set it with boundary
            },
            body: formData
        });

        const data = await res.json();

        if (!data.success) {
            throw new AppError(ErrorCodes.INTERNAL_SERVER_ERROR, `Failed to deploy to CF: ${data.errors?.[0]?.message}`, 500);
        }

        return data.result;
    }
}

export const cloudflareService = new CloudflareService();
