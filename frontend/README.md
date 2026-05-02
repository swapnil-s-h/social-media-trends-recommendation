# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Note about `global` in the browser

Some third-party libraries (or their pre-bundled browser builds) expect a Node-style `global` variable to exist. That can cause a runtime error like:

```
rng-browser.js:4 Uncaught ReferenceError: global is not defined
```

To prevent this, the app includes a short polyfill in `index.html` that sets `window.global = window` before the module scripts load. The Vite config also defines `global` as `globalThis` at build time so references are rewritten during bundling.

If you try to run the dev server and see an error from Vite about Node.js version, upgrade Node to at least `20.19.0` or use a newer LTS (`22.12+`). On Windows, consider installing nvm-windows or the official Node installer to manage versions.
