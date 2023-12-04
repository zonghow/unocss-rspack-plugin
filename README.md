# unocss-rspack-plugin

The Rspack plugin for UnoCSS.

## Getting Started

To begin, you'll need to install `unocss-rspack-plugin`

```console
npm install --save-dev unocss-rspack-plugin

yarn add -D unocss-rspack-plugin

yarn add -D unocss-rspack-plugin
```

### rspack.config.js

```js
const UnoCSS = require("unocss-rspack-plugin");

module.exports = {
  // ...
  plugins: [
    //...
    new UnoCSS(),
  ],
};
```

### uno.config.js

https://unocss.dev/guide/config-file

```js
// uno.config.ts
import { defineConfig } from "unocss";

export default defineConfig({
  // ...UnoCSS options
});
```

### entry js

Add uno.css to your main entry:

```js
import "uno.css";
```

For layers if you have

```js
import "uno.css";
import "uno.utilities.css";
import "uno.components.css";
```

## Options

For Rspack specific reasons, the concatenation of layers cannot use the official colon : , so the layerHyphen configuration is provided, which defaults to . , e.g. `import "uno.mylayer.css"`.

I'm following this issue and will update when it's resolved.

```ts
interface Options {
  layerHyphen?: string;
}
```
