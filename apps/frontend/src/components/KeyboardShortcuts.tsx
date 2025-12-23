import { FC, useEffect } from 'react';
import { useSelectionStore } from '../store/selection';
import { useModelStore } from '../store/model';

/**
 * KeyboardShortcuts - Global keyboard event handler
 * 
 * Provides efficient navigation and selection controls:
 * - Delete: Remove selected elements
 * - Escape: Clear selection
 * - A (Ctrl/Cmd): Select all
 * - C: Clear model (with confirmation)
 */
export const KeyboardShortcuts: FC = () => {
  const selectedNodeIds = useSelectionStore((state) => state.selectedNodeIds);
  const selectedMemberIds = useSelectionStore((state) => state.selectedMemberIds);
  const clearAll = useSelectionStore((state) => state.clearAll);
  const removeNode = useModelStore((state) => state.removeNode);
  const removeMember = useModelStore((state) => state.removeMember);
  const clear = useModelStore((state) => state.clear);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected elements
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        
        // Delete selected members first (they depend on nodes)
        selectedMemberIds.forEach((id) => {
          removeMember(id);
        });
        
        // Then delete selected nodes
        selectedNodeIds.forEach((id) => {
          removeNode(id);
        });
        
        // Clear selection after deletion
        clearAll();
      }

      // Clear selection
      if (e.key === 'Escape') {
        e.preventDefault();
        clearAll();
      }

      // Select all (Ctrl+A or Cmd+A)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        // TODO: Implement select all
        // This would require adding selectAll methods to the selection store
      }

      // Clear model (Ctrl+Shift+C or Cmd+Shift+C)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'c') {
        e.preventDefault();
        if (confirm('Clear entire model? This cannot be undone.')) {
          clear();
          clearAll();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNodeIds, selectedMemberIds, removeNode, removeMember, clear, clearAll]);

  return null; // This is a logic-only component
};
