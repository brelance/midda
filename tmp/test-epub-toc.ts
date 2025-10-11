import EPub from "epub";

async function readEpubToc(filePath: string) {
  return new Promise<Array<{ title: string; href: string }>>((resolve, reject) => {
    const epub = new EPub(filePath);

    epub.on("error", (error) => {
      reject(error);
    });

    epub.on("end", () => {
      if (Array.isArray(epub.toc) && epub.toc.length > 0) {
        resolve(
          epub.toc.map((item: any) => ({
            title: item.title ?? "",
            href: item.href ?? "",
          }))
        );
        return;
      }

      const manifestValues = Object.values(epub.manifest || {});
      const navEntry = manifestValues.find(
        (item: any) =>
          typeof item?.properties === "string" && item.properties.includes("nav")
      );

      if (!navEntry) {
        resolve([]);
        return;
      }

      epub.getChapterRaw(navEntry.id, (err: unknown, xhtml: string) => {
        if (err) {
          reject(err);
          return;
        }

        const navMatch = xhtml.match(
          /<nav[^>]*epub:type=["']toc["'][^>]*>([\s\S]*?)<\/nav>/i
        );
        if (!navMatch) {
          resolve([]);
          return;
        }

        const navHtml = navMatch[1];
        const anchorRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        const tocItems: Array<{ title: string; href: string }> = [];
        let match: RegExpExecArray | null;

        while ((match = anchorRegex.exec(navHtml)) !== null) {
          const rawTitle = match[2]
            .replace(/<[^>]*>/g, "")
            .replace(/\s+/g, " ")
            .trim();
          tocItems.push({
            title: rawTitle,
            href: match[1],
          });
        }

        resolve(tocItems);
      });
    });

    epub.parse();
  });
}

async function main() {
  const filePath =
    "./test_epub/負けヒロインが多すぎる 8 (雨森たきび) (Z-Library).epub";
  try {
    const toc = await readEpubToc(filePath);
    console.log("TOC entries:", toc.length);
    toc.slice(0, 10).forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.title} -> ${entry.href}`);
    });
  } catch (error) {
    console.error("Failed to read toc", error);
    process.exitCode = 1;
  }
}

main();
