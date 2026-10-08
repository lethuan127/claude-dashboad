import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { metadata } from "./layout";
import Home from "./page";

describe("home page", () => {
  it("shows the Claude Dashboard heading", () => {
    expect(renderToStaticMarkup(<Home />)).toContain(
      "<h1>Claude Dashboard</h1>",
    );
  });

  it("sets the page title", () => {
    expect(metadata.title).toBe("Claude Dashboard");
  });
});
