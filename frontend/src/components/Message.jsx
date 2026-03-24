import ReactMarkdown from 'react-markdown'
import TransferCard from './TransferCard.jsx'
import BalanceCard from './BalanceCard.jsx'
import TransactionList from './TransactionList.jsx'
import SpendingCard from './SpendingCard.jsx'
import InsightCard from './InsightCard.jsx'
import ContactCandidatesCard from './ContactCandidatesCard.jsx'
import TransferSuggestionCard from './TransferSuggestionCard.jsx'
import TransferReceiptCard from './TransferReceiptCard.jsx'
import TransactionAlertCard from './TransactionAlertCard.jsx'

export default function Message({ msg, sessionId, onTransferDone, onQuickAction }) {
  // 이체 확인 카드
  if (msg.type === 'transfer_pending') {
    return (
      <TransferCard
        data={msg.data}
        sessionId={sessionId}
        onDone={(confirmed, result) => onTransferDone(confirmed, result, msg.id)}
      />
    )
  }

  // 백그라운드 입출금 알림
  if (msg.type === 'transaction_alert') {
    return <TransactionAlertCard data={msg.data} onQuickAction={onQuickAction} />
  }

  // 이체 완료 영수증
  if (msg.type === 'transfer_receipt') {
    return <TransferReceiptCard data={msg.data} />
  }

  // 이체 실패/취소
  if (msg.type === 'transfer_result') {
    return (
      <div className={`transfer-result ${msg.success ? 'success' : 'failed'}`}>
        <span>{msg.success ? '✓' : '✗'}</span>
        <span>{msg.text}</span>
      </div>
    )
  }

  // UI 카드 (잔액, 거래, 분석 등)
  if (msg.type === 'ui_card') {
    const { cardType, data } = msg
    if (cardType === 'get_balance') return <BalanceCard data={data} onQuickAction={onQuickAction} />
    if (cardType === 'get_transactions') return <TransactionList data={data} onQuickAction={onQuickAction} />
    if (cardType === 'analyze_spending') return <SpendingCard data={data} />
    if (cardType === 'analyze_card_spending') return <SpendingCard data={data} />
    if (cardType === 'get_transfer_suggestion') return <TransferSuggestionCard data={data} onQuickAction={onQuickAction} />
    if (cardType === 'resolve_contact_candidates') return <ContactCandidatesCard data={data} onQuickAction={onQuickAction} />
    if (cardType === 'complex_query' || cardType === 'get_recent_transfer') {
      return <InsightCard cardType={cardType} data={data} />
    }
    return null
  }

  // 일반 텍스트 메시지
  return (
    <div className={`message ${msg.role}`}>
      {msg.role === 'assistant' && (
        <div className="message-avatar">
          <img src="/imbank-mark.png" alt="iM" />
        </div>
      )}
      <div className="message-bubble">
        {msg.role === 'assistant' ? (
          <>
            <ReactMarkdown>{msg.text}</ReactMarkdown>
            {msg.streaming && <span className="cursor" />}
          </>
        ) : (
          msg.text
        )}
      </div>
    </div>
  )
}
