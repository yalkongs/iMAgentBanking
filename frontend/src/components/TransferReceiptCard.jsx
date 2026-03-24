export default function TransferReceiptCard({ data }) {
  const { to, from, amountFormatted, newBalanceFormatted, memo } = data

  return (
    <div className="transfer-receipt">
      <div className="receipt-status">
        <div className="receipt-check">✓</div>
        <div className="receipt-label">이체 완료</div>
      </div>
      <div className="receipt-amount">{amountFormatted}</div>
      <div className="receipt-rows">
        <div className="receipt-row">
          <span className="receipt-lbl">받는 분</span>
          <span className="receipt-val">{to.name}</span>
        </div>
        <div className="receipt-row">
          <span className="receipt-lbl">받는 계좌</span>
          <span className="receipt-val">{to.bank} · {to.accountNo}</span>
        </div>
        <div className="receipt-row">
          <span className="receipt-lbl">출금 계좌</span>
          <span className="receipt-val">{from.name}</span>
        </div>
        {memo && (
          <div className="receipt-row">
            <span className="receipt-lbl">메모</span>
            <span className="receipt-val">{memo}</span>
          </div>
        )}
        <div className="receipt-row receipt-row-balance">
          <span className="receipt-lbl">잔여 잔액</span>
          <span className="receipt-val-balance">{newBalanceFormatted}</span>
        </div>
      </div>
    </div>
  )
}
