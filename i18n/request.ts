import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import en from "../messages/en.json";
import es from "../messages/es.json";
import fr from "../messages/fr.json";
import ja from "../messages/ja.json";
import ko from "../messages/ko.json";
import zhHans from "../messages/zh-Hans.json";
import zhHant from "../messages/zh-Hant.json";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  parseAppLocale,
  type AppLocale,
} from "@/lib/i18n/locales";

const catalogs: Record<AppLocale, typeof en> = {
  en,
  es,
  fr,
  ja,
  ko,
  "zh-Hans": zhHans,
  "zh-Hant": zhHant,
};

export default getRequestConfig(async () => {
  const jar = await cookies();
  const locale = parseAppLocale(jar.get(LOCALE_COOKIE)?.value);

  return {
    locale,
    messages: catalogs[locale] ?? catalogs[DEFAULT_LOCALE],
  };
});
