import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  parseAppLocale,
  type AppLocale,
} from "@/lib/i18n/locales";

async function loadMessages(locale: AppLocale) {
  try {
    return (await import(`../messages/${locale}.json`)).default;
  } catch {
    return (await import(`../messages/${DEFAULT_LOCALE}.json`)).default;
  }
}

export default getRequestConfig(async () => {
  const jar = await cookies();
  const locale = parseAppLocale(jar.get(LOCALE_COOKIE)?.value);

  return {
    locale,
    messages: await loadMessages(locale),
  };
});
