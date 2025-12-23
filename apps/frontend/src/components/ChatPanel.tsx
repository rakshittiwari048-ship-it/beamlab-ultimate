// @ts-nocheck
/**
 * ChatPanel.tsx
 * 
 * AI Engineering Copilot Chat Interface for BeamLab Workspace
 * 
 * Features:
 * - Chat with AI about structural engineering problems
 * - "Ask AI to Fix" integration with failed members
 * - Context-aware suggestions based on analysis results
 * - Conversation history within session
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Send,
  X,
  Bot,
  User,
  Sparkles,
  AlertTriangle,
  ChevronRight,
  Loader2,
  Maximize2,
  Minimize2,
  Trash2,
  Copy,
  Check,
} from 'lucide-react';

// ============================================================================
// INTERFACES
// ============================================================================

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  recommendations?: FixRecommendation[];
}

interface FixRecommendation {
  title: string;
  description: string;
  expectedImprovement: string;
  difficulty: number;
  costImpact: 'low' | 'medium' | 'high';
  tradeoffs: string[];
  codeReference?: string;
}

interface FailedMemberContext {
  memberId: string;
  ratio: number;
  failureMode: string;
  section: string;
  length: number;
  designCode: string;
  memberType: string;
}

interface ChatPanelProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Callback to close the panel */
  onClose: () => void;
  /** Currently selected failed member for context */
  failedMember?: FailedMemberContext;
  /** Callback when user wants to apply a fix */
  onApplyFix?: (recommendation: FixRecommendation) => void;
}

// ============================================================================
// MOCK API (Replace with actual API calls)
// ============================================================================

