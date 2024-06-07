import { Html, Head, Main, NextScript } from "next/document";

const title = "GlyphQuest Augmented Reality Experiment 2024";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <title>{title}</title>
        <meta property="og:title" content={title} key={title} />
        <meta
          name="description"
          content="This experiment is about measuring the readability of spatial text in augmented reality."
        />
      </Head>
      <body>
        <div id="dom-overlay-root"></div>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
