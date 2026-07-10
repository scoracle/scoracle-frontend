import { describe, expect, it } from "vitest";
import { stripExecutableReviewAssets } from "./middleware";

describe("stripExecutableReviewAssets", () => {
  it("removes scripts from review HTML", () => {
    const html = '<div>before</div><script type="module" src="/_build/app.js"></script><div>after</div>';
    const stripped = stripExecutableReviewAssets(html);
    expect(stripped).not.toContain("<script");
    expect(stripped).toContain("<div>before</div>");
    expect(stripped).toContain("<div>after</div>");
  });

  it("removes modulepreload links across quote and attribute-order variants", () => {
    const html = [
      '<link rel="modulepreload" href="/_build/a.js">',
      "<link href=\"/_build/b.js\" rel='modulepreload'>",
      '<link href="/_build/c.js" crossorigin rel=modulepreload>',
      '<link href="/style.css" rel="stylesheet">',
    ].join("");

    const stripped = stripExecutableReviewAssets(html);
    expect(stripped).not.toContain("modulepreload");
    expect(stripped).not.toContain("/_build/a.js");
    expect(stripped).not.toContain("/_build/b.js");
    expect(stripped).not.toContain("/_build/c.js");
    expect(stripped).toContain('<link href="/style.css" rel="stylesheet">');
  });
});
