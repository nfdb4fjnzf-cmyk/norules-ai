import 'dotenv/config';
import { createApp, toNodeListener, eventHandler, toWebRequest } from 'h3';
import { createServer } from 'node:http';
import analyzeText from './api/analyze/text';
import llmGenerate from './api/llm/generate';
import llmImage from './api/llm/image';
import llmVideo from './api/llm/video';
import secureProxy from './api/secure-proxy';
// import subscriptionManage from './api/subscription/manage';
import subscriptionPlans from './api/subscription/plans';
import apiKeysManage from './api/apikeys/manage';
import historyList from './api/history/list';
import historyDetail from './api/history/detail';
import analyzeMaterial from './api/analyze/material';
import llmVideoStatus from './api/llm/video_status';

const app = createApp();

const handleRequest = (handler: Function) => eventHandler(async (event) => {
    const req = toWebRequest(event);
    try {
        const res = await handler(req);
        return res;
    } catch (e: any) {
        console.error('API Error:', e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
});

app.use('/api/analyze/text', handleRequest(analyzeText));
app.use('/api/analyze/material', handleRequest(analyzeMaterial));
app.use('/api/llm/generate', handleRequest(llmGenerate));
app.use('/api/llm/image', handleRequest(llmImage));
app.use('/api/llm/video', handleRequest(llmVideo));
app.use('/api/llm/video/status', handleRequest(llmVideoStatus));
app.use('/api/secure-proxy', handleRequest(secureProxy));
// app.use('/api/subscription/manage', handleRequest(subscriptionManage));
app.use('/api/subscription/plans', handleRequest(subscriptionPlans));
app.use('/api/apikeys/manage', handleRequest(apiKeysManage));
app.use('/api/history/list', handleRequest(historyList));
app.use('/api/history/detail', handleRequest(historyDetail));

// Payment & Subscription
import paymentCreateTopup from './api/payment/create-topup-invoice';
import paymentWebhook from './api/payment/webhook';
import subscriptionCreate from './api/subscription/create';

app.use('/api/payment/create-topup-invoice', handleRequest(paymentCreateTopup));
app.use('/api/payment/webhook', handleRequest(paymentWebhook));
app.use('/api/subscription/create', handleRequest(subscriptionCreate));

const server = createServer(toNodeListener(app));

const port = 3006;
server.listen(port, () => {
    console.log(`API Server running at http://localhost:${port}`);
});
