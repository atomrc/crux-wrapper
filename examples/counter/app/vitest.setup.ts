import fs from "node:fs";
// Override global fetch to allow fetching local files on the filesystem (This is used to load the wasm file)
globalThis.fetch = async (url: RequestInfo | URL) => {
  const path =
    url instanceof URL ? url.pathname : typeof url === "string" ? url : url.url;

  if (path.includes("/@fs/")) {
    const filepath = path.replace(/^.*\/@fs/, "");
    const file = fs.readFileSync(filepath);
    return new Response(file);
  }
  return baseFetch(url);
};
