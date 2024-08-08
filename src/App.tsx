import { ThemeProvider } from "@/components/theme-provider";
import { Input } from "@/components/ui/input";
import "./App.css";
import { ModeToggle } from "@/components/mode-toggle";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";

const DISCORD_CDN_PROXY =
  "https://discord-cdn-proxy.affectedarc07.workers.dev/?";

enum DisplayType {
  TEXT,
  IMAGE,
  VIDEO,
}

type PossEntry = {
  key: string;
  url: string;
  displayType: DisplayType;
  mime?: string;
};

const parseEntry = (key: string, url: string) => {
  const urlObj = new URL(url);
  const ext = urlObj.pathname.split(".").pop() || "";

  if (url.startsWith("https://cdn.discordapp.com/")) {
    url = DISCORD_CDN_PROXY + url;
  }

  let displayType = DisplayType.TEXT;
  let mime;
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
    displayType = DisplayType.IMAGE;
  } else if (["mp4", "mov", "webm"].includes(ext)) {
    displayType = DisplayType.VIDEO;

    switch (ext) {
      case "mp4":
        mime = "video/mp4";
        break;
      case "mov":
        mime = "video/quicktime";
        break;
      case "webm":
        mime = "video/webm";
        break;
    }
  }

  return { key, url, displayType, mime };
};

const renderEntry = (entry: PossEntry) => {
  if (entry.displayType === DisplayType.IMAGE) {
    return <img src={entry.url} />;
  } else if (entry.displayType === DisplayType.VIDEO) {
    return (
      <video controls>
        <source src={entry.url} type={entry.mime} />
      </video>
    );
  }

  return <p className="break-words">{entry.url}</p>;
};

const Entry = forwardRef<HTMLDivElement, { entry: PossEntry }>(
  ({ entry }, ref) => {
    return (
      <div ref={ref}>
        <Card className="self-start">
          <CardContent className="flex pt-6">{renderEntry(entry)}</CardContent>
          <CardFooter>
            <a href={entry.url} className="hover:underline">
              {entry.key}
            </a>
          </CardFooter>
        </Card>
      </div>
    );
  }
);

function App() {
  const [possEntries, setPossEntries] = useState<PossEntry[]>([]);
  const [scroll, setScroll] = useState(10);
  const [search, setSearch] = useState("");
  const observer = useRef<IntersectionObserver>();

  useEffect(() => {
    fetch("https://affectedarc07.co.uk/freezerpins/do_one_cors.php")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.text();
      })
      .then((text) => {
        const data: PossEntry[] = [];
        let key: string;
        text.split("\n").forEach((s, i) => {
          if (i % 2 === 0) {
            key = s;
          } else {
            data.push(parseEntry(key, s.trim()));
          }
        });
        data.sort((a: PossEntry, b: PossEntry) => a.key.localeCompare(b.key));
        setPossEntries(data);
      });
  }, []);

  const lastItemRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (observer.current) {
        observer.current.disconnect();
      }
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          setScroll(scroll + 10);
        }
      });
      if (el) {
        observer.current.observe(el);
      }
    },
    [scroll]
  );

  const isSearching = search.length > 0;

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="">
        <div className="sticky top-0 flex space-x-4 p-4 sm:flex-row sm:items-center sm:space-y-0 md:h-16 bg-background">
          <h2 className="flex-none text-lg font-semibold">poss-web</h2>
          <Input
            placeholder="Search"
            onChange={(e) => setSearch(e.target.value.trim().toLowerCase())}
          />
          <ModeToggle />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 px-4">
          {possEntries
            .filter(
              (p: PossEntry) =>
                !isSearching || p.key.toLowerCase().indexOf(search) > -1
            )
            .slice(0, isSearching ? possEntries.length : scroll)
            .map((p: PossEntry, i) =>
              !isSearching && i === scroll - 1 ? (
                <Entry ref={lastItemRef} entry={p} key={p.key} />
              ) : (
                <Entry entry={p} key={p.key} />
              )
            )}
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
