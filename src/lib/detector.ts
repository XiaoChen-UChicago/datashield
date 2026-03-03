import { ProtectionStrategy } from "@prisma/client";
import crypto from "crypto";
import { upsertToken } from "./token-vault";

export type StrategyInput = "mask" | "encrypt" | "tokenize";

export interface DetectionPattern {
  type: string;
  regex: RegExp;
  severity: "low" | "medium" | "high";
  validator?: (value: string) => boolean;
}

export interface DetectionMatch {
  value: string;
  start: number;
  end: number;
  type: string;
  severity: "low" | "medium" | "high";
}

export interface DetectionReportItem {
  type: string;
  preview: string;
  replacement: string;
  position: number;
  severity: "low" | "medium" | "high";
  token?: string | null;
}

const detectionPatterns: DetectionPattern[] = [
  { type: "OpenAI Key", regex: /(sk-[a-zA-Z0-9]{20,})/g, severity: "high" },
  { type: "AWS Access Key", regex: /(AKIA[0-9A-Z]{16})/g, severity: "high" },
  { type: "GitHub Token", regex: /(ghp_[a-zA-Z0-9]{24,})/g, severity: "high" },
  { type: "Slack Webhook", regex: /(https:\/\/hooks\.slack\.com\/[A-Za-z0-9\/]+)/g, severity: "medium" },
  { type: "Email", regex: /([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/g, severity: "medium" },
  { type: "Phone", regex: /((?:\+?\d{2,3}-?)?(?:1[3-9]\d{9}|0\d{2,3}-?\d{7,8}))/g, severity: "medium" },
  { type: "CN ID", regex: /([1-9]\d{5}(?:18|19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[0-9Xx])/g, severity: "high" },
  { type: "Bank Card", regex: /\b([1-9]\d{11,18})\b/g, severity: "high", validator: luhnCheck },
  { type: "JWT", regex: /([A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+)/g, severity: "high" },
  { type: "IPv4", regex: /\b((?:\d{1,3}\.){3}\d{1,3})\b/g, severity: "low" },
];

function luhnCheck(value: string) {
  let sum = 0;
  let shouldDouble = false;
  for (let i = value.length - 1; i >= 0; i -= 1) {
    let digit = parseInt(value.charAt(i), 10);
    if (Number.isNaN(digit)) return false;
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

function preview(value: string) {
  if (value.length <= 6) return `${value[0]}***${value[value.length - 1]}`;
  return `${value.slice(0, 3)}***${value.slice(-2)}`;
}

function maskValue(value: string) {
  if (value.length <= 4) return `${value[0]}**${value.slice(-1)}`;
  return `${value.slice(0, 2)}${"*".repeat(Math.max(2, value.length - 4))}${value.slice(-2)}`;
}

function encryptValue(value: string) {
  const hash = crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
  return `[ENC_${hash}]`;
}

export async function runDetection({
  text,
  strategy,
  workspaceId,
}: {
  text: string;
  strategy: StrategyInput;
  workspaceId?: string | null;
}) {
  const matches: DetectionMatch[] = [];
  detectionPatterns.forEach((pattern) => {
    const globalRegex = new RegExp(pattern.regex.source, pattern.regex.flags.includes("g") ? pattern.regex.flags : pattern.regex.flags + "g");
    let result: RegExpExecArray | null;
    while ((result = globalRegex.exec(text)) !== null) {
      const value = result[0];
      if (pattern.validator && !pattern.validator(value)) {
        continue;
      }
      matches.push({
        value,
        start: result.index,
        end: result.index + value.length,
        type: pattern.type,
        severity: pattern.severity,
      });
    }
  });

  if (!matches.length) {
    return {
      processedText: text,
      detections: [] as DetectionReportItem[],
    };
  }

  matches.sort((a, b) => a.start - b.start);

  let cursor = 0;
  let output = "";
  const detections: DetectionReportItem[] = [];

  for (const match of matches) {
    if (match.start < cursor) {
      continue; // skip overlapping detection
    }
    output += text.slice(cursor, match.start);

    let replacement = match.value;
    let token: string | null = null;

    if (strategy === "mask") {
      replacement = maskValue(match.value);
    } else if (strategy === "encrypt") {
      replacement = encryptValue(match.value);
    } else if (strategy === "tokenize") {
      token = await upsertToken(match.value, workspaceId ?? null);
      replacement = token;
    }

    detections.push({
      type: match.type,
      preview: preview(match.value),
      replacement,
      position: match.start,
      severity: match.severity,
      token,
    });

    output += replacement;
    cursor = match.end;
  }

  output += text.slice(cursor);

  return { processedText: output, detections };
}

export function normalizeStrategy(value: string | undefined | null): StrategyInput {
  switch (value) {
    case "encrypt":
      return "encrypt";
    case "tokenize":
      return "tokenize";
    default:
      return "mask";
  }
}

export function prismaStrategy(strategy: StrategyInput): ProtectionStrategy {
  switch (strategy) {
    case "encrypt":
      return ProtectionStrategy.ENCRYPT;
    case "tokenize":
      return ProtectionStrategy.TOKENIZE;
    default:
      return ProtectionStrategy.MASK;
  }
}
