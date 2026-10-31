// Loaded into every harness by scripts/run-ui-lane.mjs (electron -r).
//
// A runner has no GPU, and the software compositor sometimes has no frame to copy
// when a harness asks for a screenshot, so capturePage rejects with UnknownVizError.
// That says nothing about the game: another frame a moment later copies fine. Only
// this error is retried, and a harness's assertions are never touched.
const { app } = require('electron');

const RETRIES = 6;
const RETRY_MS = 250;

// A harness must see the same arguments as a direct launch.
const flag = process.argv.indexOf('-r');
if (flag > 0) process.argv.splice(flag, 2);

app.on('web-contents-created', (_event, contents) => {
  const capturePage = contents.capturePage.bind(contents);
  contents.capturePage = async (...args) => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await capturePage(...args);
      } catch (error) {
        if (attempt >= RETRIES || !/UnknownVizError/.test(String(error))) throw error;
        await new Promise(resolve => setTimeout(resolve, RETRY_MS));
      }
    }
  };
});
