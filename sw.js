// AUTO SEND PUSH - Now fetches members automatically from Cloudflare
// npm install web-push
// node send-push-auto.js "New Programme Dropped" "June Programme is live in your app"

const webPush = require('web-push');

// YOUR VAPID KEYS - KEEP PRIVATE!
const VAPID_PUBLIC = 'BMcqs2isrcd8Qsa1qCIYhA8Ls5EBeWFHc7ysXrOTeLfW8ax6ht8FsgNAJNk13T-1lFnaC1cwyL1essT2pZrVjHo';
const VAPID_PRIVATE = 'iYyv6RGZHXofRvDYxzcyHvVpDL1pA-pB1bD_CSlTk5E';

// YOUR CLOUDFLARE WORKER URL + SECRET
const WORKER_URL = "https://white-resonance-a4ab.thisistrinary.workers.dev"; // <-- REPLACE WITH YOUR REAL WORKER URL
const ADMIN_SECRET = "crescita2025"; // <-- REPLACE WITH SAME SECRET YOU SET IN WORKER ENV

webPush.setVapidDetails('mailto:hello@crescita.co.za', VAPID_PUBLIC, VAPID_PRIVATE);

async function getSubscriptions() {
  const res = await fetch(`${WORKER_URL}/api/subscriptions?secret=${ADMIN_SECRET}`);
  if (!res.ok) throw new Error('Failed to fetch subs: ' + res.status);
  const data = await res.json();
  // data is array of {member, subscription, ...} - extract subscription
  return data.map(d => d.subscription);
}

async function sendToAll(title, body, url) {
  const subscriptions = await getSubscriptions();
  console.log(`Found ${subscriptions.length} members with push enabled`);
  
  if (subscriptions.length === 0) {
    console.log('No members yet - tell someone to tap ENABLE NOTIFICATIONS');
    return;
  }

  const payload = JSON.stringify({ title, body, url: url || '/app/' });

  let success = 0, failed = 0;
  await Promise.all(subscriptions.map(async sub => {
    try {
      await webPush.sendNotification(sub, payload);
      success++;
    } catch (err) {
      failed++;
      console.log('Failed for one:', err.statusCode, err.body?.slice(0,100));
      // If 410 Gone, subscription expired - you should delete it from KV
    }
  }));

  console.log(`Done! Sent: ${success}, Failed: ${failed}`);
}

const title = process.argv[2] || 'CRESCITA COLLECTIVE';
const body = process.argv[3] || 'New update in your app — open now';
const url = process.argv[4] || '/app/';

sendToAll(title, body, url).catch(console.error);
