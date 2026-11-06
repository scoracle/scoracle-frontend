import { describe, expect, it } from "vitest";
import { imageUrl } from "./image-url";

describe("provider image delivery", () => {
    it("sizes NBA portraits for the row and profile without changing identity", () => {
        const source = "https://cdn.nba.com/headshots/nba/latest/1040x760/1628398.png";
        expect(imageUrl(source, 128)).toContain("/260x190/1628398.png");
        expect(imageUrl(source, 384)).toContain("/520x380/1628398.png");
        expect(imageUrl(source, 128, "nfl")).toBe("");
    });
    it("bounds NFL and Wikimedia images and preserves unknown providers", () => {
        expect(imageUrl("https://static.www.nfl.com/image/upload/f_auto,q_auto/league/player", 128))
            .toBe("https://static.www.nfl.com/image/upload/f_auto,q_auto,w_128,h_128,c_fit/league/player");
        expect(imageUrl("https://commons.wikimedia.org/wiki/Special:FilePath/Crest.png?width=600", 64)).toContain("width=64");
        expect(imageUrl("https://example.com/photo.png", 128)).toBe("https://example.com/photo.png");
        expect(imageUrl(null, 128)).toBe("");
    });
});
