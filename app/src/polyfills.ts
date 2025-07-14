import { getRandomValues as expoCryptoGetRandomValues } from "expo-crypto";
import { Buffer } from "buffer";
import "core-js/actual/structured-clone";

console.log('Loading polyfills...');

global.Buffer = Buffer;
console.log('Buffer polyfill loaded');

// structuredClone polyfill
if (typeof global.structuredClone === 'undefined') {
  try {
    global.structuredClone = require('@ungap/structured-clone');
  } catch {
    global.structuredClone = require('core-js/actual/structured-clone');
  }
}
console.log('structuredClone polyfill loaded');

// getRandomValues polyfill
class Crypto {
  getRandomValues = expoCryptoGetRandomValues;
}

const webCrypto = typeof crypto !== "undefined" ? crypto : new Crypto();

(() => {
  if (typeof crypto === "undefined") {
    Object.defineProperty(window, "crypto", {
      configurable: true,
      enumerable: true,
      get: () => webCrypto,
    });
  }
})();

console.log('Crypto polyfill loaded');
console.log('All polyfills loaded successfully');
