import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Disc3 } from "lucide-react";

export default function PageTransition() {
  const { pathname } = useLocation();
  const prevPath = useRef(pathname);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    setShow(true);
    const t = setTimeout(() => setShow(false), 550);
    return () => clearTimeout(t);
  }, [pathname]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center bg-background/40 backdrop-blur-sm animate-fade-in"
      aria-hidden
    >
      <div className="relative">
        <Disc3 className="h-14 w-14 text-primary animate-spin" style={{ animationDuration: "0.9s" }} />
        <div className="absolute inset-0 rounded-full bg-primary/30 blur-2xl -z-10" />
      </div>
    </div>
  );
}
