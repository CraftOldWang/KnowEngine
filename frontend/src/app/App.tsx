import { useEffect, useState } from "react";
import {
  BookOpen,
  ChevronRight,
  FlaskConical,
  Library,
  Menu,
  MessageSquare,
  UploadCloud,
  X,
} from "lucide-react";
import Documents from "../features/Documents";
import Upload from "../features/Upload";
import Chat from "../features/Chat";
import Evaluations from "../features/Evaluations";
import { Button } from "../components/ui";
const links = [
  { id: "documents", label: "知识库", icon: Library },
  { id: "upload", label: "上传与切分", icon: UploadCloud },
  { id: "chat", label: "AI 对话", icon: MessageSquare },
  { id: "evaluations", label: "评测中心", icon: FlaskConical },
];
export default function App() {
  const [route, setRoute] = useState(location.hash.slice(2) || "documents");
  const [open, setOpen] = useState(false);
  const [evaluationsVisited, setEvaluationsVisited] = useState(
    route === "evaluations",
  );
  useEffect(() => {
    if (route === "evaluations") setEvaluationsVisited(true);
  }, [route]);
  useEffect(() => {
    const onHash = () => {
      setRoute(location.hash.slice(2) || "documents");
      setOpen(false);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const current = links.find((l) => l.id === route);
  return (
    <div className="app-shell">
      <div className="mobile-header">
        <a className="brand" href="#/documents">
          <BookOpen size={25} />
          Know Engine
        </a>
        <Button
          variant="icon"
          aria-label={open ? "关闭导航" : "打开导航"}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </Button>
      </div>
      {open && <div className="nav-backdrop" onClick={() => setOpen(false)} />}
      <aside className={`app-sidebar ${open ? "open" : ""}`}>
        <a className="brand" href="#/documents">
          <span className="brand-mark">
            <BookOpen size={25} />
          </span>
          <span>
            Know Engine<small>知识，触手可及。</small>
          </span>
        </a>
        <div className="workspace-label">
          工作空间 <span>PERSONAL</span>
        </div>
        <nav>
          {links.map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              className={route === id ? "active" : ""}
              href={`#/${id}`}
            >
              <Icon size={19} />
              {label}
              {route === id && (
                <ChevronRight className="nav-chevron" size={15} />
              )}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="knowledge-tip">
            <span className="dot" />
            连接你的每一份知识
            <p>
              整理、探索、验证。
              <br />
              让信息成为更好的答案。
            </p>
          </div>
          <div className="profile">
            <span>K</span>
            <div>
              个人工作台<small>Know Engine Workspace</small>
            </div>
          </div>
        </div>
      </aside>
      <main className={`app-content ${route === "chat" ? "is-chat" : ""}`}>
        {!current ? (
          <div className="page">
            <h1>页面未找到</h1>
            <a href="#/documents">返回知识库</a>
          </div>
        ) : route === "documents" ? (
          <Documents />
        ) : route === "upload" ? (
          <Upload />
        ) : route === "chat" ? (
          <Chat />
        ) : null}
        {evaluationsVisited && (
          <div hidden={route !== "evaluations"}>
            <Evaluations active={route === "evaluations"} />
          </div>
        )}
      </main>
    </div>
  );
}
