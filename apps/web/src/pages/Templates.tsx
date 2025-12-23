// @ts-nocheck
import { useTemplates } from '../hooks/useTemplates';

export default function TemplatesPage() {
  const { templates, selected, loading, error, selectTemplate } = useTemplates();

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Template Bank</h1>
        {loading && <span className="text-sm text-gray-500">Loading...</span>}
      </div>

      {error && (
        <div className="p-3 rounded bg-red-100 text-red-800 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {templates.map((tpl) => (
          <button
            key={tpl.id}
            onClick={() => selectTemplate(tpl.id)}
            className="text-left p-3 border rounded-lg hover:border-blue-500 hover:shadow transition"
          >
            <div className="text-sm uppercase text-gray-500">{tpl.category || 'General'}</div>
            <div className="text-lg font-semibold text-gray-900">{tpl.name}</div>
            {tpl.description && (
              <div className="text-sm text-gray-600 mt-1 line-clamp-2">{tpl.description}</div>
            )}
            <div className="text-xs text-gray-500 mt-2">
              {tpl.nodeCount} nodes • {tpl.memberCount} members
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="mt-6 border rounded-lg p-4 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm uppercase text-gray-500">Selected Template</div>
              <div className="text-xl font-bold text-gray-900">{selected.name}</div>
            </div>
            <div className="text-sm text-gray-600">
              {selected.nodes?.length ?? 0} nodes • {selected.members?.length ?? 0} members
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Nodes</h3>
              <div className="text-xs font-mono bg-gray-50 border rounded p-2 h-48 overflow-auto">
                {selected.nodes.map((n) => (
                  <div key={n.id} className="py-0.5">
                    {n.id}: ({n.x}, {n.y}, {n.z}) {n.support ? `• ${n.support}` : ''}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Members</h3>
              <div className="text-xs font-mono bg-gray-50 border rounded p-2 h-48 overflow-auto">
                {selected.members.map((m) => (
                  <div key={m.id} className="py-0.5">
                    {m.id}: {m.startNode} → {m.endNode} {m.section ? `• ${m.section}` : ''}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {selected.loads && selected.loads.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold text-gray-800 mb-2">Loads</h3>
              <div className="text-xs font-mono bg-gray-50 border rounded p-2">
                {selected.loads.map((l, idx) => (
                  <div key={idx} className="py-0.5">
                    {l.type} on {l.memberId ? `member ${l.memberId}` : `node ${l.nodeId}`} • value {l.value}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
