'use client';

import { useEffect, useState } from 'react';
import {
  disablePushNotifications,
  enablePushNotifications,
  getExistingSubscription,
  getNotificationPermission,
  isPushSupported,
} from '@/lib/pushClient';

export default function PushNotificationToggle() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  async function refreshStatus() {
    setLoading(true);

    try {
      const canPush = isPushSupported();
      setSupported(canPush);

      if (!canPush) {
        setPermission('unsupported');
        setEnabled(false);
        return;
      }

      setPermission(getNotificationPermission());

      const existing = await getExistingSubscription();
      setEnabled(Boolean(existing));
    } catch (error) {
      setMessage(error.message || '讀取推播狀態失敗');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshStatus();
  }, []);

  async function handleEnable() {
    setLoading(true);
    setMessage('');

    try {
      const result = await enablePushNotifications();

      if (!result.ok) {
        setMessage(result.message || '無法開啟推播通知');
      } else {
        setMessage('推播通知已開啟');
      }

      await refreshStatus();
    } catch (error) {
      setMessage(error.message || '開啟推播通知失敗');
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    setLoading(true);
    setMessage('');

    try {
      await disablePushNotifications();
      setMessage('推播通知已關閉');
      await refreshStatus();
    } catch (error) {
      setMessage(error.message || '關閉推播通知失敗');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-gray-500">正在讀取通知狀態...</div>;
  }

  if (!supported) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        此瀏覽器不支援 Web Push 通知。
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-lg text-sm text-red-600 dark:text-red-400">
        <p>你已封鎖瀏覽器通知。</p>
        <p>若要重新開啟，請到瀏覽器的網站設定中允許通知。</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">即時推播通知</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        開啟後，你可以即時收到預約、付款、課程提醒與平台通知。
      </p>

      {enabled ? (
        <button 
          type="button" 
          onClick={handleDisable} 
          disabled={loading}
          className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded transition-colors text-sm font-medium"
        >
          關閉此裝置通知
        </button>
      ) : (
        <button 
          type="button" 
          onClick={handleEnable} 
          disabled={loading}
          className="px-4 py-2 bg-[var(--primary)] text-white hover:opacity-90 rounded transition-opacity text-sm font-medium"
        >
          開啟推播通知
        </button>
      )}

      {message ? <p className="mt-3 text-sm text-[var(--primary)]">{message}</p> : null}
    </div>
  );
}
