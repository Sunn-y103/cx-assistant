import type { ConversationListItem as ConversationItemType } from '../../hooks/useConversations'
import type { ConversationStatus, MessageChannel } from '../../types/database'
import { ChatIcon } from '../icons'

interface ConversationListItemProps {
  conversation: ConversationItemType
  isSelected: boolean
  onSelect: (id: string) => void
}

function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

function getStatusBadge(status: ConversationStatus) {
  switch (status) {
    case 'open':
      return {
        label: 'Open',
        classes: 'bg-amber-50 text-amber-700 border-amber-200/80',
      }
    case 'pending':
      return {
        label: 'Pending',
        classes: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      }
    case 'resolved':
      return {
        label: 'Resolved',
        classes: 'bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]',
      }
    case 'closed':
      return {
        label: 'Closed',
        classes: 'bg-slate-100 text-slate-600 border-slate-200',
      }
    default:
      return {
        label: status,
        classes: 'bg-slate-100 text-slate-700 border-slate-200',
      }
  }
}

function getChannelIcon(channel: MessageChannel) {
  switch (channel) {
    case 'chat':
    case 'widget':
      return <ChatIcon className="w-3.5 h-3.5 text-[#00a86b]" />
    case 'email':
    default:
      return (
        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
  }
}

export function ConversationListItem({
  conversation,
  isSelected,
  onSelect,
}: ConversationListItemProps) {
  const statusInfo = getStatusBadge(conversation.status)
  const initial = conversation.customer_name ? conversation.customer_name[0].toUpperCase() : 'C'

  return (
    <div
      onClick={() => onSelect(conversation.id)}
      className={`px-4 py-3 border-b cursor-pointer transition-colors duration-150 ${
        isSelected
          ? 'bg-[#f4f7fb] border-l-4 border-l-[#00a86b] pl-[13px] border-b-slate-200'
          : 'bg-white hover:bg-slate-50/80 border-l-4 border-l-transparent border-b-[#f1f3f6]'
      }`}
    >
      {/* 8px gap between avatar and text */}
      <div className="flex items-start gap-2">
        {/* Customer Initials Avatar */}
        <div className="w-9 h-9 rounded-full bg-[#374151] text-white flex items-center justify-center font-semibold text-xs flex-shrink-0 mt-0.5 shadow-2xs">
          {initial}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="text-xs font-semibold text-slate-900 truncate">
              {conversation.customer_name}
            </h4>
            <span className="text-[11px] text-slate-400 flex-shrink-0 font-medium">
              {formatRelativeTime(conversation.last_message_at)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 mb-1">
            <span title={conversation.channel} className="flex-shrink-0">
              {getChannelIcon(conversation.channel)}
            </span>
            <p className="text-xs font-medium text-slate-700 truncate">
              {conversation.subject || 'Inquiry'}
            </p>
          </div>

          {/* 4px gap between subject and preview */}
          <p className="text-[11px] text-slate-500 line-clamp-1 leading-relaxed">
            {conversation.latest_message_role === 'agent' && (
              <span className="text-[#00a86b] font-medium mr-1">You:</span>
            )}
            {conversation.latest_message_content || 'No messages yet'}
          </p>

          {/* 8px gap between preview and tags/timestamp, 4px gap between tags */}
          <div className="flex items-center justify-between gap-1 mt-2">
            <div className="flex items-center gap-1">
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${statusInfo.classes}`}
              >
                {statusInfo.label}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 truncate max-w-[130px]">
              {conversation.customer_email}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
