// Generic item wrapper for widget children (cards, rows, thumbs).
// Applies user-controlled background / border / radius / shadow / hover.

import { forwardRef, type ReactNode, type CSSProperties } from "react";
import {
  itemStyle, itemClasses, itemCssVars, type WidgetItemStyle,
} from "@/lib/widgetCommon";

interface Props {
  style?: WidgetItemStyle;
  className?: string;
  as?: "div" | "article" | "li" | "a";
  children: ReactNode;
  inlineStyle?: CSSProperties;
  href?: string;
  onClick?: () => void;
}

export const WidgetItem = forwardRef<HTMLElement, Props>(function WidgetItem(
  { style, className = "", as = "div", children, inlineStyle, href, onClick }, ref,
) {
  const Tag: any = as;
  const merged: CSSProperties = {
    ...itemCssVars(style),
    ...itemStyle(style),
    ...(inlineStyle || {}),
  };
  const cls = `${itemClasses(style)} ${className}`.trim();
  return (
    <Tag
      ref={ref}
      href={href}
      onClick={onClick}
      style={merged}
      className={cls}
    >
      {children}
    </Tag>
  );
});

export default WidgetItem;
