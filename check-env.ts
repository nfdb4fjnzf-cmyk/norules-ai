import 'dotenv/config';

console.log('Checking Environment Variables...');
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'Exists' : 'Missing');
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'Exists' : 'Missing');
console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'Exists' : 'Missing');
if (process.env.FIREBASE_PRIVATE_KEY) {
    console.log('FIREBASE_PRIVATE_KEY Length:', process.env.FIREBASE_PRIVATE_KEY.length);
    console.log('FIREBASE_PRIVATE_KEY Starts with:', process.env.FIREBASE_PRIVATE_KEY.substring(0, 10));
}
