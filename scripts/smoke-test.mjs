import fs from "node:fs/promises";
import vm from "node:vm";

const roots = new Map();
function node(id) {
  if (!roots.has(id)) roots.set(id, { innerHTML: "" });
  return roots.get(id);
}

const localStore = new Map();
const context = {
  console,
  setInterval() {},
  Date,
  Intl,
  Number,
  String,
  Math,
  Map,
  Set,
  Blob: class {},
  URL: { createObjectURL: () => "", revokeObjectURL() {} },
  FileReader: class {},
  localStorage: {
    getItem: (key) => localStore.get(key) ?? null,
    setItem: (key, value) => localStore.set(key, String(value)),
  },
  window: {
    location: { hash: "" },
    addEventListener() {},
    setInterval() {},
    confirm: () => true,
    alert() {},
  },
  document: {
    documentElement: { dataset: {}, lang: "" },
    body: { addEventListener() {} },
    addEventListener() {},
    getElementById: node,
    querySelectorAll: () => [],
    querySelector: () => null,
    createElement: () => ({ click() {}, remove() {} }),
  },
  fetch: async (url) => {
    if (url === "./data/worldcup-2026.json") {
      return {
        ok: true,
        json: async () => JSON.parse(await fs.readFile("data/worldcup-2026.json", "utf8")),
      };
    }
    throw new Error(`Unexpected fetch ${url}`);
  },
};

context.window.document = context.document;
vm.createContext(context);
const appCode = `${await fs.readFile("app.js", "utf8")}\nglobalThis.__kiniela = { state, loadLocalData, render };`;
vm.runInContext(appCode, context, { filename: "app.js" });

await context.__kiniela.loadLocalData();
for (const view of ["dashboard", "jornada", "focus", "command", "matches", "predictions", "groups", "bracket", "teams"]) {
  context.__kiniela.state.view = view;
  context.__kiniela.render();
  const html = node("app").innerHTML;
  if (!html || html.length < 500) throw new Error(`${view} rendered too little HTML`);
}

console.log("smoke ok");
