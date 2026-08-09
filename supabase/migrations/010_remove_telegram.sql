-- Remove unused Telegram feed site setting
delete from public.site_settings where key = 'show_telegram';
