'use strict';
module.exports = {
 noServer: true, maxPayload: 8192,
 // Independent messages avoid retained cross-message compression state.
 perMessageDeflate: {
  serverNoContextTakeover: true, clientNoContextTakeover: true,
  concurrencyLimit: 4, threshold: 1024, zlibDeflateOptions: {level: 3},
 },
};
