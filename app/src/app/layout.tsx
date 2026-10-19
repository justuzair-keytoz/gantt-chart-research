import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import "./globals.css";

import type { Metadata } from "next";
import {
  ColorSchemeScript,
  MantineProvider,
  createTheme,
  type MantineColorsTuple,
} from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";

export const metadata: Metadata = {
  title: "Roadmap Simulation",
  description: "Gantt scenario/scheduling engine prototype",
};

// Reused directly from UI/src/component/Providers/Providers.tsx per
// docs/gantt-chart/03-app-dependencies-and-config.md.
const myBlue: MantineColorsTuple = [
  "#e5f2ff",
  "#cde0ff",
  "#9abdff",
  "#6399ff",
  "#005cff",
  "#004de5",
  "#367aff",
  "#1866ff",
  "#0044cd",
  "#003ab6",
];

const theme = createTheme({
  colors: { myBlue },
  cursorType: "pointer",
  primaryColor: "myBlue",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider theme={theme}>
          <ModalsProvider>
            <Notifications position="bottom-right" />
            {children}
          </ModalsProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
