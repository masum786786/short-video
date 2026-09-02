import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, Sparkles } from 'lucide-react';

interface PaytmQRCardProps {
  upiId?: string;
  payeeName?: string;
  amount?: number;
  className?: string;
}

export const PaytmQRCard: React.FC<PaytmQRCardProps> = ({
  upiId = 'masum345@ptyes',
  payeeName = 'Masum',
  amount = 49,
  className = '',
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent('Short Video Access')}`;
    QRCode.toDataURL(upiString, {
      width: 400,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error generating QR', err));
  }, [upiId, payeeName, amount]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* Outer Paytm Frame Container */}
      <div className="relative w-full max-w-[280px] sm:max-w-[300px] overflow-hidden rounded-[26px] border-[5px] border-[#00b9f5] bg-white p-3.5 shadow-2xl shadow-cyan-950/40 text-center">
        {/* Top Paytm Logo */}
        <div className="flex items-center justify-center space-x-1.5 pt-1 pb-2">
          <span className="text-xl font-black text-[#002e6e] tracking-tight">paytm</span>
          <span className="text-red-500 text-sm">❤️</span>
          <span className="text-xl font-black text-[#00b9f5] tracking-tight flex items-center">
            UPI
            <span className="ml-1 inline-block h-2.5 w-2 bg-gradient-to-b from-orange-500 via-white to-green-600 rounded-[1px] border border-slate-300" />
          </span>
        </div>

        {/* QR Code Canvas Frame */}
        <div className="relative mx-auto my-1 flex items-center justify-center rounded-xl bg-white p-2">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`Paytm UPI QR for ${upiId}`}
              className="h-44 w-44 sm:h-48 sm:w-48 object-contain mx-auto transition-transform hover:scale-[1.02]"
            />
          ) : (
            <div className="h-44 w-44 sm:h-48 sm:w-48 bg-slate-100 flex items-center justify-center text-xs text-slate-400 animate-pulse rounded-lg">
              Generating Paytm QR...
            </div>
          )}
        </div>

        {/* Bottom UPI Handle */}
        <div
          onClick={handleCopy}
          className="mx-auto mt-2 inline-flex items-center justify-center space-x-1.5 rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-slate-800 text-xs font-bold hover:bg-slate-100 active:scale-95 transition-all cursor-pointer shadow-sm"
          title="Click to copy UPI ID"
        >
          {/* Triangular Tricolor Icon */}
          <span className="inline-block h-3 w-3 bg-gradient-to-tr from-green-600 via-amber-400 to-orange-500 rounded-sm rotate-45 shrink-0" />
          <span className="font-mono text-[11px] sm:text-xs text-slate-900 tracking-tight">
            {upiId}
          </span>
          {copied ? (
            <Check className="h-3 w-3 text-emerald-600 ml-1" />
          ) : (
            <Copy className="h-3 w-3 text-slate-400 hover:text-slate-700 ml-1" />
          )}
        </div>
      </div>

      {/* Footer Instructions */}
      <div className="mt-3 flex items-center justify-center space-x-2 text-[11px] text-slate-300 font-medium">
        <span>Scan with any UPI app:</span>
        <div className="flex items-center space-x-1 font-bold">
          <span className="text-[#00b9f5]">Paytm</span>
          <span className="text-slate-500">•</span>
          <span className="text-[#5f259f]">PhonePe</span>
          <span className="text-slate-500">•</span>
          <span className="text-[#4285F4]">GPay</span>
          <span className="text-slate-500">•</span>
          <span className="text-amber-400">BHIM</span>
        </div>
      </div>
    </div>
  );
};
