const API_URL = 'https://api.dedaub.com/api/on_demand';
const POLL_INTERVAL_MS = 5000;
const API_KEY = process.env.DEDAUB_API_KEY;

if (!API_KEY) {
    console.error("Missing DEDAUB_API_KEY in .env");
    process.exit(1);
}

async function submitBytecode(bytecode) {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(bytecode)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Submission failed: ${errorText}`);
    }

    return await response.text(); // returns md5 hash
}

async function pollStatus(md5) {
    const statusUrl = `${API_URL}/${md5}/status`;

    while (true) {
        const response = await fetch(statusUrl, {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Status polling failed: ${errorText}`);
        }

        const status = await response.text();
        console.log(`Status: ${status}`);

        if (status === 'COMPLETED') break;
        if (status === 'UNKNOWN') throw new Error("Unknown MD5, job may not exist.");

        await new Promise(res => setTimeout(res, POLL_INTERVAL_MS));
    }
}

async function fetchDecompiledCode(md5) {
    const decompilationUrl = `${API_URL}/decompilation/${md5}`;

    const response = await fetch(decompilationUrl, {
        headers: { 'Authorization': `Bearer ${API_KEY}` }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fetch decompiled code failed: ${errorText}`);
    }

    const data = await response.json();
    return data.source;
}

async function fetchDecompiledSource(bytecode) {
  const body = bytecode;

  const headers = {
    'x-api-key': process.env.DEDAUB_API_KEY
  };

  const postRes = await fetch('https://api.dedaub.com/api/on_demand', {
    method: 'POST',
    headers,
    body
  });

  if (!postRes.ok) throw new Error(`POST failed: ${await postRes.text()}`);

  const md5 = await postRes.text();
  const statusUrl = `https://api.dedaub.com/api/on_demand/${md5}/status`;
  const resultUrl = `https://api.dedaub.com/api/on_demand/decompilation/${md5}`;

  // Poll until COMPLETED
  while (true) {
    const pollRes = await fetch(statusUrl, { headers });
    const status = await pollRes.text();
    if (status === 'COMPLETED') break;
    if (status === 'UNKNOWN') throw new Error('Unknown decompilation ID');
    await new Promise(r => setTimeout(r, 5000));
  }

  const resultRes = await fetch(resultUrl, { headers });
  const resultJson = await resultRes.json();
  return resultJson?.source || 'No decompiled source found.';
}



export {
  submitBytecode,
  pollStatus,
  fetchDecompiledCode,
  fetchDecompiledSource
};