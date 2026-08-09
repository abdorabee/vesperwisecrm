import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { CompactSettingsNavigation } from "../src/components/settings/compact-settings-navigation";

describe("compact settings navigation", () => {
  test("identifies its navigation purpose and the active settings location", () => {
    const markup = renderToStaticMarkup(
      <CompactSettingsNavigation
        current={{
          href: "/settings/calling",
          label: "Calling",
          groupLabel: "Communication",
          adminOnly: true,
        }}
        groups={[
          {
            label: "Communication",
            items: [
              { href: "/settings/email", label: "Email", adminOnly: true },
              { href: "/settings/calling", label: "Calling", adminOnly: true },
            ],
          },
        ]}
        pathname="/settings/calling"
        onNavigate={() => true}
      />,
    );

    expect(markup).toContain(">Settings<");
    expect(markup).toContain(">Communication<");
    expect(markup).toContain(">Calling<");
    expect(markup).toContain(
      'aria-label="Open settings navigation. Current page: Communication, Calling"',
    );
  });
});
