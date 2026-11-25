/** Opaque frames have their own network cache partition. In a shared browser
 * release the parent can retrieve the same pinned bytes from the game's cache. */
export function setLoadingDocument(frame: HTMLIFrameElement, url: URL, integrity: string): void {
  function page(policy: string, script: string): string {
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="darkreader-lock"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${policy}; style-src 'unsafe-inline'"><style>html,body{margin:0;background:#080e16;color:#d9e9e3}.runescript{font-family:'Segoe UI Symbol','Noto Sans Runic',Junicode,serif}</style></head><body>${script}</body></html>`;
  }
  const src = url.href.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  if (!integrity || !document.querySelector('meta[name="hollow-wake-shared-assets"]')) {
    frame.srcdoc = page(url.origin, `<script src="${src}"></script>`);
    return;
  }
  const external = () => {
    frame.srcdoc = page(url.origin, `<script crossorigin="anonymous" integrity="${integrity}" src="${src}"></script>`);
  };
  fetch(url, { integrity }).then(async response => {
    if (!response.ok) throw Error('Loading frame unavailable');
    const code = await response.text();
    // HTML parsing must preserve the source verbatim for the pinned CSP hash.
    // An unembeddable future script can still use the ordinary external path.
    if (/<\/script[\s/>]|<!--|\r|\0/i.test(code)) { external(); return; }
    frame.srcdoc = page(`'${integrity}'`, `<script>${code}</script>`);
  }).catch(external);
}
