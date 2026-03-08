import { useState, useEffect } from 'react';
import { useAuthStore } from '../store';
import { Bell, CheckCircle2, AlertCircle, Info, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
  is_read: number;
  created_at: string;
}

export function Notifications() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/users/${user?.id}/notifications`);
      if (!res.ok) {
        throw new Error('Failed to fetch notifications');
      }
      const data = await res.json();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, is_read: 1 } : n
      ));
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`/api/users/${user?.id}/notifications/read-all`, { method: 'PUT' });
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Bildirimler</h1>
          <p className="text-zinc-500 mt-1">Hesabınızla ilgili güncellemeler ve uyarılar</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors"
          >
            <Check className="w-4 h-4" />
            Tümünü Okundu İşaretle
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-medium text-zinc-900">Henüz bildirim yok</h3>
            <p className="text-zinc-500 mt-1">Yeni bir bildirim aldığınızda burada görünecektir.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {notifications.map((notification) => (
              <div 
                key={notification.id}
                className={clsx(
                  "p-4 flex gap-4 transition-colors",
                  !notification.is_read ? "bg-emerald-50/50" : "hover:bg-zinc-50"
                )}
                onClick={() => !notification.is_read && markAsRead(notification.id)}
              >
                <div className="flex-shrink-0 mt-1">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={clsx(
                      "text-sm font-medium",
                      !notification.is_read ? "text-zinc-900" : "text-zinc-700"
                    )}>
                      {notification.title}
                    </p>
                    <span className="text-xs text-zinc-500 whitespace-nowrap">
                      {new Date(notification.created_at).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 mt-1">
                    {notification.message}
                  </p>
                </div>
                {!notification.is_read && (
                  <div className="flex-shrink-0 flex items-center">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
