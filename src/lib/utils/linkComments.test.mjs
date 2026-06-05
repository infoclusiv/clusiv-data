import assert from "node:assert/strict";

import { normalizeLink, normalizeLinks } from "$lib/utils/categoryUtils";

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest("normalizeLink defaults missing comments to an empty string", () => {
  const link = normalizeLink(
    {
      title: "Example",
      url: "https://example.com",
      images: [],
    },
    1,
  );

  assert.ok(link);
  assert.equal(link.comments, "");
});

runTest("normalizeLink preserves existing comments", () => {
  const link = normalizeLink(
    {
      title: "Example",
      url: "https://example.com",
      images: [],
      comments: "Contexto importante",
    },
    1,
  );

  assert.ok(link);
  assert.equal(link.comments, "Contexto importante");
});

runTest("normalizeLinks keeps legacy links without comments", () => {
  const links = normalizeLinks([
    {
      title: "Legacy",
      url: "https://example.com",
      images: [],
    },
  ]);

  assert.equal(links.length, 1);
  assert.equal(links[0].title, "Legacy");
  assert.equal(links[0].url, "https://example.com");
  assert.deepEqual(links[0].images, []);
  assert.equal(links[0].comments, "");
});
