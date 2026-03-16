import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  tr: {
    translation: {
      nav: {
        dashboard: 'Ana Sayfa',
        ads: 'Reklamlar',
        campaigns: 'Kampanyalar',
        withdraw: 'Para Çek',
        referrals: 'Davet Et',
        settings: 'Ayarlar',
        admin: 'Admin Paneli',
        logout: 'Çıkış Yap'
      },
      dashboard: {
        welcome: 'Merhaba, {{name}}! 👋',
        ready: 'Bugün kazanmaya hazır mısın?',
        available_credits: 'Kullanılabilir Kredi',
        total_earned: 'Toplam Kazanılan',
        all_time: 'Tüm zamanlar',
        level: 'Seviye: {{name}}',
        multiplier: '{{val}}x Çarpan',
        clicks: '{{val}} tık',
        next_level: 'Sonraki: {{name}} ({{val}})',
        max_level: 'Maksimum Seviye!',
        daily_quota: 'Günlük Kota',
        earnings_chart: 'Kazanç Grafiği',
        last_7_days: 'Son 7 günlük kredi kazancınız',
        watch_ads: 'Reklam İzle & Kazan',
        watch_ads_desc: 'Hemen tıkla, kredileri topla',
        create_ad: 'Reklam Ver',
        create_ad_desc: 'Kendi siteni binlerce kişiye ulaştır'
      },
      common: {
        loading: 'Yükleniyor...'
      }
    }
  },
  en: {
    translation: {
      nav: {
        dashboard: 'Dashboard',
        ads: 'Ads',
        campaigns: 'Campaigns',
        withdraw: 'Withdraw',
        referrals: 'Referrals',
        settings: 'Settings',
        admin: 'Admin Panel',
        logout: 'Logout'
      },
      dashboard: {
        welcome: 'Hello, {{name}}! 👋',
        ready: 'Ready to earn today?',
        available_credits: 'Available Credits',
        total_earned: 'Total Earned',
        all_time: 'All time',
        level: 'Level: {{name}}',
        multiplier: '{{val}}x Multiplier',
        clicks: '{{val}} clicks',
        next_level: 'Next: {{name}} ({{val}})',
        max_level: 'Max Level!',
        daily_quota: 'Daily Quota',
        earnings_chart: 'Earnings Chart',
        last_7_days: 'Your credit earnings for the last 7 days',
        watch_ads: 'Watch Ads & Earn',
        watch_ads_desc: 'Click now, collect credits',
        create_ad: 'Create Ad',
        create_ad_desc: 'Reach thousands of people with your site'
      },
      common: {
        loading: 'Loading...'
      }
    }
  },
  ar: {
    translation: {
      nav: {
        dashboard: 'لوحة القيادة',
        ads: 'الإعلانات',
        campaigns: 'الحملات',
        withdraw: 'سحب',
        referrals: 'الإحالات',
        settings: 'الإعدادات',
        admin: 'لوحة الإدارة',
        logout: 'تسجيل خروج'
      },
      dashboard: {
        welcome: 'مرحباً، {{name}}! 👋',
        ready: 'هل أنت مستعد للكسب اليوم؟',
        available_credits: 'الرصيد المتاح',
        total_earned: 'إجمالي الأرباح',
        all_time: 'كل الوقت',
        level: 'المستوى: {{name}}',
        multiplier: '{{val}}x مضاعف',
        clicks: '{{val}} نقرات',
        next_level: 'التالي: {{name}} ({{val}})',
        max_level: 'أقصى مستوى!',
        daily_quota: 'الحصة اليومية',
        earnings_chart: 'مخطط الأرباح',
        last_7_days: 'أرباحك الائتمانية لآخر 7 أيام',
        watch_ads: 'شاهد الإعلانات واكسب',
        watch_ads_desc: 'انقر الآن، واجمع الأرصدة',
        create_ad: 'إنشاء إعلان',
        create_ad_desc: 'الوصول إلى آلاف الأشخاص بموقعك'
      },
      common: {
        loading: 'جار التحميل...'
      }
    }
  },
  ru: {
    translation: {
      nav: {
        dashboard: 'Панель',
        ads: 'Реклама',
        campaigns: 'Кампании',
        withdraw: 'Вывод',
        referrals: 'Рефералы',
        settings: 'Настройки',
        admin: 'Админ-панель',
        logout: 'Выйти'
      },
      dashboard: {
        welcome: 'Привет, {{name}}! 👋',
        ready: 'Готовы зарабатывать сегодня?',
        available_credits: 'Доступные кредиты',
        total_earned: 'Всего заработано',
        all_time: 'За все время',
        level: 'Уровень: {{name}}',
        multiplier: '{{val}}x Множитель',
        clicks: '{{val}} кликов',
        next_level: 'След: {{name}} ({{val}})',
        max_level: 'Макс. уровень!',
        daily_quota: 'Дневная квота',
        earnings_chart: 'График доходов',
        last_7_days: 'Ваш заработок кредитов за последние 7 дней',
        watch_ads: 'Смотреть рекламу и зарабатывать',
        watch_ads_desc: 'Кликайте сейчас, собирайте кредиты',
        create_ad: 'Создать рекламу',
        create_ad_desc: 'Охватите тысячи людей своим сайтом'
      },
      common: {
        loading: 'Загрузка...'
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'tr',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
