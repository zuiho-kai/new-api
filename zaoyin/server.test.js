import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

async function listen(server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return server.address().port;
}

async function waitForServer(child) {
  let output = '';
  child.stdout.setEncoding('utf8');
  for await (const chunk of child.stdout) {
    output += chunk;
    if (output.includes('zaoyin running at')) return;
  }
  throw new Error(`zaoyin 启动失败：${output}`);
}

test('图生图以 JSON 同时发送 image 和 images[].image_url', async (t) => {
  let received;
  const upstream = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      received = {
        contentType: req.headers['content-type'],
        body: Buffer.concat(chunks).toString('utf8'),
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"data":[]}');
    });
  });
  const upstreamPort = await listen(upstream);
  t.after(() => upstream.close());

  const portProbe = http.createServer();
  const appPort = await listen(portProbe);
  await new Promise(resolve => portProbe.close(resolve));

  const imageJobDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zaoyin-image-jobs-'));
  t.after(() => fs.rm(imageJobDir, { recursive: true, force: true }));

  const child = spawn(process.execPath, ['server.js'], {
    cwd: here,
    env: {
      ...process.env,
      PORT: String(appPort),
      UPSTREAM: `http://127.0.0.1:${upstreamPort}`,
      IMAGE_JOB_DIR: imageJobDir,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => child.kill());
  await waitForServer(child);

  const source = 'data:image/png;base64,aGVsbG8=';
  const response = await fetch(`http://127.0.0.1:${appPort}/api/image-job`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path: '/v1/images/edits',
      body: {
        model: 'gpt-image-2',
        prompt: '把背景改成蓝色',
        image: [source],
      },
      localIds: [],
    }),
  });

  assert.equal(response.status, 200);
  assert.equal(received.contentType, 'application/json');
  const body = JSON.parse(received.body);
  assert.equal(body.image, source);
  assert.deepEqual(body.images, [{ image_url: source }]);
  assert.equal(body.prompt, '把背景改成蓝色');
});
