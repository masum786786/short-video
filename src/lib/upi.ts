export interface UPILinkParams {
  upiId: string;
  upiName: string;
  amount: number;
  transactionNote?: string;
}

export function generateUPIDeepLinks(params: UPILinkParams) {
  const upiId = params.upiId || 'masum345@ptyes';
  const upiName = encodeURIComponent(params.upiName || 'Masum');
  const amount = params.amount || 49;
  const note = encodeURIComponent(params.transactionNote || 'Short Video Access');

  // Generic UPI Intent URL
  const upiString = `upi://pay?pa=${upiId}&pn=${upiName}&am=${amount}&cu=INR&tn=${note}`;

  // Direct app custom URI schemes
  const phonePeIOS = `phonepe://pay?pa=${upiId}&pn=${upiName}&am=${amount}&cu=INR&tn=${note}`;
  const phonePeAndroid = `intent://pay?pa=${upiId}&pn=${upiName}&am=${amount}&cu=INR&tn=${note}#Intent;scheme=upi;package=com.phonepe.app;end`;

  const gPayIOS = `tez://upi/pay?pa=${upiId}&pn=${upiName}&am=${amount}&cu=INR&tn=${note}`;
  const gPayAndroid = `intent://pay?pa=${upiId}&pn=${upiName}&am=${amount}&cu=INR&tn=${note}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;

  const paytmIOS = `paytmmp://pay?pa=${upiId}&pn=${upiName}&am=${amount}&cu=INR&tn=${note}`;
  const paytmAndroid = `intent://pay?pa=${upiId}&pn=${upiName}&am=${amount}&cu=INR&tn=${note}#Intent;scheme=upi;package=net.one97.paytm;end`;

  const bhimIOS = `bhim://pay?pa=${upiId}&pn=${upiName}&am=${amount}&cu=INR&tn=${note}`;
  const bhimAndroid = `intent://pay?pa=${upiId}&pn=${upiName}&am=${amount}&cu=INR&tn=${note}#Intent;scheme=upi;package=in.org.npci.upiapp;end`;

  return {
    upiString,
    phonePeIOS,
    phonePeAndroid,
    gPayIOS,
    gPayAndroid,
    paytmIOS,
    paytmAndroid,
    bhimIOS,
    bhimAndroid,
  };
}

export function openUPIApp(app: 'phonepe' | 'gpay' | 'paytm' | 'bhim' | 'any', params: UPILinkParams) {
  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
  const isIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  const links = generateUPIDeepLinks(params);
  let targetUrl = '';

  switch (app) {
    case 'phonepe':
      targetUrl = isAndroid ? links.phonePeAndroid : links.phonePeIOS;
      break;
    case 'gpay':
      targetUrl = isAndroid ? links.gPayAndroid : links.gPayIOS;
      break;
    case 'paytm':
      targetUrl = isAndroid ? links.paytmAndroid : links.paytmIOS;
      break;
    case 'bhim':
      targetUrl = isAndroid ? links.bhimAndroid : links.bhimIOS;
      break;
    case 'any':
    default:
      if (isAndroid) {
        targetUrl = links.upiString;
      } else if (isIOS) {
        // On iOS, generic 'upi://' is captured by WhatsApp. Default 'Any' to PhonePe directly to avoid WhatsApp popup
        targetUrl = links.phonePeIOS;
      } else {
        targetUrl = links.upiString;
      }
      break;
  }

  // Fallback trigger using window.location or hidden iframe
  try {
    window.location.href = targetUrl;
  } catch (err) {
    console.error('Failed to open UPI deep link:', err);
    window.open(targetUrl, '_blank');
  }
}
