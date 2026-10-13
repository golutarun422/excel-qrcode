import React, { useEffect, useState } from 'react';
import { QrCode, Smartphone, Sparkles, Loader2 } from 'lucide-react';
import { generateQRCodeDataUrl } from '../services/qrCodeService';

interface QRCodePreviewProps {
  accessUrl: string;
  filename: string;
}

export const QRCodePreview: React.FC<QRCodePreviewProps> = ({
  accessUrl,
}) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    generateQRCodeDataUrl(accessUrl, {
      size: 600,
      errorCorrectionLevel: 'H',
      margin: 3,
      darkColor: '#090d16',
      lightColor: '#ffffff',
    })
      .then((url) => {
        if (isMounted) {
          setDataUrl(url);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('QR preview generation failed:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [accessUrl]);

  return (
    <div className="flex flex-col items-center">
      {/* QR Code Container with sleek physical card aesthetic */}
      <div className="relative group p-6 rounded-3xl bg-white shadow-2xl shadow-emerald-500/10 border border-slate-200/50 transition-all duration-300 hover:shadow-emerald-500/20">
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center bg-white rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <span className="text-xs font-semibold">Generating QR Code...</span>
            </div>
          ) : dataUrl ? (
            <img
              src={dataUrl}
              alt="Generated Excel Access QR Code"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-400 text-xs">
              <QrCode className="w-10 h-10" />
              <span>Failed to render QR Code</span>
            </div>
          )}
        </div>

        {/* Scan instruction badge */}
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 shadow-lg whitespace-nowrap">
          <Smartphone className="w-3.5 h-3.5" />
          <span>Scan with any camera</span>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
        <span>Level H error correction (Scan from damaged/distorted angles)</span>
      </div>
    </div>
  );
};
