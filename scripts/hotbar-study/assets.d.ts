/// <reference types="vite/client" />
declare module 'study-skill:*' {
  const painting: string;
  export default painting;
}
declare module 'study:effects' {
  const samples: import('./catalogue').Sample[];
  export default samples;
}
declare module 'study:sockets' {
  const states: ReturnType<typeof import('./socketExample').socketExample>;
  export default states;
  export const slotFit: ReturnType<typeof import('./socketExample').slotFitExamples>;
  export const counterExamples: ReturnType<typeof import('./socketExample').counterExamples>;
}
