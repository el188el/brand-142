/* A complete, explicit snapshot of the tour, not just the scenes already viewed. */
const SCOPE = self.registration.scope;
const PREFIX = `school142-tour-v1:${new URL(SCOPE).pathname}:`;
const META = PREFIX + 'meta';
const STATE_URL = new URL('__offline_state__', SCOPE).href;
const MANIFEST_URL = new URL('offline-manifest.json', SCOPE).href;
let job = null;
let statePromise;

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

async function state() {
  if (!statePromise) statePromise = (async () => {
    const response = await (await caches.open(META)).match(STATE_URL);
    return response ? response.json() : {};
  })();
  return statePromise;
}
async function store(value) {
  await (await caches.open(META)).put(STATE_URL, Response.json(value));
  statePromise = Promise.resolve(value);
}
function assetURL(asset) { return new URL(asset.url, SCOPE).href; }
function validate(manifest) {
  if (manifest.schema !== 1 || !/^[a-f0-9]{16}$/.test(manifest.version) || !manifest.assets?.length) throw Error('integrity');
  const urls = new Set();
  for (const asset of manifest.assets) {
    const url = assetURL(asset);
    if (!url.startsWith(SCOPE) || urls.has(url) || !/^[a-f0-9]{64}$/.test(asset.sha256) || !(asset.size > 0)) throw Error('integrity');
    urls.add(url);
  }
  return manifest;
}
async function status() {
  const saved = await state();
  if (!saved.cacheName) return {downloaded:0, complete:false, saving:!!job};
  const cache = await caches.open(saved.cacheName);
  const response = await cache.match(MANIFEST_URL);
  if (!response) return {downloaded:0, complete:false, saving:!!job};
  const manifest = validate(await response.json());
  const keys = new Set((await cache.keys()).map(request => request.url));
  const present = manifest.assets.filter(asset => keys.has(assetURL(asset)));
  return {...saved, downloaded:present.length, downloadedBytes:present.reduce((n,asset)=>n+asset.size,0),
    complete:saved.complete && present.length === manifest.assets.length, saving:!!job};
}
async function broadcast(type, value, error) {
  const clients = await self.clients.matchAll({type:'window', includeUncontrolled:true});
  clients.filter(client => client.url.startsWith(SCOPE)).forEach(client => client.postMessage({
    source:'school142-tour-offline', type, state:value, error
  }));
}
async function checkedFetch(asset, version, signal) {
  const url = new URL(asset.url, SCOPE);
  url.searchParams.set('offline', version);
  let response;
  for (let attempt=0; attempt<3; attempt++) {
    try {
      response = await fetch(url, {cache:'no-store', signal});
      if (!response.ok) throw Error('network');
      break;
    } catch (error) {
      if (signal.aborted) throw error;
      if (attempt===2) throw Error('network');
      await new Promise(resolve => setTimeout(resolve, 500*(attempt+1)));
    }
  }
  const bytes = await response.clone().arrayBuffer();
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
  if (bytes.byteLength !== asset.size || hash !== asset.sha256) throw Error('integrity');
  return response;
}
async function saveSnapshot(currentJob) {
  let value;
  try {
    const manifestResponse = await fetch(MANIFEST_URL, {cache:'no-store', signal:currentJob.controller.signal});
    if (!manifestResponse.ok) throw Error('network');
    const manifest = validate(await manifestResponse.json());
    const cacheName = PREFIX + manifest.version;
    const cache = await caches.open(cacheName);
    const previous = await state();
    const oldCache = previous.cacheName && previous.cacheName !== cacheName ? await caches.open(previous.cacheName) : null;
    const oldResponse = oldCache && await oldCache.match(MANIFEST_URL);
    const oldManifest = oldResponse ? await oldResponse.json() : null;
    const oldHashes = new Map((oldManifest?.assets || []).map(asset=>[assetURL(asset),asset.sha256]));
    const keys = new Set((await cache.keys()).map(request=>request.url));
    const present = manifest.assets.filter(asset=>keys.has(assetURL(asset)));
    const remaining = manifest.assets.filter(asset=>!keys.has(assetURL(asset)));
    value = {cacheName, version:manifest.version, complete:false, downloaded:present.length,
      downloadedBytes:present.reduce((n,a)=>n+a.size,0), totalFiles:manifest.assets.length, totalBytes:manifest.totalBytes};
    const estimate = await self.navigator.storage?.estimate?.();
    if (estimate?.quota && estimate.quota-estimate.usage < (manifest.totalBytes-value.downloadedBytes)*1.1) throw Error('quota');
    await cache.put(MANIFEST_URL, Response.json(manifest));
    await store(value);
    await broadcast('PROGRESS', {...value,saving:true});
    let cursor=0, lastNotice=0;
    async function download() {
      while (!currentJob.controller.signal.aborted && cursor<remaining.length) {
        const asset=remaining[cursor++], key=assetURL(asset);
        let response;
        if (oldCache && oldHashes.get(key)===asset.sha256) response=await oldCache.match(key);
        if (!response) response=await checkedFetch(asset,manifest.version,currentJob.controller.signal);
        await cache.put(key,response);
        value.downloaded++;
        value.downloadedBytes+=asset.size;
        if (Date.now()-lastNotice>250) {
          lastNotice=Date.now();
          await broadcast('PROGRESS',{...value,saving:true});
        }
        if (value.downloaded%50===0) await store({...value});
      }
    }
    const tasks = Array.from({length:6},()=>download().catch(error=>{
      if (!currentJob.error && !currentJob.cancelled) currentJob.error=error;
      currentJob.controller.abort();
    }));
    await Promise.all(tasks);
    if (currentJob.error) throw currentJob.error;
    value.complete = !currentJob.cancelled && value.downloaded===manifest.assets.length;
    await store(value);
    if (value.complete) {
      // Retain the earlier complete snapshot until its replacement is fully verified.
      for (const name of await caches.keys()) if (name.startsWith(PREFIX) && name!==META && name!==cacheName) await caches.delete(name);
    }
    await broadcast(value.complete?'COMPLETE':'CANCELLED',{...value,saving:false});
  } catch (error) {
    if (value) { value.complete=false; await store(value).catch(()=>{}); }
    const result = value || await status();
    await broadcast(currentJob.cancelled?'CANCELLED':'ERROR',{...result,saving:false},
      error.name==='QuotaExceededError'?'quota':error.message);
  }
}

