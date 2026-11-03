"use client";

import React from "react";

interface MathTextProps {
  text: string;
  className?: string;
}

/**
 * Formats math expressions with clean typography.
 * Supports $...$ expressions, exponents (^2, ^{abc}), subscripts (_1, _{abc}),
 * and common math symbols.
 */
export function MathText({ text, className = "" }: MathTextProps) {
  if (!text) return null;

  // Split text by $ delimiters: e.g. "If $f(x) = 2x^2 - 3x + 5$, what is $f(2)$?"
  const parts = text.split(/(\$[^$]+\$)/g);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
          const formula = part.slice(1, -1);
          return (
            <span
              key={index}
              className="inline-block font-serif italic font-medium text-slate-900 tracking-wide px-0.5"
            >
              {renderFormula(formula)}
            </span>
          );
        }

        // Render plain text segment (also handle raw exponents like x² or 2x^2 if present)
        return <span key={index}>{renderInlineMathFormatting(part)}</span>;
      })}
    </span>
  );
}

function renderFormula(formula: string): React.ReactNode[] {
  // Replace common TeX symbols with clean Unicode
  let formatted = formula
    .replace(/\\times/g, "×")
    .replace(/\\cdot/g, "·")
    .replace(/\\div/g, "÷")
    .replace(/\\pm/g, "±")
    .replace(/\\le(q)?/g, "≤")
    .replace(/\\ge(q)?/g, "≥")
    .replace(/\\neq/g, "≠")
    .replace(/\\approx/g, "≈")
    .replace(/\\pi/g, "π")
    .replace(/\\infty/g, "∞");

  return renderInlineMathFormatting(formatted);
}

function renderInlineMathFormatting(text: string): React.ReactNode[] {
  // Handle superscripts ^(...) or ^2, and subscripts _(...) or _1
  const tokens = text.split(/(\^\{[^\}]+\}|\^[0-9a-zA-Z\+\-]+|_\{[^\}]+\}|_[0-9a-zA-Z\+\-]+)/g);

  return tokens.map((token, idx) => {
    if (token.startsWith("^")) {
      const exp = token.startsWith("^{") ? token.slice(2, -1) : token.slice(1);
      return (
        <sup key={idx} className="text-[0.75em] leading-none ml-0.5 font-normal">
          {exp}
        </sup>
      );
    }
    if (token.startsWith("_")) {
      const sub = token.startsWith("_{") ? token.slice(2, -1) : token.slice(1);
      return (
        <sub key={idx} className="text-[0.75em] leading-none ml-0.5 font-normal">
          {sub}
        </sub>
      );
    }
    return <React.Fragment key={idx}>{token}</React.Fragment>;
  });
}
