import { useRef, useState } from 'react';
import { Editor, type Monaco } from '@monaco-editor/react';
import { Play, AlertCircle } from 'lucide-react';
import { parse } from '../utils/CommandParser';
import { useModelStore } from '../store/model';

/**
 * ScriptEditor - Monaco-based editor for STAAD-like script language
 * 
 * Features:
 * - Syntax highlighting for custom 'staad' language
 * - Keywords (JOINT, MEMBER, etc) in blue, numbers in green
 * - Run button and Ctrl+Enter keyboard shortcut
 * - Batch update to model store on execution
 */

const registerStaadLanguage = (monaco: Monaco) => {
  if (monaco.languages.getLanguages().some((lang: any) => lang.id === 'staad')) {
    return; // Already registered
  }

  // Define STAAD-like language
  monaco.languages.register({ id: 'staad' });

  // Define tokenizer for syntax highlighting
  monaco.languages.setMonarchTokensProvider('staad', {
    keywords: [
      'JOINT',
      'COORDINATES',
      'MEMBER',
      'INCIDENCES',
      'PROPERTY',
      'AMERICAN',
      'TABLE',
      'ST',
      'SUPPORT',
      'FIXED',
      'PINNED',
      'LOAD',
      'ANALYSIS',
    ],
    typeKeywords: [],
    operators: [],

    symbols: /[=><!~?:&|+\-*/%^]+/,

    escapes: /\\(?:[abfnrtv"\\]|x[0-9a-fA-F]{1,4}|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8})/,

    tokenizer: {
      root: [
        // Comment
        [/[;#].*$/, 'comment'],

        // Keywords
        [
          /\b(JOINT|COORDINATES|MEMBER|INCIDENCES|PROPERTY|AMERICAN|TABLE|ST|SUPPORT|FIXED|PINNED|LOAD|ANALYSIS)\b/i,
          'keyword',
        ],

        // Numbers (integers and decimals, including scientific notation)
        [/[\d.eE+-]+/, 'number'],

        // Identifiers
        [/[a-zA-Z_]\w*/, 'identifier'],

        // Whitespace
        [/\s+/, 'white'],
      ],
    },
  });

  // Define theme colors
  monaco.editor.defineTheme('staad-theme', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '4EC9B0', fontStyle: 'bold' }, // Teal/cyan for keywords
      { token: 'number', foreground: '4EC9B0' }, // Green-ish for numbers
      { token: 'comment', foreground: '6A9955' }, // Green for comments
      { token: 'identifier', foreground: 'D4D4D4' },
    ],
    colors: {
      'editor.background': '#1E1E1E',
      'editor.foreground': '#D4D4D4',
    },
  });
};

interface ScriptEditorProps {
  onError?: (message: string) => void;
  onSuccess?: (actionCount: number) => void;
}

export const ScriptEditor = ({ onError, onSuccess }: ScriptEditorProps) => {
  const editorRef = useRef<any>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Model store actions
  const addNode = useModelStore((s) => s.addNode);
  const addMember = useModelStore((s) => s.addMember);
  const updateMember = useModelStore((s) => s.updateMember);
  const getNode = useModelStore((s) => s.getNode);

  const handleEditorMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    registerStaadLanguage(monaco);
    editor.setModel(
      monaco.editor.createModel(
        `; BEAMLAB STRUCTURAL ANALYSIS SCRIPT
; =====================================

; Define joints (nodes)
JOINT COORDINATES J1 0 0 0
JOINT COORDINATES J2 5 0 0
JOINT COORDINATES J3 10 0 0

; Define members
MEMBER INCIDENCES M1 J1 J2
MEMBER INCIDENCES M2 J2 J3

; Assign sections
MEMBER PROPERTY AMERICAN M1 M2 TABLE ST ISMB300
`,
        (monaco.languages.getLanguage('staad') as any) || undefined
      )
    );
    editor.updateOptions({ theme: 'staad-theme' });

    // Register Ctrl+Enter shortcut
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => {
        handleRun();
      }
    );
  };

  const handleRun = async () => {
    if (!editorRef.current) return;

    setIsRunning(true);
    setErrors([]);

    try {
      const script = editorRef.current.getValue();
      const { actions, errors: parseErrors } = parse(script);

      if (parseErrors.length > 0) {
        setErrors(parseErrors);
        onError?.(parseErrors.join('; '));
        setIsRunning(false);
        return;
      }

      // Apply actions to model store
      for (const action of actions) {
        try {
          if (action.type === 'ADD_NODE') {
            const node: any = {
              id: action.id,
              x: action.x,
              y: action.y,
              z: action.z,
            };
            addNode(node);
          } else if (action.type === 'ADD_MEMBER') {
            // Verify nodes exist
            const startNode = getNode(action.startNodeId);
            const endNode = getNode(action.endNodeId);

            if (!startNode) {
              throw new Error(`Start node ${action.startNodeId} not found`);
            }
            if (!endNode) {
              throw new Error(`End node ${action.endNodeId} not found`);
            }

            const member: any = {
              id: action.id,
              startNodeId: action.startNodeId,
              endNodeId: action.endNodeId,
              sectionId: action.sectionId || 'ISMB300', // Default section
            };
            addMember(member);
          } else if (action.type === 'SET_SECTION') {
            for (const memberId of action.memberIds) {
              updateMember(memberId, { sectionId: action.sectionId });
            }
          }
          // COMMENT type is just logged, no action needed
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          throw new Error(`Error applying action: ${msg}`);
        }
      }

      onSuccess?.(actions.filter((a) => a.type !== 'COMMENT').length);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      setErrors([msg]);
      onError?.(msg);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded border border-gray-700">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 bg-gray-800 border-b border-gray-700">
        <button
          onClick={handleRun}
          disabled={isRunning}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition"
          title="Run script (Ctrl+Enter)"
        >
          <Play className="w-4 h-4" />
          {isRunning ? 'Running...' : 'Run'}
        </button>

        <span className="text-xs text-gray-400">Ctrl+Enter to run</span>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language="staad"
          theme="staad-theme"
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: false },
            lineNumbers: 'on',
            fontSize: 13,
            wordWrap: 'on',
            formatOnType: true,
            formatOnPaste: true,
            autoClosingBrackets: 'always',
          }}
        />
      </div>

      {/* Error Panel */}
      {errors.length > 0 && (
        <div className="border-t border-gray-700 bg-red-900/20 p-3 max-h-32 overflow-y-auto">
          <div className="flex items-start gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm font-semibold text-red-400">Parse Errors:</span>
          </div>
          <div className="space-y-1">
            {errors.map((err, i) => (
              <div key={i} className="text-xs text-red-300 font-mono">
                {err}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
