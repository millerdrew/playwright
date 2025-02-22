/*
  Copyright (c) Microsoft Corporation.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

import './source.css';
import * as React from 'react';
import type { CodeMirror } from './codeMirrorModule';

export type SourceHighlight = {
  line: number;
  type: 'running' | 'paused' | 'error';
};

export type Language = 'javascript' | 'python' | 'java' | 'csharp';

export interface SourceProps {
  text: string;
  language: Language;
  readOnly: boolean;
  // 1-based
  highlight?: SourceHighlight[];
  revealLine?: number;
  lineNumbers?: boolean;
  focusOnChange?: boolean;
  wrapLines?: boolean;
  onChange?: (text: string) => void;
}

export const CodeMirrorWrapper: React.FC<SourceProps> = ({
  text,
  language,
  readOnly,
  highlight,
  revealLine,
  lineNumbers,
  focusOnChange,
  wrapLines,
  onChange,
}) => {
  const codemirrorElement = React.useRef<HTMLDivElement>(null);
  const [modulePromise] = React.useState<Promise<CodeMirror>>(import('./codeMirrorModule').then(m => m.default));
  const codemirrorRef = React.useRef<CodeMirror.Editor|null>(null);
  const [codemirror, setCodemirror] = React.useState<CodeMirror.Editor>();

  React.useEffect(() => {
    (async () => {
      // Always load the module first.
      const CodeMirror = await modulePromise;

      const element = codemirrorElement.current;
      if (!element)
        return;

      let mode = 'javascript';
      if (language === 'python')
        mode = 'python';
      if (language === 'java')
        mode = 'text/x-java';
      if (language === 'csharp')
        mode = 'text/x-csharp';

      if (codemirrorRef.current
        && mode === codemirrorRef.current.getOption('mode')
        && readOnly === codemirrorRef.current.getOption('readOnly')
        && lineNumbers === codemirrorRef.current.getOption('lineNumbers')
        && wrapLines === codemirrorRef.current.getOption('lineWrapping')) {
        // No need to re-create codemirror.
        return;
      }

      // Either configuration is different or we don't have a codemirror yet.
      codemirrorRef.current?.getWrapperElement().remove();

      const cm = CodeMirror(element, {
        value: '',
        mode,
        readOnly,
        lineNumbers,
        lineWrapping: wrapLines,
      });
      codemirrorRef.current = cm;
      setCodemirror(cm);
      return cm;
    })();
  }, [modulePromise, codemirror, codemirrorElement, language, lineNumbers, wrapLines, readOnly]);

  React.useEffect(() => {
    if (!codemirror)
      return;
    codemirror.off('change', (codemirror as any).listenerSymbol);
    (codemirror as any)[listenerSymbol] = undefined;
    if (onChange) {
      (codemirror as any)[listenerSymbol] = () => onChange(codemirror.getValue());
      codemirror.on('change', (codemirror as any)[listenerSymbol]);
    }

    if (codemirror.getValue() !== text) {
      codemirror.setValue(text);
      if (focusOnChange) {
        codemirror.execCommand('selectAll');
        codemirror.focus();
      }
    }
    for (let i = 0; i < codemirror.lineCount(); ++i)
      codemirror.removeLineClass(i, 'wrap');
    for (const h of highlight || [])
      codemirror.addLineClass(h.line - 1, 'wrap', `source-line-${h.type}`);
    if (revealLine)
      codemirror.scrollIntoView({ line: revealLine - 1, ch: 0 }, 50);
  }, [codemirror, text, highlight, revealLine, focusOnChange, onChange]);

  return <div className='cm-wrapper' ref={codemirrorElement}></div>;
};

const listenerSymbol = Symbol('listener');