self.addEventListener('message', event => {
  const reply = data => event.ports[0]?.postMessage(data);
  if (event.data?.type==='STATUS') event.waitUntil(status().then(reply).catch(()=>reply({downloaded:0,complete:false,saving:!!job})));
  if (event.data?.type==='CANCEL') {
    if(job) {job.cancelled=true;job.controller.abort();}
    reply({ok:true});
  }
  if (event.data?.type==='SAVE') {
    if(job) {reply({error:'busy'});return;}
    const currentJob={controller:new AbortController(),cancelled:false,error:null};
    job=currentJob;
    reply({ok:true});
    event.waitUntil(saveSnapshot(currentJob).finally(()=>{if(job===currentJob)job=null;}));
  }
});

async function cached(request) {
  const url=new URL(request.url);
  if (url.pathname===new URL(SCOPE).pathname || url.pathname===new URL('index.html',SCOPE).pathname) url.pathname=new URL('index.html',SCOPE).pathname;
  url.search='';
  const saved=await state();
  const names=(await caches.keys()).filter(name=>name.startsWith(PREFIX)&&name!==META);
  if(saved.cacheName) names.sort((a,b)=>(a===saved.cacheName?-1:b===saved.cacheName?1:0));
  for(const name of names) {
    const response=await (await caches.open(name)).match(url.href);
    if(response)return response;
  }
}
async function network(request) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),4000);
  try {const response=await fetch(request,{signal:controller.signal});if(!response.ok)throw Error('network');return response;}
  finally {clearTimeout(timer);}
}
self.addEventListener('fetch', event => {
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||!url.href.startsWith(SCOPE)||url.pathname.endsWith('/sw.js'))return;
  const isMedia=/\/(tiles|images|fonts|webxr)\//.test(url.pathname);
  event.respondWith((async()=>{
    if(isMedia) {const response=await cached(event.request);if(response)return response;}
    try {return await network(event.request);}
    catch {return await cached(event.request)||Response.error();}
  })());
});
