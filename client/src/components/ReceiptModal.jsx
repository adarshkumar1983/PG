import React, { useRef } from 'react';
import { X, Printer, Download, Building2, CheckCircle2 } from 'lucide-react';
import { money } from '../utils/formatters.js';

export default function ReceiptModal({ payment, onClose, pgName = "StayZen Residency" }) {
  const receiptRef = useRef();

  const handlePrint = () => {
    const printContent = receiptRef.current.innerHTML;
    const originalContent = document.body.innerHTML;

    // Create a print window or write a clean style
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>Payment Receipt - ${payment.referenceNumber || payment._id}</title>
          <style>
            body {
              font-family: 'DM Sans', Arial, sans-serif;
              color: #1b2724;
              background: #fff;
              padding: 40px;
              margin: 0;
            }
            .receipt-container {
              max-width: 600px;
              margin: 0 auto;
              border: 1px solid #e4e9e5;
              border-radius: 12px;
              padding: 30px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #0b4438;
              padding-bottom: 20px;
              margin-bottom: 20px;
            }
            .logo-section {
              display: flex;
              align-items: center;
              gap: 10px;
              font-size: 20px;
              font-weight: 800;
              color: #0b4438;
            }
            .logo-box {
              width: 32px;
              height: 32px;
              background: #0b4438;
              color: #fff;
              display: grid;
              place-items: center;
              border-radius: 8px;
              font-weight: bold;
            }
            .title-section {
              text-align: right;
            }
            .title-section h1 {
              margin: 0;
              font-size: 22px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .title-section p {
              margin: 4px 0 0;
              font-size: 12px;
              color: #6c7874;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
              font-size: 13px;
            }
            .meta-box h4 {
              margin: 0 0 6px 0;
              color: #6c7874;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .meta-box p {
              margin: 0;
              font-weight: 600;
            }
            .ledger-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .ledger-table th {
              background: #f4f6f3;
              text-align: left;
              padding: 10px;
              font-size: 11px;
              text-transform: uppercase;
              color: #6c7874;
              border-bottom: 1px solid #e4e9e5;
            }
            .ledger-table td {
              padding: 12px 10px;
              font-size: 13px;
              border-bottom: 1px solid #e4e9e5;
            }
            .amount-summary {
              margin-left: auto;
              width: 250px;
              font-size: 13px;
              display: grid;
              gap: 8px;
              margin-bottom: 40px;
            }
            .amount-row {
              display: flex;
              justify-content: space-between;
            }
            .amount-row.total {
              font-size: 16px;
              font-weight: 700;
              color: #0b4438;
              border-top: 1px solid #e4e9e5;
              padding-top: 8px;
            }
            .footer {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              font-size: 12px;
              color: #6c7874;
              margin-top: 50px;
            }
            .signature-space {
              width: 150px;
              border-top: 1px dashed #6c7874;
              text-align: center;
              padding-top: 5px;
              font-style: italic;
            }
            @media print {
              body { padding: 0; }
              .receipt-container {
                border: none;
                box-shadow: none;
                padding: 0;
              }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="receipt-container">
            ${printContent}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const residentName = payment.residentId?.name || payment.name || 'Resident';
  const residentEmail = payment.residentId?.email || 'N/A';
  const residentMobile = payment.residentId?.mobile || 'N/A';
  
  // Format room label
  const roomLabel = payment.room || (payment.residentId?.roomId ? `Room ${payment.residentId.roomId}` : 'General');
  
  const paymentDate = payment.paidAt ? new Date(payment.paidAt).toLocaleString('en-IN') : new Date(payment.updatedAt).toLocaleString('en-IN');
  const receiptNum = payment.referenceNumber || `REC-${payment._id.toString().slice(-8).toUpperCase()}`;

  const remainingBalance = Math.max(0, payment.amount - (payment.receivedAmount || payment.amount));

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: '650px', padding: '24px' }}>
        <button type="button" className="modal-x" onClick={onClose}><X size={18} /></button>
        
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <button className="primary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--green)' }}>
            <Printer size={16} /> Print Receipt
          </button>
          <button className="secondary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={16} /> Download PDF
          </button>
        </div>

        {/* Outer container used for print reference */}
        <div ref={receiptRef}>
          <div style={{ padding: '24px', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--green)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: '800', color: 'var(--green)', fontFamily: 'Manrope, sans-serif' }}>
                <span style={{ display: 'grid', placeItems: 'center', width: '28px', height: '28px', background: 'var(--green)', color: '#fff', borderRadius: '8px' }}><Building2 size={16} /></span>
                <span>{pgName}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Receipt</h2>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Transaction Reference Ledger</p>
              </div>
            </div>

            {/* Metadata Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', fontSize: '13px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>Issued To</h4>
                <p style={{ margin: 0, fontWeight: '700' }}>{residentName}</p>
                <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)' }}>{residentEmail} · {residentMobile}</p>
                <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)' }}>{roomLabel}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>Receipt Details</h4>
                <p style={{ margin: 0 }}><b>Receipt No:</b> {receiptNum}</p>
                <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)' }}><b>Date:</b> {paymentDate}</p>
                <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)' }}><b>Payment Method:</b> <span style={{ textTransform: 'uppercase', fontWeight: '600' }}>{payment.method || 'cash'}</span></p>
              </div>
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', background: 'var(--app-bg)' }}>Description</th>
                  <th style={{ textAlign: 'center', padding: '8px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', background: 'var(--app-bg)' }}>Period</th>
                  <th style={{ textAlign: 'right', padding: '8px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', background: 'var(--app-bg)' }}>Due Amount</th>
                  <th style={{ textAlign: 'right', padding: '8px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', background: 'var(--app-bg)' }}>Paid</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '12px 8px', fontSize: '13px', borderBottom: '1px solid var(--border)' }}>
                    <b style={{ textTransform: 'capitalize' }}>{payment.purpose || 'rent'} billing</b>
                    {payment.notes && <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Notes: {payment.notes}</p>}
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px 8px', fontSize: '13px', borderBottom: '1px solid var(--border)' }}>{payment.invoiceMonth}</td>
                  <td style={{ textAlign: 'right', padding: '12px 8px', fontSize: '13px', borderBottom: '1px solid var(--border)' }}>{money(payment.amount)}</td>
                  <td style={{ textAlign: 'right', padding: '12px 8px', fontSize: '13px', borderBottom: '1px solid var(--border)', fontWeight: '700', color: 'var(--green)' }}>{money(payment.receivedAmount || payment.amount)}</td>
                </tr>
              </tbody>
            </table>

            {/* Calculations summary */}
            <div style={{ marginLeft: 'auto', width: '260px', fontSize: '13px', display: 'grid', gap: '8px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Invoice Due:</span>
                <span>{money(payment.amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Cash Received:</span>
                <span style={{ fontWeight: '700' }}>{money(payment.receivedAmount || payment.amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '8px', fontSize: '15px', fontWeight: '800', color: 'var(--green)' }} className="amount-row total">
                <span>Remaining Balance:</span>
                <span>{money(remainingBalance)}</span>
              </div>
            </div>

            {/* Signature & Seal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '12px', color: 'var(--text-muted)', marginTop: '40px' }}>
              <div>
                <p style={{ margin: 0 }}>✓ Verified StayZen Ledger Entry</p>
                <p style={{ margin: '2px 0 0 0', fontSize: '10px' }}>Recorded via Owner Cash Reconciliation Module</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '160px', borderTop: '1px dashed var(--text-muted)', paddingTop: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Manager Signature / Seal
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
