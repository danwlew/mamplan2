// CookieBanner.tsx
import React, { useState } from 'react';

interface CookieBannerProps {
  language: 'pl' | 'en';
}

export default function CookieBanner({ language }: CookieBannerProps) {
  const [visible, setVisible] = useState<boolean>(true);

  if (!visible) return null;

  const isPolish = language === 'pl';

  return (
    <div className="fixed bottom-0 left-0 w-full bg-gray-800 text-white p-4 text-sm flex flex-col sm:flex-row justify-between items-center z-50">
      <div>
        {isPolish
          ? 'Ta strona nie przechowuje plików cookies.'
          : 'This site does not store cookies.'}
      </div>

      <div className="mt-2 sm:mt-0 flex gap-2">
        <button
          onClick={() => setVisible(false)}
          className="px-3 py-1 bg-green-600 text-white rounded"
        >
          {isPolish ? 'Akceptuję' : 'Accept'}
        </button>
        <button
          onClick={() => setVisible(false)}
          className="px-3 py-1 bg-gray-500 text-white rounded"
        >
          {isPolish ? 'Odrzuć' : 'Reject'}
        </button>
      </div>
    </div>
  );
}