async function sendChatMessage(
  message: string,
  context?: FailedMemberContext
): Promise<{ reply: string; recommendations?: FixRecommendation[] }> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Mock response based on context
  if (context) {
    return {
      reply: `I've analyzed **Member ${context.memberId}** which is failing with a D/C ratio of **${context.ratio.toFixed(2)}** due to **${context.failureMode}**.

Here are my recommendations to fix this issue:`,
      recommendations: [
        {
          title: 'Upgrade to Heavier Section',
          description: `Replace ${context.section} with a heavier section like W14x30 or ISMB 300 to increase the compression capacity.`,
          expectedImprovement: `Reduce ratio from ${context.ratio.toFixed(2)} to approximately 0.85`,
          difficulty: 2,
          costImpact: 'medium',
          tradeoffs: [
            'Increased material cost (~15-20%)',
            'Verify connection compatibility',
            'Check floor-to-floor clearance',
          ],
          codeReference: 'IS 800 Clause 7.1',
        },
        {
          title: 'Add Mid-Span Bracing',
          description: `Install lateral bracing at mid-height to reduce the effective length from ${context.length}m to ${(context.length / 2).toFixed(1)}m.`,
          expectedImprovement: 'Reduce slenderness ratio by 50%, significantly improving buckling capacity',
          difficulty: 3,
          costImpact: 'medium',
          tradeoffs: [
            'Requires additional bracing members',
            'Architectural coordination needed',
            'Bracing connection design required',
          ],
          codeReference: 'IS 800 Clause 7.6.1',
        },
        {
          title: 'Modify End Connections',
          description: 'Stiffen the base connection to achieve a semi-rigid or fixed condition, reducing the effective length factor.',
          expectedImprovement: 'Reduce effective length factor from 1.0 to ~0.7',
          difficulty: 4,
          costImpact: 'high',
          tradeoffs: [
            'Higher fabrication complexity',
            'Induces moments in foundation',
            'Requires connection redesign',
          ],
          codeReference: 'IS 800 Table 11',
        },
      ],
    };
  }

  // Generic response for non-contextual questions
  return {
    reply: `I'm your Engineering Copilot, here to help with structural design questions.

**I can help you with:**
- Analyzing failed members and suggesting fixes
- Explaining IS 800, IS 456, and other code provisions
- Optimizing section selections
- Understanding design check failures

Click **"Ask AI to Fix"** on any failed member in the design results panel to get specific recommendations!`,
  };
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function RecommendationCard({
  recommendation,
  index,
  onApply,
}: {
  recommendation: FixRecommendation;
  index: number;
  onApply?: () => void;
}) {
  const difficultyColors = ['', 'bg-green-100 text-green-700', 'bg-green-100 text-green-700', 'bg-yellow-100 text-yellow-700', 'bg-orange-100 text-orange-700', 'bg-red-100 text-red-700'];
  const costColors = { low: 'text-green-600', medium: 'text-yellow-600', high: 'text-red-600' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
            {index + 1}
          </span>
          <h4 className="font-semibold text-gray-900">{recommendation.title}</h4>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={`px-2 py-0.5 rounded-full ${difficultyColors[recommendation.difficulty]}`}>
            Difficulty: {recommendation.difficulty}/5
          </span>
          <span className={`font-medium ${costColors[recommendation.costImpact]}`}>
            ${recommendation.costImpact.charAt(0).toUpperCase() + recommendation.costImpact.slice(1)} Cost
          </span>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-3">{recommendation.description}</p>

      <div className="bg-green-50 border border-green-200 rounded px-3 py-2 mb-3">
        <p className="text-sm text-green-700">
          <strong>Expected:</strong> {recommendation.expectedImprovement}
        </p>
      </div>

      {recommendation.tradeoffs.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-500 mb-1">Trade-offs:</p>
          <ul className="text-xs text-gray-600 space-y-1">
            {recommendation.tradeoffs.map((tradeoff, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="text-yellow-500 mt-0.5">•</span>
                {tradeoff}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        {recommendation.codeReference && (
          <span className="text-xs text-gray-400">{recommendation.codeReference}</span>
        )}
        {onApply && (
          <button
            onClick={onApply}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
          >
            Apply Fix
          </button>
        )}
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-2">
      <motion.span
        className="w-2 h-2 bg-gray-400 rounded-full"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0 }}
      />
      <motion.span
        className="w-2 h-2 bg-gray-400 rounded-full"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
      />
      <motion.span
        className="w-2 h-2 bg-gray-400 rounded-full"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
      />
    </div>
  );
}

// ============================================================================
// MAIN CHAT PANEL COMPONENT
// ============================================================================

export default function ChatPanel({
  isOpen,
  onClose,
  failedMember,
  onApplyFix,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Auto-populate context when failed member is provided
  useEffect(() => {
    if (failedMember && isOpen) {
      const contextMessage = `I need help fixing **Member ${failedMember.memberId}** which is failing in **${failedMember.failureMode}** with a D/C ratio of **${failedMember.ratio.toFixed(2)}**.

**Current Setup:**
- Section: ${failedMember.section}
- Length: ${failedMember.length}m
- Design Code: ${failedMember.designCode}

What are my options to fix this?`;

      handleSendMessage(contextMessage, failedMember);
    }
  }, [failedMember]);

  const handleSendMessage = useCallback(async (content: string, context?: FailedMemberContext) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Add loading message
    const loadingId = `loading-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: loadingId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isLoading: true,
      },
    ]);

    try {
      const response = await sendChatMessage(content, context);

      // Replace loading message with actual response
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingId
            ? {
                ...msg,
                content: response.reply,
                isLoading: false,
                recommendations: response.recommendations,
              }
            : msg
        )
      );
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingId
            ? {
                ...msg,
                content: 'Sorry, I encountered an error. Please try again.',
                isLoading: false,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCopyMessage = useCallback((id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleClearChat = useCallback(() => {
    setMessages([]);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`fixed right-0 top-0 h-full bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col ${
          isExpanded ? 'w-[600px]' : 'w-[400px]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold">Engineering Copilot</h2>
              <p className="text-blue-100 text-xs">AI-powered design assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <Minimize2 className="w-4 h-4 text-white" />
              ) : (
                <Maximize2 className="w-4 h-4 text-white" />
              )}
            </button>
            <button
              onClick={handleClearChat}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Failed Member Context Banner */}
        {failedMember && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-700">
              Analyzing: <strong>Member {failedMember.memberId}</strong> — D/C: {failedMember.ratio.toFixed(2)}
            </span>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Hi! I'm your Engineering Copilot
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                I can help analyze design failures, suggest fixes, and explain code provisions.
              </p>
              <div className="grid gap-2 w-full max-w-xs">
                <button
                  onClick={() => handleSendMessage('What can you help me with?')}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors text-left flex items-center justify-between"
                >
                  <span>What can you help me with?</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
                <button
                  onClick={() => handleSendMessage('Explain IS 800 buckling provisions')}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors text-left flex items-center justify-between"
                >
                  <span>Explain IS 800 buckling</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-3'
                    : 'bg-gray-100 text-gray-800 rounded-2xl rounded-bl-sm px-4 py-3'
                }`}
              >
                {/* Message header */}
                <div className="flex items-center gap-2 mb-1">
                  {message.role === 'assistant' ? (
                    <Bot className="w-4 h-4 text-blue-600" />
                  ) : (
                    <User className="w-4 h-4 text-blue-200" />
                  )}
                  <span className={`text-xs ${message.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                    {message.role === 'user' ? 'You' : 'Copilot'}
                  </span>
                  {message.role === 'assistant' && !message.isLoading && (
                    <button
                      onClick={() => handleCopyMessage(message.id, message.content)}
                      className="ml-auto p-1 hover:bg-gray-200 rounded transition-colors"
                      title="Copy"
                    >
                      {copiedId === message.id ? (
                        <Check className="w-3 h-3 text-green-600" />
                      ) : (
                        <Copy className="w-3 h-3 text-gray-400" />
                      )}
                    </button>
                  )}
                </div>

                {/* Message content */}
                {message.isLoading ? (
                  <TypingIndicator />
                ) : (
                  <div
                    className="text-sm prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: message.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>'),
                    }}
                  />
                )}

                {/* Recommendations */}
                {message.recommendations && message.recommendations.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {message.recommendations.map((rec, idx) => (
                      <RecommendationCard
                        key={idx}
                        recommendation={rec}
                        index={idx}
                        onApply={onApplyFix ? () => onApplyFix(rec) : undefined}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about structural design..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:opacity-50"
            />
            <button
              onClick={() => handleSendMessage(inputValue)}
              disabled={isLoading || !inputValue.trim()}
              className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400 text-center">
            AI may make mistakes. Always verify recommendations with code provisions.
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// FLOATING TRIGGER BUTTON
// ============================================================================

export function ChatPanelTrigger({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center z-40"
    >
      <Sparkles className="w-6 h-6" />
    </motion.button>
  );
}
