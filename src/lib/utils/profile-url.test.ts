import { describe, it, expect } from "vitest";
import {
  slugifyName,
  parseEntityIdParam,
  profilePath,
  parseProfilePath,
  isProfileSport,
} from "./profile-url";

describe("slugifyName", () => {
  it("lowercases, strips diacritics, and dash-joins", () => {
    expect(slugifyName("LeBron James")).toBe("lebron-james");
    expect(slugifyName("Estêvão")).toBe("estevao");
    expect(slugifyName("Nikola Jokić")).toBe("nikola-jokic");
    expect(slugifyName("Brighton & Hove Albion")).toBe("brighton-hove-albion");
  });

  it("returns empty string for missing names", () => {
    expect(slugifyName(undefined)).toBe("");
    expect(slugifyName(null)).toBe("");
    expect(slugifyName("---")).toBe("");
  });
});

describe("parseEntityIdParam", () => {
  it("extracts the leading numeric id with or without a slug", () => {
    expect(parseEntityIdParam("123")).toBe("123");
    expect(parseEntityIdParam("123-lebron-james")).toBe("123");
    expect(parseEntityIdParam("37700784-aaron-anselmino")).toBe("37700784");
  });

  it("rejects params without a leading id", () => {
    expect(parseEntityIdParam("lebron-james")).toBeNull();
    expect(parseEntityIdParam("")).toBeNull();
    expect(parseEntityIdParam(undefined)).toBeNull();
    expect(parseEntityIdParam("12x34")).toBeNull();
  });
});

describe("profilePath", () => {
  it("builds slugged paths and lowercases the sport", () => {
    expect(profilePath("NBA", "player", 177, { name: "Aaron Gordon" })).toBe(
      "/profile/nba/player/177-aaron-gordon",
    );
  });

  it("omits the slug when no name is given", () => {
    expect(profilePath("nfl", "team", "42")).toBe("/profile/nfl/team/42");
  });

  it("coerces unknown types to player and appends the tab param", () => {
    expect(profilePath("nba", "coach", 1, { tab: "news" })).toBe(
      "/profile/nba/player/1?tab=news",
    );
  });
});

describe("parseProfilePath", () => {
  it("round-trips paths built by profilePath", () => {
    const path = profilePath("NBA", "player", 177, { name: "Aaron Gordon" });
    expect(parseProfilePath(path)).toEqual({ sport: "nba", type: "player", id: "177" });
  });

  it("accepts slugless ids and trailing slashes", () => {
    expect(parseProfilePath("/profile/football/team/9/")).toEqual({
      sport: "football",
      type: "team",
      id: "9",
    });
  });

  it("rejects non-profile and malformed paths", () => {
    expect(parseProfilePath("/profile")).toBeNull();
    expect(parseProfilePath("/profile/nba/player")).toBeNull();
    expect(parseProfilePath("/profile/cricket/player/1")).toBeNull();
    expect(parseProfilePath("/profile/nba/coach/1")).toBeNull();
    expect(parseProfilePath("/profile/nba/player/lebron")).toBeNull();
    expect(parseProfilePath("/leaderboard")).toBeNull();
  });
});

describe("isProfileSport", () => {
  it("accepts configured sports in any case, rejects the rest", () => {
    expect(isProfileSport("nba")).toBe(true);
    expect(isProfileSport("NBA")).toBe(true);
    expect(isProfileSport("football")).toBe(true);
    expect(isProfileSport("cricket")).toBe(false);
    expect(isProfileSport(undefined)).toBe(false);
  });
});
