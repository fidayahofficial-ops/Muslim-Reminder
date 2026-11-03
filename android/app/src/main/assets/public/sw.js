/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "index.html",
    "revision": "d81fd39e8c737b02448c178efc334353"
  }, {
    "url": "icon.svg",
    "revision": "1b402836a7af16e568b5c1fb790e3d02"
  }, {
    "url": "favicon.png",
    "revision": "99b842551998edaf84da781660ce9ea0"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "20bf0267ab9a03497e853ff28e5db325"
  }, {
    "url": "app-logo.png",
    "revision": "2fb7404e6237e56038d487b717135f99"
  }, {
    "url": "icons/icon-maskable-512x512.png",
    "revision": "e36f401c10d745dc5417465e7ff995ea"
  }, {
    "url": "icons/icon-maskable-192x192.png",
    "revision": "b84da448849dff9f60a3569277f2b4ec"
  }, {
    "url": "icons/icon-512x512.png",
    "revision": "e36f401c10d745dc5417465e7ff995ea"
  }, {
    "url": "icons/icon-192x192.png",
    "revision": "b84da448849dff9f60a3569277f2b4ec"
  }, {
    "url": "assets/index-D3v4JutZ.js",
    "revision": null
  }, {
    "url": "assets/index-Cv9yWlu6.css",
    "revision": null
  }, {
    "url": "app-logo.png",
    "revision": "2fb7404e6237e56038d487b717135f99"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "20bf0267ab9a03497e853ff28e5db325"
  }, {
    "url": "favicon.png",
    "revision": "99b842551998edaf84da781660ce9ea0"
  }, {
    "url": "icon.svg",
    "revision": "1b402836a7af16e568b5c1fb790e3d02"
  }, {
    "url": "icons/icon-192x192.png",
    "revision": "b84da448849dff9f60a3569277f2b4ec"
  }, {
    "url": "icons/icon-512x512.png",
    "revision": "e36f401c10d745dc5417465e7ff995ea"
  }, {
    "url": "icons/icon-maskable-192x192.png",
    "revision": "b84da448849dff9f60a3569277f2b4ec"
  }, {
    "url": "icons/icon-maskable-512x512.png",
    "revision": "e36f401c10d745dc5417465e7ff995ea"
  }, {
    "url": "manifest.webmanifest",
    "revision": "737ea555bf544ba5c7866a4bca1ff785"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-stylesheets",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-webfonts",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 30,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
