import { parseKtrPayload } from './parser';
import type { NormalizedKtrData } from './types';

export interface DrawerExtractionResult {
  parsed: NormalizedKtrData;
  raw: unknown;
}

export function extractKtrFromDrawer(drawer: Element): DrawerExtractionResult | null {
  const jsonEditor = drawer.querySelector('.jsoneditor');
  if (!jsonEditor) {
    return null;
  }

  const preview = jsonEditor.querySelector('pre.jsoneditor-preview');
  if (preview?.textContent) {
    const parsed = parseKtrPayload(preview.textContent);
    if (parsed) {
      return { parsed, raw: preview.textContent };
    }
  }

  const aceTextarea = jsonEditor.querySelector<HTMLTextAreaElement>('.ace_text-input');
  if (aceTextarea?.value) {
    const parsed = parseKtrPayload(aceTextarea.value);
    if (parsed) {
      return { parsed, raw: aceTextarea.value };
    }
  }

  const textContent = jsonEditor.textContent;
  if (textContent) {
    try {
      const matched = textContent.match(/\{[\s\S]*\}/);
      if (matched) {
        const parsed = parseKtrPayload(matched[0]);
        if (parsed) {
          return { parsed, raw: matched[0] };
        }
      }
    } catch (error) {
      console.warn('KTR文本解析失败', error);
    }
  }

  if (typeof window !== 'undefined' && window.lastKTRResponse) {
    const parsed = parseKtrPayload(window.lastKTRResponse);
    if (parsed) {
      return { parsed, raw: window.lastKTRResponse };
    }
  }

  return null;
}
